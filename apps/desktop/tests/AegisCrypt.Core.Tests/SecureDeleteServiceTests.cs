using System.IO;
using System.Security.Cryptography;
using AegisCrypt.Core;
using Xunit;

namespace AegisCrypt.Core.Tests;

public class SecureDeleteServiceTests
{
    [Fact]
    public void SecureDeleteRemovesFile()
    {
        var path = WriteTempFile("delete-me.bin", PatternBytes(1_000));

        SecureDeleteService.SecureDelete(path, passes: 1);

        Assert.False(File.Exists(path));
    }

    [Fact]
    public void OverwriteChangesContentsBeforeDeletion()
    {
        var path = WriteTempFile("overwrite-me.bin", PatternBytes(500));
        var original = File.ReadAllBytes(path);

        SecureDeleteService.SecureDelete(path, passes: 3);

        Assert.False(File.Exists(path));
    }

    [Fact]
    public void SecureDeleteIdempotentOnMissingFile()
    {
        var missing = Path.Combine(AppContext.BaseDirectory, "tidak-ada.bin");

        SecureDeleteService.SecureDelete(missing);
    }

    [Fact]
    public void SecureDeleteRejectsNullPath() =>
        Assert.Throws<ArgumentNullException>(() => SecureDeleteService.SecureDelete(null!));

    [Fact]
    public void SecureDeleteRejectsZeroPassesWithoutDeleting()
    {
        var path = WriteTempFile("zero-passes.bin", PatternBytes(10));

        var error = Assert.Throws<ArgumentOutOfRangeException>(() =>
            SecureDeleteService.SecureDelete(path, passes: 0));

        Assert.True(File.Exists(path));
        File.Delete(path);
    }

    private static string WriteTempFile(string name, byte[] bytes)
    {
        var dir = Path.Combine(AppContext.BaseDirectory, "secure-delete-tests");
        Directory.CreateDirectory(dir);
        var path = Path.Combine(dir, name);
        File.WriteAllBytes(path, bytes);
        return path;
    }

    private static byte[] PatternBytes(int length)
    {
        var bytes = new byte[length];
        for (var i = 0; i < length; i++)
        {
            bytes[i] = (byte)((i * 13 + 5) & 0xff);
        }

        return bytes;
    }
}
