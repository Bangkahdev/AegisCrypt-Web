using System.IO;
using System.Security.Cryptography;

namespace AegisCrypt.Core;

/// <summary>
/// Menimpa isi berkas dengan byte acak sebelum menghapusnya, sehingga isi
/// asli tidak tersisa di berkas yang dihapus. Catatan: pada SSD/flash memory
/// overwrite di tempat tidak menjamin pemadaman berkas fisik karena wear
/// leveling; gunakan enkripsi penuh berkas sebagai lapisan utama.
/// </summary>
public static class SecureDeleteService
{
    private const int CopyBufferLength = 65_536;

    public static void SecureDelete(string path, int passes = 1)
    {
        ArgumentNullException.ThrowIfNull(path);
        if (passes < 1)
        {
            throw new ArgumentOutOfRangeException(nameof(passes), "Passes harus minimal 1.");
        }

        if (!File.Exists(path))
        {
            return;
        }

        var length = new FileInfo(path).Length;
        var buffer = new byte[Math.Min(length, CopyBufferLength)];
        using var rng = RandomNumberGenerator.Create();

        for (var pass = 0; pass < passes; pass++)
        {
            using var stream = File.Open(path, FileMode.Open, FileAccess.Write, FileShare.None);
            var remaining = length;
            while (remaining > 0)
            {
                var toWrite = (int)Math.Min(buffer.Length, remaining);
                rng.GetBytes(buffer.AsSpan(0, toWrite));
                stream.Write(buffer, 0, toWrite);
                remaining -= toWrite;
            }

            stream.SetLength(length);
            stream.Flush(true);
        }

        File.Delete(path);
    }
}
