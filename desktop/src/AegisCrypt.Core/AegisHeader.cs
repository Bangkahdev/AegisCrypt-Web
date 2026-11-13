using System.Buffers.Binary;

namespace AegisCrypt.Core;

internal sealed class AegisHeader
{
    public required byte Flags { get; init; }
    public required int Iterations { get; init; }
    public required int ChunkSize { get; init; }
    public required byte[] Salt { get; init; }
    public required byte[] FileId { get; init; }
    public required byte[] NoncePrefix { get; init; }
    public required byte[] WrapNonce { get; init; }
    public required byte[] WrappedDek { get; init; }
    public required byte[] WrapTag { get; init; }

    public int MetadataOffset =>
        AegisConstants.HeaderLength +
        ((Flags & AegisConstants.FlagRecovery) != 0 ? AegisConstants.RecoverySlotLength : 0);

    public static byte[] Build(
        byte flags,
        int iterations,
        int chunkSize,
        byte[] salt,
        byte[] fileId,
        byte[] noncePrefix,
        byte[] wrapNonce,
        byte[] wrappedDek,
        byte[] wrapTag)
    {
        var header = new byte[AegisConstants.HeaderLength];
        AegisConstants.FileMagic.CopyTo(header, 0);
        header[5] = AegisConstants.FileVersion;
        header[6] = AegisConstants.KdfPbkdf2Sha256;
        header[7] = flags;
        BinaryPrimitives.WriteUInt32BigEndian(header.AsSpan(8), (uint)iterations);
        BinaryPrimitives.WriteUInt32BigEndian(header.AsSpan(12), (uint)chunkSize);
        salt.CopyTo(header, AegisConstants.SaltOffset);
        fileId.CopyTo(header, AegisConstants.FileIdOffset);
        noncePrefix.CopyTo(header, AegisConstants.NoncePrefixOffset);
        wrapNonce.CopyTo(header, AegisConstants.WrapNonceOffset);
        wrappedDek.CopyTo(header, AegisConstants.WrappedDekOffset);
        wrapTag.CopyTo(header, AegisConstants.WrapTagOffset);
        return header;
    }

    public static AegisHeader Parse(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length < AegisConstants.FileMagic.Length ||
            !bytes[..AegisConstants.FileMagic.Length].SequenceEqual(AegisConstants.FileMagic))
        {
            throw new AegisFormatException(AegisErrors.Format);
        }

        if (bytes.Length < AegisConstants.HeaderLength)
        {
            throw new AegisFormatException(AegisErrors.Truncated);
        }

        if (bytes[5] != AegisConstants.FileVersion)
        {
            throw new AegisFormatException(AegisErrors.Version(bytes[5]));
        }

        if (bytes[6] != AegisConstants.KdfPbkdf2Sha256)
        {
            throw new AegisFormatException(AegisErrors.Kdf);
        }

        int flags = bytes[7];
        if ((flags & ~AegisConstants.KnownFlags) != 0)
        {
            throw new AegisFormatException(AegisErrors.Flags);
        }

        int iterations = (int)BinaryPrimitives.ReadUInt32BigEndian(bytes[8..]);
        int chunkSize = (int)BinaryPrimitives.ReadUInt32BigEndian(bytes[12..]);
        AegisValidation.AssertIterations(iterations);
        AegisValidation.AssertChunkSize(chunkSize);

        return new AegisHeader
        {
            Flags = (byte)flags,
            Iterations = iterations,
            ChunkSize = chunkSize,
            Salt = bytes.Slice(AegisConstants.SaltOffset, AegisConstants.SaltLength).ToArray(),
            FileId = bytes.Slice(AegisConstants.FileIdOffset, AegisConstants.FileIdLength).ToArray(),
            NoncePrefix = bytes
                .Slice(AegisConstants.NoncePrefixOffset, AegisConstants.NoncePrefixLength)
                .ToArray(),
            WrapNonce = bytes.Slice(AegisConstants.WrapNonceOffset, AegisConstants.IvLength).ToArray(),
            WrappedDek = bytes
                .Slice(AegisConstants.WrappedDekOffset, AegisConstants.DekLength)
                .ToArray(),
            WrapTag = bytes.Slice(AegisConstants.WrapTagOffset, AegisConstants.TagLength).ToArray(),
        };
    }
}

internal static class AegisValidation
{
    public static void AssertIterations(int iterations)
    {
        if (iterations < AegisConstants.IterationsMin || iterations > AegisConstants.IterationsMax)
        {
            throw new AegisFormatException(AegisErrors.Iterations);
        }
    }

    public static void AssertChunkSize(int chunkSize)
    {
        if (chunkSize < AegisConstants.ChunkSizeMin || chunkSize > AegisConstants.ChunkSizeMax)
        {
            throw new AegisFormatException(AegisErrors.ChunkSize);
        }
    }
}
