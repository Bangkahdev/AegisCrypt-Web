namespace AegisCrypt.Core;

public sealed class AegisFormatException(string message) : Exception(message);

public static class AegisErrors
{
    public const string Format = "Format file tidak valid (.aegis tidak dikenali).";
    public const string Kdf = "KDF tidak didukung oleh versi aplikasi ini.";
    public const string Iterations = "Parameter iterasi KDF di luar batas yang diizinkan.";
    public const string ChunkSize = "Ukuran chunk di luar batas yang diizinkan.";
    public const string Flags = "Header memuat flag yang tidak dikenal.";
    public const string FilenameMetadata = "Metadata nama berkas rusak atau tidak valid.";
    public const string Truncated = "Berkas terpotong atau tidak lengkap.";
    public const string MissingFinal = "Record final tidak ditemukan; berkas mungkin terpotong.";
    public const string Trailing = "Terdapat data setelah record final; berkas dimanipulasi.";
    public const string Record = "Struktur record tidak valid; berkas dimanipulasi atau rusak.";
    public const string Tampered = "Autentikasi berkas gagal; data dimanipulasi atau rusak.";
    public const string Credentials = "Kata sandi atau keyfile salah.";
    public const string RecoveryMissing = "Berkas ini tidak memiliki slot recovery.";
    public const string RecoveryKey = "Kunci recovery salah atau slot rusak.";
    public const string LegacyCorrupt = "Berkas corrupt: struktur v2 tidak valid.";
    public const string Cancelled = "Operation Cancelled";

    public static string Version(int version) =>
        $"Versi file tidak didukung (v{version}). Perbarui aplikasi.";
}
