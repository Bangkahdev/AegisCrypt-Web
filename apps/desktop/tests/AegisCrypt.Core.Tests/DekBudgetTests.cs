using System.IO;
using System.Text;
using System.Text.Json;
using AegisCrypt.Core;
using Xunit;

namespace AegisCrypt.Core.Tests;

public class DekBudgetTests
{
    private sealed record VectorCase(ulong Aad, ulong Ciphertext, ulong Blocks);

    private sealed record FixtureRoot(VectorCase[] Cases);

    private static readonly VectorCase[] BlockVectors =
        JsonSerializer.Deserialize<FixtureRoot>(
            File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "fixtures", "gcm-block-accounting.json")),
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!.Cases;

    [Fact]
    public void CountGcmBlocksMatchesSharedFixture()
    {
        Assert.NotEmpty(BlockVectors);
        foreach (var c in BlockVectors)
        {
            Assert.Equal(c.Blocks, AegisCrypto.CountGcmBlocks(c.Aad, c.Ciphertext));
        }
    }

    [Fact]
    public void ChargeDekRejectsOneBlockOverTheCap()
    {
        var (bytes, blocks) = AegisCrypto.ChargeDek(0, 0, 43, 0, maxDekBlocks: 4);
        Assert.Equal(4UL, blocks);
        Assert.Throws<AegisFormatException>(() =>
            AegisCrypto.ChargeDek(bytes, blocks, 0, 0, maxDekBlocks: 4));
    }

    [Fact]
    public void ChargeDekEnforcesTheByteCapAsSecondaryLimit()
    {
        var maxBytes = AegisConstants.MaxDekBytes;
        var (bytes, blocks) = AegisCrypto.ChargeDek(
            maxBytes - 10, 0, 4, 6, maxDekBlocks: AegisConstants.MaxDekBlocks);
        Assert.Equal(maxBytes, bytes);
        Assert.Throws<AegisFormatException>(() =>
            AegisCrypto.ChargeDek(bytes, blocks, 0, 1, maxDekBlocks: AegisConstants.MaxDekBlocks));
    }

    [Fact]
    public void ChargeDekRejectsOverflow()
    {
        Assert.Throws<AegisFormatException>(() =>
            AegisCrypto.ChargeDek(ulong.MaxValue, 0, 1, 0, maxDekBlocks: AegisConstants.MaxDekBlocks));
    }

    [Fact]
    public void EncryptStopsBeforeSealingWhenBudgetIsExceeded()
    {
        using var input = new MemoryStream([1, 2, 3, 4]);
        using var output = new MemoryStream();
        var error = Assert.Throws<AegisFormatException>(() =>
            AegisCrypto.Encrypt(input, output, "sandi", null, new EncryptOptions
            {
                Iterations = 600_000,
                ChunkSize = 65_536,
                MaxDekBlocks = 4, // the 4-byte final record needs 5 GHASH blocks
                RandomBytes = DeterministicRng(3),
            }));
        Assert.Equal(AegisErrors.DekBudget, error.Message);
    }

    [Fact]
    public void EncryptSucceedsAtExactlyTheRequiredBlockCount()
    {
        using var input = new MemoryStream([1, 2, 3, 4]);
        using var output = new MemoryStream();
        AegisCrypto.Encrypt(input, output, "sandi", null, new EncryptOptions
        {
            Iterations = 600_000,
            ChunkSize = 65_536,
            MaxDekBlocks = 5,
            RandomBytes = DeterministicRng(3),
        });
        Assert.True(output.Length > 0);
    }

    [Fact]
    public void EncryptionAccountsForChunkBoundaries()
    {
        foreach (var chunk in new[] { 65_536, 1_048_576, 16_777_216 })
        {
            var size = chunk + 1;
            var total = (ulong)(chunk / 16 + 4 + 5); // full chunk record + 1-byte final record
            var pass = new byte[size];
            new Random(11).NextBytes(pass);

            using var okInput = new MemoryStream(pass);
            using var okOutput = new MemoryStream();
            AegisCrypto.Encrypt(okInput, okOutput, "sandi", null, new EncryptOptions
            {
                Iterations = 600_000,
                ChunkSize = chunk,
                MaxDekBlocks = total,
                RandomBytes = DeterministicRng(4),
            });

            using var failInput = new MemoryStream(pass);
            using var failOutput = new MemoryStream();
            var error = Assert.Throws<AegisFormatException>(() =>
                AegisCrypto.Encrypt(failInput, failOutput, "sandi", null, new EncryptOptions
                {
                    Iterations = 600_000,
                    ChunkSize = chunk,
                    MaxDekBlocks = total - 1,
                    RandomBytes = DeterministicRng(4),
                }));
            Assert.Equal(AegisErrors.DekBudget, error.Message);
        }
    }

    [Fact]
    public void FilenameMetadataIsChargedBeforePayloadRecords()
    {
        var plaintext = Array.Empty<byte>();
        // Filename "a" (1 byte): 3 + 1 + 1 = 5 blocks; empty-file record: 4 blocks; total 9.
        using var tooSmallInput = new MemoryStream(plaintext);
        using var tooSmallOutput = new MemoryStream();
        var error = Assert.Throws<AegisFormatException>(() =>
            AegisCrypto.Encrypt(tooSmallInput, tooSmallOutput, "sandi", null, new EncryptOptions
            {
                Iterations = 600_000,
                ChunkSize = 65_536,
                Filename = "a",
                MaxDekBlocks = 8,
                RandomBytes = DeterministicRng(5),
            }));
        Assert.Equal(AegisErrors.DekBudget, error.Message);

        using var okInput = new MemoryStream(plaintext);
        using var okOutput = new MemoryStream();
        AegisCrypto.Encrypt(okInput, okOutput, "sandi", null, new EncryptOptions
        {
            Iterations = 600_000,
            ChunkSize = 65_536,
            Filename = "a",
            MaxDekBlocks = 9,
            RandomBytes = DeterministicRng(5),
        });
    }

    [Fact]
    public void DecryptRejectsBeforeGcmAndPublishesNoPlaintext()
    {
        var plaintext = new byte[64];
        using var containerBuffer = new MemoryStream();
        AegisCrypto.Encrypt(new MemoryStream(plaintext), containerBuffer, "sandi", null, new EncryptOptions
        {
            Iterations = 600_000,
            ChunkSize = 65_536,
            RandomBytes = DeterministicRng(6),
        });
        var container = containerBuffer.ToArray();

        // 64-byte record needs 3 + ceil(64/16) + 1 = 8 blocks; allow only 7.
        using var output = new MemoryStream();
        var error = Assert.Throws<AegisFormatException>(() =>
            AegisCrypto.Decrypt(new MemoryStream(container), output, "sandi", null, null, null, default, maxDekBlocks: 7));
        Assert.Equal(AegisErrors.DekBudget, error.Message);
        Assert.Equal(0, output.Length);
    }

    [Fact]
    public void DecryptAtExactlyTheBudgetBoundarySucceeds()
    {
        var plaintext = new byte[64];
        using var containerBuffer = new MemoryStream();
        AegisCrypto.Encrypt(new MemoryStream(plaintext), containerBuffer, "sandi", null, new EncryptOptions
        {
            Iterations = 600_000,
            ChunkSize = 65_536,
            RandomBytes = DeterministicRng(7),
        });
        var container = containerBuffer.ToArray();

        using var output = new MemoryStream();
        AegisCrypto.Decrypt(new MemoryStream(container), output, "sandi", null, null, null, default, maxDekBlocks: 8);
        Assert.Equal(plaintext.Length, output.Length);
    }

    [Fact]
    public void FilenameMetadataIsChargedOnDecryptBeforePayloadRecords()
    {
        var plaintext = new byte[] { 1, 2, 3, 4 };
        using var containerBuffer = new MemoryStream();
        AegisCrypto.Encrypt(new MemoryStream(plaintext), containerBuffer, "sandi", null, new EncryptOptions
        {
            Iterations = 600_000,
            ChunkSize = 65_536,
            Filename = "a",
            RandomBytes = DeterministicRng(8),
        });
        var container = containerBuffer.ToArray();

        // Filename "a": 5 blocks; 4-byte record: 5 blocks; total 10.
        using var passOutput = new MemoryStream();
        AegisCrypto.Decrypt(new MemoryStream(container), passOutput, "sandi", null, null, null, default, maxDekBlocks: 10);
        Assert.Equal(plaintext.Length, passOutput.Length);

        using var failOutput = new MemoryStream();
        var error = Assert.Throws<AegisFormatException>(() =>
            AegisCrypto.Decrypt(new MemoryStream(container), failOutput, "sandi", null, null, null, default, maxDekBlocks: 9));
        Assert.Equal(AegisErrors.DekBudget, error.Message);
        Assert.Equal(0, failOutput.Length);
    }

    private static Func<int, byte[]> DeterministicRng(int seed)
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
}
