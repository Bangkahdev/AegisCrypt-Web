using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Text;
using AegisCrypt.Core;
using Xunit;

namespace AegisCrypt.Core.Tests;

public class AegisCryptoTests
{
    private const string VectorHex =
        "4145474953030101000927c00001000026456483a2c1e0ff1e3d5c7b9ab9d8f71635547392b1d0ef0e2d4c6b8aa9c8e7e60524436281a0bfdefd1c3b5a7998b7d6f51433527190afceed0c2b4a6988a79c085315a2b0af9c73010c67d3e65f067e119814e245d6e582b99aa7bfa4181377df6bc1446c6e12eb046fb687e6390f0100000031e842ccca36215b23858710c6f904b3de7f967ac32233fe44902f02a1142bd0a8882d96682218a396265f8f7f1127315563";

    private const string VectorPlaintext = "AegisCrypt format v3 test vector\n";
    private const string VectorPassword = "vector-password";
    private static readonly byte[] VectorKeyFile = Encoding.UTF8.GetBytes("vector-keyfile");

    [Fact]
    public void ReproducesFrozenV3VectorByteForByte()
    {
        var container = Encrypt(
            Encoding.UTF8.GetBytes(VectorPlaintext),
            VectorPassword,
            VectorKeyFile,
            new EncryptOptions
            {
                Iterations = AegisConstants.IterationsMin,
                ChunkSize = AegisConstants.ChunkSizeMin,
                RandomBytes = MakeRng(1),
            });

        Assert.Equal(VectorHex, Convert.ToHexString(container).ToLowerInvariant());
    }

    [Fact]
    public void DecryptsFrozenV3Vector()
    {
        var (plaintext, result) = Decrypt(FromHex(VectorHex), VectorPassword, VectorKeyFile);

        Assert.Equal(VectorPlaintext, Encoding.UTF8.GetString(plaintext));
        Assert.Null(result.Filename);
        Assert.False(result.LegacyV2);
    }

    [Fact]
    public void FrozenVectorGeometryMatchesFormat()
    {
        var bytes = FromHex(VectorHex);

        Assert.Equal(
            AegisConstants.HeaderLength + AegisConstants.RecordHeaderLength +
            Encoding.UTF8.GetByteCount(VectorPlaintext) + AegisConstants.TagLength,
            bytes.Length);
        Assert.Equal(AegisConstants.FileVersion, bytes[5]);
        Assert.Equal(AegisConstants.KdfPbkdf2Sha256, bytes[6]);
        Assert.Equal(AegisConstants.FlagKeyFile, bytes[7]);
        Assert.Equal((uint)AegisConstants.IterationsMin, BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(8)));
        Assert.Equal((uint)AegisConstants.ChunkSizeMin, BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(12)));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(65_535)]
    [InlineData(65_536)]
    [InlineData(65_537)]
    [InlineData(200_000)]
    public void RoundTripsAcrossChunkBoundaries(int length)
    {
        var plaintext = PatternBytes(length, 3);
        var container = Encrypt(plaintext, "round-trip", null, FastOptions());

        var (output, result) = Decrypt(container, "round-trip");

        Assert.Equal(plaintext, output);
        Assert.Null(result.Filename);
        Assert.False(result.LegacyV2);
    }

    [Fact]
    public void EmptyFileProducesSingleFinalRecord()
    {
        var container = Encrypt([], "kosong", null, FastOptions());

        Assert.Equal(
            AegisConstants.HeaderLength + AegisConstants.RecordHeaderLength + AegisConstants.TagLength,
            container.Length);
        Assert.Equal(AegisConstants.RecordFlagFinal, container[AegisConstants.HeaderLength]);

        var (output, _) = Decrypt(container, "kosong");
        Assert.Empty(output);
    }

    [Fact]
    public void RoundTripsFilenameMetadata()
    {
        var plaintext = PatternBytes(1_000, 7);
        var container = Encrypt(
            plaintext,
            "sandi",
            null,
            new EncryptOptions
            {
                Iterations = AegisConstants.IterationsMin,
                ChunkSize = AegisConstants.ChunkSizeMin,
                Filename = "rahasia.txt",
            });

        var (output, result) = Decrypt(container, "sandi");

        Assert.Equal(plaintext, output);
        Assert.Equal("rahasia.txt", result.Filename);
        Assert.Equal(AegisConstants.FlagFilename, container[7]);
    }

    [Fact]
    public void RoundTripsRecoveryKeyInsteadOfPassword()
    {
        var plaintext = PatternBytes(70_000, 11);
        var keyFile = Encoding.UTF8.GetBytes("keyfile-recovery");
        var recoveryKey = PatternBytes(AegisConstants.RecoveryKeyLength, 21);

        var container = Encrypt(
            plaintext,
            "sandi-lama",
            keyFile,
            new EncryptOptions
            {
                Iterations = AegisConstants.IterationsMin,
                ChunkSize = AegisConstants.ChunkSizeMin,
                Filename = "arsip.bin",
                RecoveryKey = recoveryKey,
            });

        Assert.Equal(AegisConstants.FlagKeyFile | AegisConstants.FlagRecovery | AegisConstants.FlagFilename, container[7]);

        var (fromPassword, passwordResult) = Decrypt(container, "sandi-lama", keyFile);
        Assert.Equal(plaintext, fromPassword);
        Assert.Equal("arsip.bin", passwordResult.Filename);

        var (fromRecovery, recoveryResult) = Decrypt(container, string.Empty, null, recoveryKey);
        Assert.Equal(plaintext, fromRecovery);
        Assert.Equal("arsip.bin", recoveryResult.Filename);
    }

    [Fact]
    public void WrongRecoveryKeyIsRejected()
    {
        var recoveryKey = PatternBytes(AegisConstants.RecoveryKeyLength, 4);
        var container = Encrypt(
            PatternBytes(100, 1),
            "sandi",
            null,
            new EncryptOptions
            {
                Iterations = AegisConstants.IterationsMin,
                ChunkSize = AegisConstants.ChunkSizeMin,
                RecoveryKey = recoveryKey,
            });

        var wrong = (byte[])recoveryKey.Clone();
        wrong[0] ^= 0xff;

        var error = Assert.Throws<AegisFormatException>(() => Decrypt(container, string.Empty, null, wrong));
        Assert.Equal(AegisErrors.RecoveryKey, error.Message);
    }

    [Fact]
    public void RecoveryKeyRequiresRecoverySlot()
    {
        var container = Encrypt(PatternBytes(50, 2), "sandi", null, FastOptions());
        var recoveryKey = PatternBytes(AegisConstants.RecoveryKeyLength, 8);

        var error = Assert.Throws<AegisFormatException>(() => Decrypt(container, string.Empty, null, recoveryKey));
        Assert.Equal(AegisErrors.RecoveryMissing, error.Message);
    }

    [Fact]
    public void RewrapKeepsRecoverySlotAndFilename()
    {
        var plaintext = PatternBytes(90_000, 5);
        var recoveryKey = PatternBytes(AegisConstants.RecoveryKeyLength, 13);
        var container = Encrypt(
            plaintext,
            "lama",
            null,
            new EncryptOptions
            {
                Iterations = AegisConstants.IterationsMin,
                ChunkSize = AegisConstants.ChunkSizeMin,
                Filename = "dokumen.pdf",
                RecoveryKey = recoveryKey,
            });

        var rewrapped = Rewrap(container, "lama", "baru", iterations: AegisConstants.IterationsMin + 1);

        Assert.Equal((uint)(AegisConstants.IterationsMin + 1), BinaryPrimitives.ReadUInt32BigEndian(rewrapped.AsSpan(8)));
        Assert.Equal(AegisConstants.FlagRecovery | AegisConstants.FlagFilename, rewrapped[7]);

        var (fromNewPassword, newResult) = Decrypt(rewrapped, "baru");
        Assert.Equal(plaintext, fromNewPassword);
        Assert.Equal("dokumen.pdf", newResult.Filename);

        var (fromRecovery, _) = Decrypt(rewrapped, string.Empty, null, recoveryKey);
        Assert.Equal(plaintext, fromRecovery);

        var error = Assert.Throws<AegisFormatException>(() => Decrypt(rewrapped, "lama"));
        Assert.Equal(AegisErrors.Credentials, error.Message);
    }

    [Fact]
    public void RewrapWithWrongOldPasswordFails()
    {
        var container = Encrypt(PatternBytes(200, 6), "benar", null, FastOptions());

        var error = Assert.Throws<AegisFormatException>(() => Rewrap(container, "salah", "baru"));
        Assert.Equal(AegisErrors.Credentials, error.Message);
    }

    [Fact]
    public void EncryptReportsMonotonicProgress()
    {
        var plaintext = PatternBytes(AegisConstants.ChunkSizeMin + 500, 4);
        var reported = new List<long>();

        Encrypt(
            plaintext,
            "sandi",
            null,
            new EncryptOptions
            {
                Iterations = AegisConstants.IterationsMin,
                ChunkSize = AegisConstants.ChunkSizeMin,
                Progress = reported.Add,
            });

        Assert.NotEmpty(reported);
        Assert.Equal(plaintext.Length, reported[^1]);
        for (var i = 1; i < reported.Count; i++)
        {
            Assert.True(reported[i] > reported[i - 1]);
        }
    }

    [Fact]
    public void DecryptsLegacyV2Container()
    {
        var plaintext = PatternBytes(10_000, 17);
        var container = BuildLegacyV2(plaintext, "warisan", chunkSize: 4_096);

        var (output, result) = Decrypt(container, "warisan");

        Assert.Equal(plaintext, output);
        Assert.Null(result.Filename);
        Assert.True(result.LegacyV2);
    }

    [Fact]
    public void LegacyV2RejectsRecoveryKey()
    {
        var container = BuildLegacyV2(PatternBytes(10, 1), "warisan");
        var recoveryKey = PatternBytes(AegisConstants.RecoveryKeyLength, 2);

        var error = Assert.Throws<AegisFormatException>(() => Decrypt(container, string.Empty, null, recoveryKey));
        Assert.Equal(AegisErrors.RecoveryMissing, error.Message);
    }

    [Fact]
    public void LegacyV2DetectsCorruption()
    {
        var container = BuildLegacyV2(PatternBytes(1_000, 9), "warisan", chunkSize: 100);

        var truncatedPayload = container[..^1];
        var truncatedLength = container[..^(AegisConstants.LegacyHeaderLength + 2)];

        var payloadError = Assert.Throws<AegisFormatException>(() => Decrypt(truncatedPayload, "warisan"));
        Assert.Equal(AegisErrors.LegacyCorrupt, payloadError.Message);

        var lengthError = Assert.Throws<AegisFormatException>(() => Decrypt(truncatedLength, "warisan"));
        Assert.Equal(AegisErrors.LegacyCorrupt, lengthError.Message);
    }

    [Fact]
    public void WrongPasswordIsRejected()
    {
        var container = Encrypt(PatternBytes(32, 4), "benar", null, FastOptions());

        var error = Assert.Throws<AegisFormatException>(() => Decrypt(container, "salah"));
        Assert.Equal(AegisErrors.Credentials, error.Message);
    }

    [Fact]
    public void WrongKeyFileIsRejected()
    {
        var container = Encrypt(PatternBytes(32, 4), "sandi", Encoding.UTF8.GetBytes("kunci-a"), FastOptions());

        var error = Assert.Throws<AegisFormatException>(
            () => Decrypt(container, "sandi", Encoding.UTF8.GetBytes("kunci-b")));
        Assert.Equal(AegisErrors.Credentials, error.Message);
    }

    [Fact]
    public void TamperedCiphertextIsRejected()
    {
        var container = Encrypt(PatternBytes(500, 8), "sandi", null, FastOptions());
        var tampered = (byte[])container.Clone();
        tampered[AegisConstants.HeaderLength + AegisConstants.RecordHeaderLength] ^= 0x01;

        var error = Assert.Throws<AegisFormatException>(() => Decrypt(tampered, "sandi"));
        Assert.Equal(AegisErrors.Tampered, error.Message);
    }

    [Fact]
    public void AppendedDataIsRejected()
    {
        var container = Encrypt(PatternBytes(500, 8), "sandi", null, FastOptions());

        var withTrailing = new byte[container.Length + 1];
        container.CopyTo(withTrailing, 0);

        var error = Assert.Throws<AegisFormatException>(() => Decrypt(withTrailing, "sandi"));
        Assert.Equal(AegisErrors.Trailing, error.Message);
    }

    [Fact]
    public void MissingFinalRecordIsRejected()
    {
        var plaintext = PatternBytes(AegisConstants.ChunkSizeMin + 100, 2);
        var container = Encrypt(plaintext, "sandi", null, FastOptions());
        var withoutFinal = container[..(container.Length - (AegisConstants.RecordHeaderLength + 100 + AegisConstants.TagLength))];

        var error = Assert.Throws<AegisFormatException>(() => Decrypt(withoutFinal, "sandi"));
        Assert.Equal(AegisErrors.MissingFinal, error.Message);
    }

    [Fact]
    public void TruncatedContainerIsRejected()
    {
        var container = Encrypt(PatternBytes(300, 3), "sandi", null, FastOptions());

        var shortHeader = Assert.Throws<AegisFormatException>(() => Decrypt(container[..100], "sandi"));
        Assert.Equal(AegisErrors.Truncated, shortHeader.Message);

        var shortRecord = Assert.Throws<AegisFormatException>(() => Decrypt(container[..^1], "sandi"));
        Assert.Equal(AegisErrors.Truncated, shortRecord.Message);
    }

    [Fact]
    public void EmptyInputIsNotAValidContainer()
    {
        var error = Assert.Throws<AegisFormatException>(() => Decrypt([], "sandi"));
        Assert.Equal(AegisErrors.Format, error.Message);
    }

    [Fact]
    public void UnsupportedVersionIsRejected()
    {
        var container = Encrypt(PatternBytes(10, 1), "sandi", null, FastOptions());
        var bumped = (byte[])container.Clone();
        bumped[5] = 9;

        var error = Assert.Throws<AegisFormatException>(() => Decrypt(bumped, "sandi"));
        Assert.Equal(AegisErrors.Version(9), error.Message);
    }

    [Fact]
    public void UnknownHeaderFlagIsRejected()
    {
        var container = Encrypt(PatternBytes(10, 1), "sandi", null, FastOptions());
        var flagged = (byte[])container.Clone();
        flagged[7] |= 0x08;

        var error = Assert.Throws<AegisFormatException>(() => Decrypt(flagged, "sandi"));
        Assert.Equal(AegisErrors.Flags, error.Message);
    }

    [Fact]
    public void OutOfRangeKdfParametersAreRejected()
    {
        var container = Encrypt(PatternBytes(10, 1), "sandi", null, FastOptions());

        var badIterations = (byte[])container.Clone();
        BinaryPrimitives.WriteUInt32BigEndian(badIterations.AsSpan(8), 1);
        var iterationsError = Assert.Throws<AegisFormatException>(() => Decrypt(badIterations, "sandi"));
        Assert.Equal(AegisErrors.Iterations, iterationsError.Message);

        var badChunk = (byte[])container.Clone();
        BinaryPrimitives.WriteUInt32BigEndian(badChunk.AsSpan(12), 1);
        var chunkError = Assert.Throws<AegisFormatException>(() => Decrypt(badChunk, "sandi"));
        Assert.Equal(AegisErrors.ChunkSize, chunkError.Message);
    }

    private static EncryptOptions FastOptions() => new()
    {
        Iterations = AegisConstants.IterationsMin,
        ChunkSize = AegisConstants.ChunkSizeMin,
    };

    private static byte[] Encrypt(
        byte[] plaintext,
        string password,
        byte[]? keyFile,
        EncryptOptions? options = null)
    {
        using var input = new MemoryStream(plaintext, writable: false);
        using var output = new MemoryStream();
        AegisCrypto.Encrypt(input, output, password, keyFile, options);
        return output.ToArray();
    }

    private static (byte[] Plaintext, DecryptResult Result) Decrypt(
        byte[] container,
        string password,
        byte[]? keyFile = null,
        byte[]? recoveryKey = null)
    {
        using var input = new MemoryStream(container, writable: false);
        using var output = new MemoryStream();
        var result = AegisCrypto.Decrypt(input, output, password, keyFile, recoveryKey);
        return (output.ToArray(), result);
    }

    private static byte[] Rewrap(
        byte[] container,
        string oldPassword,
        string newPassword,
        byte[]? oldKeyFile = null,
        byte[]? newKeyFile = null,
        int? iterations = null)
    {
        using var input = new MemoryStream(container, writable: false);
        using var output = new MemoryStream();
        AegisCrypto.Rewrap(input, output, oldPassword, oldKeyFile, newPassword, newKeyFile, iterations);
        return output.ToArray();
    }

    private static byte[] BuildLegacyV2(byte[] plaintext, string password, int chunkSize = 4_096)
    {
        var salt = PatternBytes(AegisConstants.SaltLength, 5);
        var key = Rfc2898DeriveBytes.Pbkdf2(
            Encoding.UTF8.GetBytes(password),
            salt,
            AegisConstants.LegacyIterations,
            HashAlgorithmName.SHA256,
            AegisConstants.KeyLength);

        using var output = new MemoryStream();
        var header = new byte[AegisConstants.LegacyHeaderLength];
        AegisConstants.FileMagic.CopyTo(header, 0);
        header[5] = AegisConstants.LegacyVersion;
        salt.CopyTo(header, 6);
        output.Write(header);

        for (var offset = 0; offset < plaintext.Length; offset += chunkSize)
        {
            var length = Math.Min(chunkSize, plaintext.Length - offset);
            var iv = PatternBytes(AegisConstants.IvLength, offset + 1);
            var sealedData = new byte[length + AegisConstants.TagLength];

            using (var gcm = new AesGcm(key, AegisConstants.TagLength))
            {
                gcm.Encrypt(
                    iv,
                    plaintext.AsSpan(offset, length),
                    sealedData.AsSpan(0, length),
                    sealedData.AsSpan(length),
                    ReadOnlySpan<byte>.Empty);
            }

            var lengthPrefix = new byte[4];
            BinaryPrimitives.WriteInt32LittleEndian(lengthPrefix, iv.Length + sealedData.Length);
            output.Write(lengthPrefix);
            output.Write(iv);
            output.Write(sealedData);
        }

        return output.ToArray();
    }

    private static byte[] PatternBytes(int length, int seed)
    {
        var bytes = new byte[length];
        for (var i = 0; i < length; i++)
        {
            bytes[i] = (byte)((i + seed) & 0xff);
        }

        return bytes;
    }

    private static Func<int, byte[]> MakeRng(int seed)
    {
        var counter = seed;
        return length =>
        {
            var bytes = new byte[length];
            for (var i = 0; i < length; i++)
            {
                bytes[i] = (byte)((counter * 31 + 7) & 0xff);
                counter++;
            }

            return bytes;
        };
    }

    private static byte[] FromHex(string value) =>
        Convert.FromHexString(value.Replace(" ", string.Empty).Replace("\n", string.Empty).Replace("\r", string.Empty));
}
