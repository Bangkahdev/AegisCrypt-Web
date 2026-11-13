using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Text;

namespace AegisCrypt.Core;

public sealed class EncryptOptions
{
    public int Iterations { get; init; } = AegisConstants.IterationsDefault;
    public int ChunkSize { get; init; } = AegisConstants.ChunkSizeDefault;
    public string? Filename { get; init; }
    public byte[]? RecoveryKey { get; init; }
    public Func<int, byte[]>? RandomBytes { get; init; }
    /// <summary>Reports the number of plaintext bytes consumed so far.</summary>
    public Action<long>? Progress { get; init; }
}

public sealed record DecryptResult(string? Filename, bool LegacyV2);

public static class AegisCrypto
{
    private static readonly UTF8Encoding StrictUtf8 = new(false, true);

    public static byte[] GenerateRecoveryKey()
    {
        var key = new byte[AegisConstants.RecoveryKeyLength];
        RandomNumberGenerator.Fill(key);
        return key;
    }

    public static void Encrypt(
        Stream input,
        Stream output,
        string password,
        byte[]? keyFile = null,
        EncryptOptions? options = null)
    {
        var opts = options ?? new EncryptOptions();
        AegisValidation.AssertIterations(opts.Iterations);
        AegisValidation.AssertChunkSize(opts.ChunkSize);

        var randomBytes = opts.RandomBytes ?? RandomBytesDefault;
        var salt = randomBytes(AegisConstants.SaltLength);
        var dek = randomBytes(AegisConstants.DekLength);
        var fileId = randomBytes(AegisConstants.FileIdLength);
        var noncePrefix = randomBytes(AegisConstants.NoncePrefixLength);
        var wrapNonce = randomBytes(AegisConstants.IvLength);

        byte flags = 0;
        if (keyFile is not null)
        {
            flags |= AegisConstants.FlagKeyFile;
        }

        if (opts.Filename is not null)
        {
            flags |= AegisConstants.FlagFilename;
            AssertFilename(opts.Filename);
        }

        if (opts.RecoveryKey is not null)
        {
            flags |= AegisConstants.FlagRecovery;
            AssertRecoveryKey(opts.RecoveryKey);
        }

        var keyMaterial = PrepareKeyMaterial(password, keyFile);
        var kek = DeriveKey(keyMaterial, salt, opts.Iterations);

        var header = AegisHeader.Build(
            flags,
            opts.Iterations,
            opts.ChunkSize,
            salt,
            fileId,
            noncePrefix,
            wrapNonce,
            new byte[AegisConstants.DekLength],
            new byte[AegisConstants.TagLength]);

        var wrapped = EncryptGcm(kek, wrapNonce, dek, header.AsSpan(0, AegisConstants.HeaderAadLength));
        wrapped.AsSpan(0, AegisConstants.DekLength).CopyTo(header.AsSpan(AegisConstants.WrappedDekOffset));
        wrapped.AsSpan(AegisConstants.DekLength).CopyTo(header.AsSpan(AegisConstants.WrapTagOffset));

        output.Write(header);

        if (opts.RecoveryKey is not null)
        {
            output.Write(SealRecoverySlot(dek, opts.RecoveryKey, fileId, randomBytes));
        }

        if (opts.Filename is not null)
        {
            output.Write(EncryptFilename(dek, fileId, noncePrefix, opts.Filename));
        }

        var buffer = new byte[opts.ChunkSize];
        var filled = ReadUpTo(input, buffer);
        var index = 0;

        while (true)
        {
            if (filled < opts.ChunkSize)
            {
                WriteRecord(output, dek, noncePrefix, opts.ChunkSize, fileId, index, buffer.AsSpan(0, filled), true);
                opts.Progress?.Invoke(input.Position);
                break;
            }

            var extra = input.ReadByte();
            if (extra < 0)
            {
                WriteRecord(output, dek, noncePrefix, opts.ChunkSize, fileId, index, buffer.AsSpan(0, filled), true);
                opts.Progress?.Invoke(input.Position);
                break;
            }

            WriteRecord(output, dek, noncePrefix, opts.ChunkSize, fileId, index, buffer.AsSpan(0, filled), false);
            opts.Progress?.Invoke(input.Position);
            index++;
            buffer[0] = (byte)extra;
            filled = 1 + ReadUpTo(input, buffer.AsSpan(1));
        }
    }

    public static DecryptResult Decrypt(
        Stream input,
        Stream output,
        string password,
        byte[]? keyFile = null,
        byte[]? recoveryKey = null,
        Action<long>? progress = null)
    {
        if (!input.CanSeek)
        {
            throw new ArgumentException("Input stream must be seekable.", nameof(input));
        }

        input.Position = 0;
        var prefix = new byte[6];
        var prefixRead = ReadUpTo(input, prefix);
        if (prefixRead < AegisConstants.FileMagic.Length ||
            !prefix[..AegisConstants.FileMagic.Length].SequenceEqual(AegisConstants.FileMagic))
        {
            throw new AegisFormatException(AegisErrors.Format);
        }

        if (prefixRead < 6)
        {
            throw new AegisFormatException(AegisErrors.Truncated);
        }

        var version = prefix[5];
        if (version == AegisConstants.LegacyVersion)
        {
            if (recoveryKey is not null)
            {
                throw new AegisFormatException(AegisErrors.RecoveryMissing);
            }

            DecryptLegacyV2(input, output, password, keyFile, progress);
            return new DecryptResult(null, true);
        }

        if (version != AegisConstants.FileVersion)
        {
            throw new AegisFormatException(AegisErrors.Version(version));
        }

        input.Position = 0;
        var headerBytes = new byte[AegisConstants.HeaderLength];
        ReadExactlyOrThrow(input, headerBytes, AegisErrors.Truncated);
        var header = AegisHeader.Parse(headerBytes);

        if (input.Length < header.MetadataOffset)
        {
            throw new AegisFormatException(AegisErrors.Truncated);
        }

        byte[] dek;
        if (recoveryKey is not null)
        {
            if ((header.Flags & AegisConstants.FlagRecovery) == 0)
            {
                throw new AegisFormatException(AegisErrors.RecoveryMissing);
            }

            dek = UnwrapRecoveryDek(input, header, recoveryKey);
        }
        else
        {
            var keyMaterial = PrepareKeyMaterial(password, keyFile);
            dek = UnwrapDek(header, headerBytes, keyMaterial);
        }

        var (filename, recordsOffset) = ResolveFilename(input, header, dek);

        input.Position = recordsOffset;
        var index = 0;
        var sawFinal = false;

        while (true)
        {
            var position = input.Position;
            if (position >= input.Length)
            {
                break;
            }

            if (input.Length - position < AegisConstants.RecordHeaderLength)
            {
                throw new AegisFormatException(AegisErrors.Truncated);
            }

            var recordHeader = new byte[AegisConstants.RecordHeaderLength];
            ReadExactlyOrThrow(input, recordHeader, AegisErrors.Truncated);

            int recordFlags = recordHeader[0];
            if ((recordFlags & ~AegisConstants.RecordFlagFinal) != 0)
            {
                throw new AegisFormatException(AegisErrors.Record);
            }

            var isFinal = (recordFlags & AegisConstants.RecordFlagFinal) != 0;
            var ciphertextLength = BinaryPrimitives.ReadUInt32BigEndian(recordHeader.AsSpan(1));
            var nonFinalLength = (uint)(header.ChunkSize + AegisConstants.TagLength);

            if (ciphertextLength < AegisConstants.TagLength || ciphertextLength > nonFinalLength)
            {
                throw new AegisFormatException(AegisErrors.Record);
            }

            if (!isFinal && ciphertextLength != nonFinalLength)
            {
                throw new AegisFormatException(AegisErrors.Record);
            }

            if ((long)(input.Length - position - AegisConstants.RecordHeaderLength) < ciphertextLength)
            {
                throw new AegisFormatException(AegisErrors.Truncated);
            }

            var sealedData = new byte[(int)ciphertextLength];
            ReadExactlyOrThrow(input, sealedData, AegisErrors.Truncated);

            var nonce = MakeNonce(header.NoncePrefix, (ulong)index);
            var aad = MakeRecordAad(header.ChunkSize, header.FileId, header.NoncePrefix, recordHeader, (ulong)index);
            var plaintext = DecryptGcm(dek, nonce, sealedData, aad, AegisErrors.Tampered);
            output.Write(plaintext);

            progress?.Invoke(input.Position);

            if (isFinal)
            {
                sawFinal = true;
                break;
            }

            index++;
        }

        if (!sawFinal)
        {
            throw new AegisFormatException(AegisErrors.MissingFinal);
        }

        if (input.Position != input.Length)
        {
            throw new AegisFormatException(AegisErrors.Trailing);
        }

        return new DecryptResult(filename, false);
    }

    public static void Rewrap(
        Stream input,
        Stream output,
        string oldPassword,
        byte[]? oldKeyFile,
        string newPassword,
        byte[]? newKeyFile,
        int? iterations = null,
        Func<int, byte[]>? randomBytes = null)
    {
        if (!input.CanSeek)
        {
            throw new ArgumentException("Input stream must be seekable.", nameof(input));
        }

        input.Position = 0;
        var prefix = new byte[6];
        var prefixRead = ReadUpTo(input, prefix);
        if (prefixRead < AegisConstants.FileMagic.Length ||
            !prefix[..AegisConstants.FileMagic.Length].SequenceEqual(AegisConstants.FileMagic))
        {
            throw new AegisFormatException(AegisErrors.Format);
        }

        if (prefixRead < 6)
        {
            throw new AegisFormatException(AegisErrors.Truncated);
        }

        if (prefix[5] != AegisConstants.FileVersion)
        {
            throw new AegisFormatException(AegisErrors.Version(prefix[5]));
        }

        input.Position = 0;
        var headerBytes = new byte[AegisConstants.HeaderLength];
        ReadExactlyOrThrow(input, headerBytes, AegisErrors.Truncated);
        var header = AegisHeader.Parse(headerBytes);

        if (input.Length < header.MetadataOffset)
        {
            throw new AegisFormatException(AegisErrors.Truncated);
        }

        var oldMaterial = PrepareKeyMaterial(oldPassword, oldKeyFile);
        var dek = UnwrapDek(header, headerBytes, oldMaterial);
        ResolveFilename(input, header, dek);

        var newIterations = iterations ?? header.Iterations;
        AegisValidation.AssertIterations(newIterations);

        var rng = randomBytes ?? RandomBytesDefault;
        var salt = rng(AegisConstants.SaltLength);
        var wrapNonce = rng(AegisConstants.IvLength);
        var flags = (byte)(
            (newKeyFile is not null ? AegisConstants.FlagKeyFile : 0) |
            (header.Flags & (AegisConstants.FlagRecovery | AegisConstants.FlagFilename)));

        var newHeader = AegisHeader.Build(
            flags,
            newIterations,
            header.ChunkSize,
            salt,
            header.FileId,
            header.NoncePrefix,
            wrapNonce,
            new byte[AegisConstants.DekLength],
            new byte[AegisConstants.TagLength]);

        var newKek = DeriveKey(PrepareKeyMaterial(newPassword, newKeyFile), salt, newIterations);
        var wrapped = EncryptGcm(
            newKek,
            wrapNonce,
            dek,
            newHeader.AsSpan(0, AegisConstants.HeaderAadLength));
        wrapped.AsSpan(0, AegisConstants.DekLength).CopyTo(newHeader.AsSpan(AegisConstants.WrappedDekOffset));
        wrapped.AsSpan(AegisConstants.DekLength).CopyTo(newHeader.AsSpan(AegisConstants.WrapTagOffset));

        output.Write(newHeader);

        input.Position = AegisConstants.HeaderLength;
        input.CopyTo(output);
    }

    private static void DecryptLegacyV2(
        Stream input,
        Stream output,
        string password,
        byte[]? keyFile,
        Action<long>? progress)
    {
        input.Position = 0;
        var header = new byte[AegisConstants.LegacyHeaderLength];
        ReadExactlyOrThrow(input, header, AegisErrors.Truncated);
        if (!header[..AegisConstants.FileMagic.Length].SequenceEqual(AegisConstants.FileMagic))
        {
            throw new AegisFormatException(AegisErrors.Format);
        }

        var salt = header.AsSpan(6, AegisConstants.SaltLength).ToArray();
        var key = DeriveKey(PrepareKeyMaterial(password, keyFile), salt, AegisConstants.LegacyIterations);

        var offset = (long)AegisConstants.LegacyHeaderLength;
        var lengthBytes = new byte[4];

        while (offset < input.Length)
        {
            if (input.Length - offset < 4)
            {
                throw new AegisFormatException(AegisErrors.LegacyCorrupt);
            }

            ReadExactlyOrThrow(input, lengthBytes, AegisErrors.LegacyCorrupt);
            var chunkLength = BinaryPrimitives.ReadInt32LittleEndian(lengthBytes);
            if (chunkLength < AegisConstants.IvLength + AegisConstants.TagLength)
            {
                throw new AegisFormatException(AegisErrors.LegacyCorrupt);
            }

            if (input.Length - offset - 4 < chunkLength)
            {
                throw new AegisFormatException(AegisErrors.LegacyCorrupt);
            }

            var payload = new byte[chunkLength];
            ReadExactlyOrThrow(input, payload, AegisErrors.LegacyCorrupt);
            var iv = payload.AsSpan(0, AegisConstants.IvLength).ToArray();
            var ciphertext = payload.AsSpan(AegisConstants.IvLength).ToArray();

            var plaintext = DecryptGcm(key, iv, ciphertext, ReadOnlySpan<byte>.Empty, AegisErrors.Credentials);
            output.Write(plaintext);

            offset += 4 + chunkLength;
            progress?.Invoke(offset);
        }
    }

    private static byte[] RandomBytesDefault(int length)
    {
        var bytes = new byte[length];
        RandomNumberGenerator.Fill(bytes);
        return bytes;
    }

    private static byte[] PrepareKeyMaterial(string password, byte[]? keyFile)
    {
        var passwordBytes = Encoding.UTF8.GetBytes(password);
        if (keyFile is null)
        {
            return passwordBytes;
        }

        var hash = SHA256.HashData(keyFile);
        var combined = new byte[passwordBytes.Length + hash.Length];
        passwordBytes.CopyTo(combined, 0);
        hash.CopyTo(combined, passwordBytes.Length);
        return combined;
    }

    private static byte[] DeriveKey(byte[] keyMaterial, byte[] salt, int iterations) =>
        Rfc2898DeriveBytes.Pbkdf2(
            keyMaterial,
            salt,
            iterations,
            HashAlgorithmName.SHA256,
            AegisConstants.KeyLength);

    private static void AssertRecoveryKey(byte[] recoveryKey)
    {
        if (recoveryKey.Length != AegisConstants.RecoveryKeyLength)
        {
            throw new AegisFormatException(AegisErrors.RecoveryKey);
        }
    }

    private static void AssertFilename(string filename)
    {
        var bytes = Encoding.UTF8.GetBytes(filename);
        if (bytes.Length == 0 || bytes.Length > AegisConstants.FilenameMaxLength)
        {
            throw new AegisFormatException(AegisErrors.FilenameMetadata);
        }
    }

    private static byte[] MakeNonce(byte[] prefix, ulong index)
    {
        var nonce = new byte[AegisConstants.IvLength];
        prefix.CopyTo(nonce, 0);
        BinaryPrimitives.WriteUInt64BigEndian(nonce.AsSpan(4), index);
        return nonce;
    }

    private static byte[] MakeFilenameAad(byte[] fileId, byte[] noncePrefix, int ciphertextLength)
    {
        var aad = new byte[AegisConstants.FilenameAadLength];
        AegisConstants.FileMagic.CopyTo(aad, 0);
        aad[5] = AegisConstants.FileVersion;
        fileId.CopyTo(aad, 6);
        noncePrefix.CopyTo(aad, 22);
        AegisConstants.FilenameAadDomain.CopyTo(aad, 26);
        BinaryPrimitives.WriteUInt16BigEndian(aad.AsSpan(34), (ushort)ciphertextLength);
        return aad;
    }

    private static byte[] MakeRecordAad(
        int chunkSize,
        byte[] fileId,
        byte[] noncePrefix,
        byte[] recordHeader,
        ulong index)
    {
        var aad = new byte[AegisConstants.RecordAadLength];
        AegisConstants.FileMagic.CopyTo(aad, 0);
        aad[5] = AegisConstants.FileVersion;
        BinaryPrimitives.WriteUInt32BigEndian(aad.AsSpan(6), (uint)chunkSize);
        fileId.CopyTo(aad, 10);
        noncePrefix.CopyTo(aad, 26);
        recordHeader.CopyTo(aad, 30);
        BinaryPrimitives.WriteUInt64BigEndian(aad.AsSpan(35), index);
        return aad;
    }

    private static byte[] MakeRecoveryAad(byte[] fileId)
    {
        var aad = new byte[AegisConstants.RecoveryAadLength];
        AegisConstants.FileMagic.CopyTo(aad, 0);
        aad[5] = AegisConstants.FileVersion;
        AegisConstants.RecoveryHkdfDomain.CopyTo(aad, 6);
        fileId.CopyTo(aad, 6 + AegisConstants.RecoveryHkdfDomain.Length);
        return aad;
    }

    private static byte[] DeriveRecoveryKey(byte[] recoveryKey, byte[] fileId)
    {
        var info = new byte[AegisConstants.RecoveryHkdfDomain.Length + fileId.Length];
        AegisConstants.RecoveryHkdfDomain.CopyTo(info, 0);
        fileId.CopyTo(info, AegisConstants.RecoveryHkdfDomain.Length);

        var key = new byte[AegisConstants.KeyLength];
        HKDF.DeriveKey(HashAlgorithmName.SHA256, recoveryKey, key, ReadOnlySpan<byte>.Empty, info);
        return key;
    }

    private static byte[] EncryptGcm(
        byte[] key,
        byte[] nonce,
        ReadOnlySpan<byte> plaintext,
        ReadOnlySpan<byte> aad)
    {
        var sealedData = new byte[plaintext.Length + AegisConstants.TagLength];
        using var gcm = new AesGcm(key, AegisConstants.TagLength);
        gcm.Encrypt(
            nonce,
            plaintext,
            sealedData.AsSpan(0, plaintext.Length),
            sealedData.AsSpan(plaintext.Length, AegisConstants.TagLength),
            aad);
        return sealedData;
    }

    private static byte[] DecryptGcm(
        byte[] key,
        byte[] nonce,
        ReadOnlySpan<byte> sealedData,
        ReadOnlySpan<byte> aad,
        string failureMessage)
    {
        if (sealedData.Length < AegisConstants.TagLength)
        {
            throw new AegisFormatException(failureMessage);
        }

        var plaintext = new byte[sealedData.Length - AegisConstants.TagLength];
        var ciphertext = sealedData[..^AegisConstants.TagLength];
        var tag = sealedData[^AegisConstants.TagLength..];

        using var gcm = new AesGcm(key, AegisConstants.TagLength);
        try
        {
            gcm.Decrypt(nonce, ciphertext, tag, plaintext, aad);
        }
        catch (CryptographicException)
        {
            throw new AegisFormatException(failureMessage);
        }

        return plaintext;
    }

    private static byte[] UnwrapDek(AegisHeader header, byte[] headerBytes, byte[] keyMaterial)
    {
        var kek = DeriveKey(keyMaterial, header.Salt, header.Iterations);
        var sealedData = new byte[AegisConstants.DekLength + AegisConstants.TagLength];
        header.WrappedDek.CopyTo(sealedData, 0);
        header.WrapTag.CopyTo(sealedData, AegisConstants.DekLength);

        return DecryptGcm(
            kek,
            header.WrapNonce,
            sealedData,
            headerBytes.AsSpan(0, AegisConstants.HeaderAadLength),
            AegisErrors.Credentials);
    }

    private static byte[] SealRecoverySlot(
        byte[] dek,
        byte[] recoveryKey,
        byte[] fileId,
        Func<int, byte[]> randomBytes)
    {
        AssertRecoveryKey(recoveryKey);
        var nonce = randomBytes(AegisConstants.IvLength);
        var kek = DeriveRecoveryKey(recoveryKey, fileId);
        var sealedData = EncryptGcm(kek, nonce, dek, MakeRecoveryAad(fileId));

        var slot = new byte[AegisConstants.RecoverySlotLength];
        nonce.CopyTo(slot, AegisConstants.RecoveryNonceOffset);
        sealedData.AsSpan(0, AegisConstants.DekLength).CopyTo(slot.AsSpan(AegisConstants.RecoveryWrappedDekOffset));
        sealedData.AsSpan(AegisConstants.DekLength).CopyTo(slot.AsSpan(AegisConstants.RecoveryTagOffset));
        return slot;
    }

    private static byte[] UnwrapRecoveryDek(Stream input, AegisHeader header, byte[] recoveryKey)
    {
        AssertRecoveryKey(recoveryKey);

        if (input.Length < AegisConstants.RecoverySlotOffset + AegisConstants.RecoverySlotLength)
        {
            throw new AegisFormatException(AegisErrors.RecoveryMissing);
        }

        input.Position = AegisConstants.RecoverySlotOffset;
        var slot = new byte[AegisConstants.RecoverySlotLength];
        ReadExactlyOrThrow(input, slot, AegisErrors.RecoveryMissing);

        var nonce = slot.AsSpan(AegisConstants.RecoveryNonceOffset, AegisConstants.IvLength).ToArray();
        var sealedData = new byte[AegisConstants.DekLength + AegisConstants.TagLength];
        slot.AsSpan(AegisConstants.RecoveryWrappedDekOffset, AegisConstants.DekLength)
            .CopyTo(sealedData);
        slot.AsSpan(AegisConstants.RecoveryTagOffset, AegisConstants.TagLength)
            .CopyTo(sealedData.AsSpan(AegisConstants.DekLength));

        var kek = DeriveRecoveryKey(recoveryKey, header.FileId);
        return DecryptGcm(kek, nonce, sealedData, MakeRecoveryAad(header.FileId), AegisErrors.RecoveryKey);
    }

    private static byte[] EncryptFilename(
        byte[] dek,
        byte[] fileId,
        byte[] noncePrefix,
        string filename)
    {
        var plaintext = Encoding.UTF8.GetBytes(filename);
        if (plaintext.Length == 0 || plaintext.Length > AegisConstants.FilenameMaxLength)
        {
            throw new AegisFormatException(AegisErrors.FilenameMetadata);
        }

        var ciphertextLength = plaintext.Length + AegisConstants.TagLength;
        var sealedData = EncryptGcm(
            dek,
            MakeNonce(noncePrefix, AegisConstants.FilenameMetadataIndex),
            plaintext,
            MakeFilenameAad(fileId, noncePrefix, ciphertextLength));

        var block = new byte[AegisConstants.FilenameLengthBytes + ciphertextLength];
        BinaryPrimitives.WriteUInt16BigEndian(block, (ushort)ciphertextLength);
        sealedData.CopyTo(block, AegisConstants.FilenameLengthBytes);
        return block;
    }

    private static (string? Filename, long RecordsOffset) ResolveFilename(
        Stream input,
        AegisHeader header,
        byte[] dek)
    {
        var metadataOffset = (long)header.MetadataOffset;
        if (input.Length < metadataOffset)
        {
            throw new AegisFormatException(AegisErrors.Truncated);
        }

        input.Position = metadataOffset;
        if ((header.Flags & AegisConstants.FlagFilename) == 0)
        {
            return (null, metadataOffset);
        }

        if (input.Length - metadataOffset < AegisConstants.FilenameLengthBytes)
        {
            throw new AegisFormatException(AegisErrors.Truncated);
        }

        var lengthBytes = new byte[AegisConstants.FilenameLengthBytes];
        ReadExactlyOrThrow(input, lengthBytes, AegisErrors.Truncated);
        var ciphertextLength = BinaryPrimitives.ReadUInt16BigEndian(lengthBytes);

        if (ciphertextLength < AegisConstants.TagLength ||
            ciphertextLength > AegisConstants.FilenameMaxLength + AegisConstants.TagLength)
        {
            throw new AegisFormatException(AegisErrors.FilenameMetadata);
        }

        if (input.Length - metadataOffset - AegisConstants.FilenameLengthBytes < ciphertextLength)
        {
            throw new AegisFormatException(AegisErrors.Truncated);
        }

        var sealedData = new byte[ciphertextLength];
        ReadExactlyOrThrow(input, sealedData, AegisErrors.Truncated);

        var plaintext = DecryptGcm(
            dek,
            MakeNonce(header.NoncePrefix, AegisConstants.FilenameMetadataIndex),
            sealedData,
            MakeFilenameAad(header.FileId, header.NoncePrefix, ciphertextLength),
            AegisErrors.Tampered);

        string filename;
        try
        {
            filename = StrictUtf8.GetString(plaintext);
        }
        catch (DecoderFallbackException)
        {
            throw new AegisFormatException(AegisErrors.FilenameMetadata);
        }

        if (filename.Length == 0 || filename.Contains('\0') || filename.Contains('/') || filename.Contains('\\'))
        {
            throw new AegisFormatException(AegisErrors.FilenameMetadata);
        }

        return (filename, metadataOffset + AegisConstants.FilenameLengthBytes + ciphertextLength);
    }

    private static void WriteRecord(
        Stream output,
        byte[] dek,
        byte[] noncePrefix,
        int chunkSize,
        byte[] fileId,
        int index,
        ReadOnlySpan<byte> plaintext,
        bool isFinal)
    {
        var recordHeader = new byte[AegisConstants.RecordHeaderLength];
        recordHeader[0] = isFinal ? AegisConstants.RecordFlagFinal : (byte)0;
        BinaryPrimitives.WriteUInt32BigEndian(
            recordHeader.AsSpan(1),
            (uint)(plaintext.Length + AegisConstants.TagLength));

        var nonce = MakeNonce(noncePrefix, (ulong)index);
        var aad = MakeRecordAad(chunkSize, fileId, noncePrefix, recordHeader, (ulong)index);
        var sealedData = EncryptGcm(dek, nonce, plaintext, aad);

        output.Write(recordHeader);
        output.Write(sealedData);
    }

    private static int ReadUpTo(Stream input, Span<byte> buffer)
    {
        var total = 0;
        while (total < buffer.Length)
        {
            var read = input.Read(buffer[total..]);
            if (read == 0)
            {
                break;
            }

            total += read;
        }

        return total;
    }

    private static void ReadExactlyOrThrow(Stream input, Span<byte> buffer, string error)
    {
        try
        {
            input.ReadExactly(buffer);
        }
        catch (EndOfStreamException)
        {
            throw new AegisFormatException(error);
        }
    }
}
