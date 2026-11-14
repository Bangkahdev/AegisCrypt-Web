using System.Buffers.Binary;
using System.IO;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using AegisCrypt.Core;
using Xunit;

namespace AegisCrypt.Core.Tests;

public class AegisCryptoTests
{
    private sealed record SharedVector(
        string Id,
        string Plaintext,
        string Password,
        string Keyfile,
        int Iterations,
        int ChunkSize,
        int RngSeed,
        string ContainerHex);

    private sealed record UnicodeVector(
        string Plaintext,
        string PasswordNfc,
        string PasswordNfd,
        string PasswordNfcUtf8Hex,
        string PasswordNfdUtf8Hex,
        int Iterations,
        int ChunkSize,
        int RngSeed,
        string ContainerHex);

    private sealed record LegacyVector(
        string PlaintextUtf8,
        string Password,
        string KeyfileHex,
        string ContainerHex);

    private static readonly SharedVector Vector = JsonSerializer.Deserialize<SharedVector>(
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "fixtures", "v3-vector.json")),
        new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;

    private static readonly UnicodeVector Unicode = JsonSerializer.Deserialize<UnicodeVector>(
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "fixtures", "v3-unicode-vector.json")),
        new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;

    private static string VectorHex => Vector.ContainerHex;
    private static string VectorPlaintext => Vector.Plaintext;
    private static string VectorPassword => Vector.Password;
    private static byte[] VectorKeyFile => Encoding.UTF8.GetBytes(Vector.Keyfile);

    [Fact]
    public void ReproducesFrozenV3VectorByteForByte()
    {
        var container = Encrypt(
            Encoding.UTF8.GetBytes(VectorPlaintext),
            VectorPassword,
            VectorKeyFile,
            new EncryptOptions
            {
                Iterations = Vector.Iterations,
                ChunkSize = Vector.ChunkSize,
                RandomBytes = MakeRng(Vector.RngSeed),
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
    public void ReproducesFrozenUnicodeNfcVectorByteForByte()
    {
        var container = Encrypt(
            Encoding.UTF8.GetBytes(Unicode.Plaintext),
            Unicode.PasswordNfc,
            null,
            new EncryptOptions
            {
                Iterations = Unicode.Iterations,
                ChunkSize = Unicode.ChunkSize,
                RandomBytes = MakeRng(Unicode.RngSeed),
            });

        Assert.Equal(Unicode.ContainerHex, Convert.ToHexString(container).ToLowerInvariant());
    }

    [Fact]
    public void DecryptsFrozenUnicodeNfcVector()
    {
        var (plaintext, result) = Decrypt(FromHex(Unicode.ContainerHex), Unicode.PasswordNfc);

        Assert.Equal(Unicode.Plaintext, Encoding.UTF8.GetString(plaintext));
        Assert.Null(result.Filename);
        Assert.False(result.LegacyV2);
    }

    [Fact]
    public void NfdSpellingOfUnicodePasswordIsDifferentCredentials()
    {
        var error = Assert.Throws<AegisFormatException>(
            () => Decrypt(FromHex(Unicode.ContainerHex), Unicode.PasswordNfd));

        Assert.Equal(AegisErrors.Credentials, error.Message);
    }

    [Fact]
    public void UnicodeFormsEncodeDifferentUtf8Bytes()
    {
        Assert.Equal(Unicode.PasswordNfcUtf8Hex, Convert.ToHexString(Encoding.UTF8.GetBytes(Unicode.PasswordNfc)).ToLowerInvariant());
        Assert.Equal(Unicode.PasswordNfdUtf8Hex, Convert.ToHexString(Encoding.UTF8.GetBytes(Unicode.PasswordNfd)).ToLowerInvariant());
        Assert.NotEqual(Unicode.PasswordNfcUtf8Hex, Unicode.PasswordNfdUtf8Hex);
    }

    [Fact]
    public void DecryptsFrozenLegacyV2Vector()
    {
        var v2 = JsonSerializer.Deserialize<LegacyVector>(
            File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "fixtures", "v2-vector.json")),
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
        var (plaintext, result) = Decrypt(
            FromHex(v2.ContainerHex),
            v2.Password,
            Convert.FromHexString(v2.KeyfileHex));
        Assert.Equal(v2.PlaintextUtf8, Encoding.UTF8.GetString(plaintext));
        Assert.True(result.LegacyV2);
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
        Assert.Equal((uint)Vector.Iterations, BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(8)));
        Assert.Equal((uint)Vector.ChunkSize, BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(12)));
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

    [Theory]
    [InlineData("a/b")]
    [InlineData("a\\b")]
    [InlineData("a\0b")]
    public void UnsafeFilenameIsRejectedOnEncrypt(string filename)
    {
        var error = Assert.Throws<AegisFormatException>(() => Encrypt(
            PatternBytes(16, 1),
            "sandi",
            null,
            new EncryptOptions
            {
                Iterations = AegisConstants.IterationsMin,
                ChunkSize = AegisConstants.ChunkSizeMin,
                Filename = filename,
            }));

        Assert.Equal(AegisErrors.FilenameMetadata, error.Message);
    }

    [Fact]
    public void RecordLengthAboveLimitIsRejected()
    {
        var container = Encrypt(PatternBytes(16, 1), "sandi", null, FastOptions());
        var mutated = (byte[])container.Clone();
        BinaryPrimitives.WriteUInt32BigEndian(
            mutated.AsSpan(AegisConstants.HeaderLength + 1),
            uint.MaxValue);

        var error = Assert.Throws<AegisFormatException>(() => Decrypt(mutated, "sandi"));
        Assert.Equal(AegisErrors.Record, error.Message);
    }

    [Fact]
    public void ZeroLengthNonFinalRecordIsRejected()
    {
        var container = Encrypt(
            PatternBytes(AegisConstants.ChunkSizeMin, 1),
            "sandi",
            null,
            FastOptions());
        var mutated = (byte[])container.Clone();
        mutated[AegisConstants.HeaderLength] &= 0xfe;
        BinaryPrimitives.WriteUInt32BigEndian(
            mutated.AsSpan(AegisConstants.HeaderLength + 1),
            0);

        var error = Assert.Throws<AegisFormatException>(() => Decrypt(mutated, "sandi"));
        Assert.Equal(AegisErrors.Record, error.Message);
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
    public void EncryptHonorsCancellation()
    {
        var cts = new CancellationTokenSource();
        cts.Cancel();

        var error = Assert.Throws<OperationCanceledException>(() =>
            Encrypt(
                PatternBytes(100, 1),
                "sandi",
                null,
                FastOptions(),
                cancellationToken: cts.Token));

        Assert.Equal(AegisErrors.Cancelled, error.Message);
    }

    [Fact]
    public void DecryptHonorsCancellation()
    {
        var plaintext = PatternBytes(AegisConstants.ChunkSizeMin * 3, 2);
        var container = Encrypt(plaintext, "sandi", null, FastOptions());
        var cts = new CancellationTokenSource();

        var error = Assert.Throws<OperationCanceledException>(() =>
            Decrypt(container, "sandi", progress: _ => cts.Cancel(), cancellationToken: cts.Token));

        Assert.Equal(AegisErrors.Cancelled, error.Message);
    }

    [Fact]
    public void RewrapHonorsCancellation()
    {
        var container = Encrypt(PatternBytes(1_000, 5), "lama", null, FastOptions());
        var cts = new CancellationTokenSource();
        cts.Cancel();

        var error = Assert.Throws<OperationCanceledException>(() =>
            Rewrap(container, "lama", "baru", cancellationToken: cts.Token));

        Assert.Equal(AegisErrors.Cancelled, error.Message);
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
    public void LegacyV2RejectsUnknownMagic()
    {
        var container = BuildLegacyV2(PatternBytes(10, 1), "warisan");
        var mutated = (byte[])container.Clone();
        mutated[0] = 0x42;

        var error = Assert.Throws<AegisFormatException>(() => Decrypt(mutated, "warisan"));
        Assert.Equal(AegisErrors.Format, error.Message);
    }

    [Fact]
    public void LegacyV2RejectsUnsupportedVersion()
    {
        var container = BuildLegacyV2(PatternBytes(10, 1), "warisan");
        var mutated = (byte[])container.Clone();
        mutated[5] = 1;

        var error = Assert.Throws<AegisFormatException>(() => Decrypt(mutated, "warisan"));
        Assert.Equal(AegisErrors.Version(1), error.Message);
    }

    [Fact]
    public void LegacyV2ReadsEmptyContainer()
    {
        var container = BuildLegacyV2([], "warisan");

        var (output, result) = Decrypt(container, "warisan");

        Assert.Empty(output);
        Assert.True(result.LegacyV2);
    }

    [Fact]
    public void LegacyV2RejectsTrailingBytes()
    {
        var container = BuildLegacyV2(PatternBytes(100, 2), "warisan");
        var withTrailing = new byte[container.Length + 1];
        container.CopyTo(withTrailing, 0);

        var error = Assert.Throws<AegisFormatException>(() => Decrypt(withTrailing, "warisan"));
        Assert.Equal(AegisErrors.LegacyCorrupt, error.Message);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void LegacyV2RejectsInvalidChunkLength(int chunkLength)
    {
        var container = BuildLegacyV2(PatternBytes(100, 2), "warisan");
        BinaryPrimitives.WriteInt32LittleEndian(
            container.AsSpan(AegisConstants.LegacyHeaderLength),
            chunkLength);

        var error = Assert.Throws<AegisFormatException>(() => Decrypt(container, "warisan"));
        Assert.Equal(AegisErrors.LegacyCorrupt, error.Message);
    }

    [Fact]
    public void LegacyV2RejectsChunkLongerThanPayload()
    {
        var container = BuildLegacyV2(PatternBytes(100, 2), "warisan");
        BinaryPrimitives.WriteInt32LittleEndian(
            container.AsSpan(AegisConstants.LegacyHeaderLength),
            5_000);

        var error = Assert.Throws<AegisFormatException>(() => Decrypt(container, "warisan"));
        Assert.Equal(AegisErrors.LegacyCorrupt, error.Message);
    }

    [Fact]
    public void LegacyV2SupportsKeyFile()
    {
        var keyFile = Encoding.UTF8.GetBytes("legacy keyfile");
        var plaintext = PatternBytes(500, 3);
        var container = BuildLegacyV2(plaintext, "warisan", keyFile: keyFile);

        var (output, _) = Decrypt(container, "warisan", keyFile);
        Assert.Equal(plaintext, output);

        var error = Assert.Throws<AegisFormatException>(() => Decrypt(container, "warisan"));
        Assert.Equal(AegisErrors.Credentials, error.Message);
    }

    [Fact]
    public void ErrorCatalogMatchesDesktopMessages()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "fixtures", "error-catalog.json");
        using var document = JsonDocument.Parse(File.ReadAllText(path));
        var root = document.RootElement;

        var catalogued = root.GetProperty("messages")
            .EnumerateObject()
            .ToDictionary(p => p.Name, p => p.Value.GetString()!);

        var fields = typeof(AegisErrors)
            .GetFields(BindingFlags.Public | BindingFlags.Static)
            .Where(f => f.IsLiteral && f.FieldType == typeof(string))
            .ToDictionary(f => ToCamelCase(f.Name), f => (string)f.GetRawConstantValue()!);

        Assert.Equal(catalogued.Keys.OrderBy(k => k), fields.Keys.OrderBy(k => k));
        foreach (var (name, value) in fields)
        {
            Assert.Equal(catalogued[name], value);
        }

        var template = root.GetProperty("versionTemplate").GetString()!;
        Assert.Equal(template.Replace("{v}", "7"), AegisErrors.Version(7));
    }

    private static string ToCamelCase(string name) =>
        char.ToLowerInvariant(name[0]) + name[1..];

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
        EncryptOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        using var input = new MemoryStream(plaintext, writable: false);
        using var output = new MemoryStream();
        AegisCrypto.Encrypt(input, output, password, keyFile, options, cancellationToken);
        return output.ToArray();
    }

    private static (byte[] Plaintext, DecryptResult Result) Decrypt(
        byte[] container,
        string password,
        byte[]? keyFile = null,
        byte[]? recoveryKey = null,
        Action<long>? progress = null,
        CancellationToken cancellationToken = default)
    {
        using var input = new MemoryStream(container, writable: false);
        using var output = new MemoryStream();
        var result = AegisCrypto.Decrypt(input, output, password, keyFile, recoveryKey, progress, cancellationToken);
        return (output.ToArray(), result);
    }

    private static byte[] Rewrap(
        byte[] container,
        string oldPassword,
        string newPassword,
        byte[]? oldKeyFile = null,
        byte[]? newKeyFile = null,
        int? iterations = null,
        CancellationToken cancellationToken = default)
    {
        using var input = new MemoryStream(container, writable: false);
        using var output = new MemoryStream();
        AegisCrypto.Rewrap(input, output, oldPassword, oldKeyFile, newPassword, newKeyFile, iterations, cancellationToken: cancellationToken);
        return output.ToArray();
    }

    private static byte[] BuildLegacyV2(
        byte[] plaintext,
        string password,
        int chunkSize = 4_096,
        byte[]? keyFile = null)
    {
        var salt = PatternBytes(AegisConstants.SaltLength, 5);
        var passwordBytes = Encoding.UTF8.GetBytes(password);
        if (keyFile is not null)
        {
            var hash = SHA256.HashData(keyFile);
            var material = new byte[passwordBytes.Length + hash.Length];
            passwordBytes.CopyTo(material, 0);
            hash.CopyTo(material, passwordBytes.Length);
            passwordBytes = material;
        }

        var key = Rfc2898DeriveBytes.Pbkdf2(
            passwordBytes,
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
