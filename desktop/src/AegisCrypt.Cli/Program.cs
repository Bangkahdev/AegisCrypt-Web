using System.Globalization;
using System.Text;
using AegisCrypt.Core;

namespace AegisCrypt.Cli;

internal static class Program
{
    private const string Usage = """
        aegiscrypt - enkripsi berkas dengan format AegisCrypt v3

        PEMAKAIAN
          aegiscrypt encrypt <berkas> [opsi]
          aegiscrypt decrypt <berkas> [opsi]
          aegiscrypt rewrap  <berkas> -o <keluaran> [opsi]
          aegiscrypt keygen

        OPSI UMUM
          -o, --output <berkas>     Berkas keluaran (default: <berkas>.aegis saat enkripsi)
          --password <sandi>        Kata sandi; jika kosong akan diminta secara tersembunyi
          --keyfile <berkas>        Berkas kunci (byte mentah) sebagai faktor kedua
          --force                   Timpa berkas keluaran jika sudah ada

        OPSI ENKRIPSI
          --recovery-key <kunci>    Kunci recovery 32 byte (hex, boleh dengan tanda hubung)
          --filename <nama>         Nama berkas yang disimpan di dalam kontainer
          --no-filename             Jangan simpan nama berkas (default menyimpan nama asli)
          --iterations <n>          Iterasi PBKDF2 (600000..5000000, default 600000)
          --chunk-size <n>          Ukuran chunk (65536..16777216, default 1048576)

        OPSI DEKRIPSI
          --recovery-key <kunci>    Gunakan slot recovery, bukan kata sandi + keyfile

        OPSI REWRAP
          --old-password <sandi>    Kata sandi lama
          --new-password <sandi>    Kata sandi baru
          --old-keyfile <berkas>    Keyfile lama
          --new-keyfile <berkas>    Keyfile baru (kosong berarti tanpa keyfile)
          --iterations <n>          Iterasi PBKDF2 baru (default: pertahankan)

        CONTOH
          aegiscrypt encrypt laporan.pdf --password rahasia -o laporan.pdf.aegis
          aegiscrypt decrypt laporan.pdf.aegis
          aegiscrypt rewrap arsip.aegis -o arsip-baru.aegis --old-password lama --new-password baru
          aegiscrypt keygen
        """;

    internal static readonly HashSet<string> ValueOptions = new(StringComparer.Ordinal)
    {
        "-o",
        "--output",
        "--password",
        "--keyfile",
        "--recovery-key",
        "--filename",
        "--iterations",
        "--chunk-size",
        "--old-password",
        "--new-password",
        "--old-keyfile",
        "--new-keyfile",
    };

    private static int Main(string[] args)
    {
        if (args.Length == 0)
        {
            Console.Error.WriteLine(Usage);
            return 2;
        }

        try
        {
            var command = args[0];
            if (command is "-h" or "--help" or "help")
            {
                Console.WriteLine(Usage);
                return 0;
            }

            var parsed = ParsedArgs.Parse(args.AsSpan(1));
            if (parsed.Has("--help") || parsed.Has("-h"))
            {
                Console.WriteLine(Usage);
                return 0;
            }

            return command switch
            {
                "encrypt" => RunEncrypt(parsed),
                "decrypt" => RunDecrypt(parsed),
                "rewrap" => RunRewrap(parsed),
                "keygen" => RunKeygen(),
                _ => throw new UsageException($"Perintah tidak dikenal: {command}"),
            };
        }
        catch (UsageException error)
        {
            Console.Error.WriteLine($"Kesalahan pemakaian: {error.Message}");
            Console.Error.WriteLine("Jalankan 'aegiscrypt help' untuk bantuan.");
            return 2;
        }
        catch (AegisFormatException error)
        {
            Console.Error.WriteLine($"Kesalahan: {error.Message}");
            return 1;
        }
        catch (IOException error)
        {
            Console.Error.WriteLine($"Kesalahan I/O: {error.Message}");
            return 1;
        }
        catch (UnauthorizedAccessException error)
        {
            Console.Error.WriteLine($"Akses ditolak: {error.Message}");
            return 1;
        }
    }

    private static int RunEncrypt(ParsedArgs parsed)
    {
        var inputPath = RequireSingleInput(parsed);
        var outputPath = parsed.Value("--output") ?? parsed.Value("-o") ?? inputPath + ".aegis";
        RefuseSamePath(inputPath, outputPath);
        EnsureWritable(outputPath, parsed);

        var password = ResolvePassword(parsed, "--password", "Kata sandi: ");
        var keyFile = ReadKeyFile(parsed.Value("--keyfile"));
        var recoveryKey = ParseRecoveryKey(parsed.Value("--recovery-key"));

        var filename = parsed.Has("--no-filename")
            ? null
            : parsed.Value("--filename") ?? Path.GetFileName(inputPath);

        var options = new EncryptOptions
        {
            Iterations = ParseInt(parsed.Value("--iterations"), AegisConstants.IterationsDefault, "iterations"),
            ChunkSize = ParseInt(parsed.Value("--chunk-size"), AegisConstants.ChunkSizeDefault, "chunk size"),
            Filename = filename,
            RecoveryKey = recoveryKey,
        };

        using var input = OpenRead(inputPath);
        using var output = File.Create(Path.GetFullPath(outputPath));
        AegisCrypto.Encrypt(input, output, password, keyFile, options);

        Console.WriteLine($"Terenkripsi: {Path.GetFullPath(outputPath)}");
        return 0;
    }

    private static int RunDecrypt(ParsedArgs parsed)
    {
        var inputPath = RequireSingleInput(parsed);
        var requestedOutput = parsed.Value("--output") ?? parsed.Value("-o");
        if (requestedOutput is not null)
        {
            RefuseSamePath(inputPath, requestedOutput);
        }

        var recoveryKey = ParseRecoveryKey(parsed.Value("--recovery-key"));
        var password = recoveryKey is null
            ? ResolvePassword(parsed, "--password", "Kata sandi: ")
            : string.Empty;

        var keyFile = ReadKeyFile(parsed.Value("--keyfile"));

        var directory = Path.GetDirectoryName(inputPath) ?? Directory.GetCurrentDirectory();
        var tempPath = Path.Combine(directory, $".aegiscrypt-{Guid.NewGuid():N}.tmp");

        try
        {
            DecryptResult result;
            using (var input = OpenRead(inputPath))
            using (var output = File.Create(tempPath))
            {
                result = AegisCrypto.Decrypt(input, output, password, keyFile, recoveryKey);
            }

            var finalPath = requestedOutput is null
                ? Path.Combine(directory, ResolveDecryptName(inputPath, result.Filename))
                : Path.GetFullPath(requestedOutput);
            EnsureWritable(finalPath, parsed);

            File.Move(tempPath, finalPath, true);
            Console.WriteLine($"Terdekripsi: {finalPath}");
            if (result.LegacyV2)
            {
                Console.Error.WriteLine("Catatan: kontainer v2 (lama); pertimbangkan rewrap ke format v3.");
            }

            return 0;
        }
        finally
        {
            if (File.Exists(tempPath))
            {
                File.Delete(tempPath);
            }
        }
    }

    private static int RunRewrap(ParsedArgs parsed)
    {
        var inputPath = RequireSingleInput(parsed);
        var outputPath = parsed.Value("--output") ?? parsed.Value("-o")
            ?? throw new UsageException("rewrap memerlukan -o/--output.");
        EnsureWritable(outputPath, parsed);

        var oldPassword = ResolvePassword(parsed, "--old-password", "Kata sandi lama: ");
        var newPassword = ResolvePassword(parsed, "--new-password", "Kata sandi baru: ");
        var oldKeyFile = ReadKeyFile(parsed.Value("--old-keyfile"));
        var newKeyFile = ReadKeyFile(parsed.Value("--new-keyfile"));
        var iterations = parsed.Value("--iterations") is null
            ? (int?)null
            : ParseInt(parsed.Value("--iterations"), AegisConstants.IterationsDefault, "iterations");

        var directory = Path.GetDirectoryName(Path.GetFullPath(outputPath))
            ?? Directory.GetCurrentDirectory();
        var tempPath = Path.Combine(directory, $".aegiscrypt-{Guid.NewGuid():N}.tmp");

        try
        {
            using (var input = OpenRead(inputPath))
            using (var output = File.Create(tempPath))
            {
                AegisCrypto.Rewrap(
                    input,
                    output,
                    oldPassword,
                    oldKeyFile,
                    newPassword,
                    newKeyFile,
                    iterations);
            }

            var finalPath = Path.GetFullPath(outputPath);
            File.Move(tempPath, finalPath, true);
            Console.WriteLine($"Direwrap: {finalPath}");
            return 0;
        }
        finally
        {
            if (File.Exists(tempPath))
            {
                File.Delete(tempPath);
            }
        }
    }

    private static int RunKeygen()
    {
        var key = AegisCrypto.GenerateRecoveryKey();
        Console.WriteLine(RecoveryKeyCodec.Encode(key));
        return 0;
    }

    private static string RequireSingleInput(ParsedArgs parsed)
    {
        if (parsed.Positionals.Count == 0)
        {
            throw new UsageException("Berkas masukan belum diberikan.");
        }

        if (parsed.Positionals.Count > 1)
        {
            throw new UsageException("Hanya satu berkas masukan yang diperbolehkan.");
        }

        var path = Path.GetFullPath(parsed.Positionals[0]);
        if (!File.Exists(path))
        {
            throw new UsageException($"Berkas tidak ditemukan: {path}");
        }

        return path;
    }

    private static void EnsureWritable(string path, ParsedArgs parsed)
    {
        var full = Path.GetFullPath(path);
        if (File.Exists(full) && !parsed.Has("--force"))
        {
            throw new UsageException($"Berkas keluaran sudah ada: {full} (gunakan --force untuk menimpa).");
        }
    }

    private static void RefuseSamePath(string inputPath, string outputPath)
    {
        var inputFull = Path.GetFullPath(inputPath);
        var outputFull = Path.GetFullPath(outputPath);
        if (string.Equals(inputFull, outputFull, StringComparison.OrdinalIgnoreCase))
        {
            throw new UsageException("Berkas masukan dan keluaran tidak boleh sama.");
        }
    }

    private static string ResolvePassword(ParsedArgs parsed, string option, string prompt)
    {
        var direct = parsed.Value(option);
        return direct ?? ReadPassword(prompt);
    }

    private static int ParseInt(string? value, int fallback, string label)
    {
        if (value is null)
        {
            return fallback;
        }

        if (!int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
        {
            throw new UsageException($"{label} harus berupa bilangan bulat.");
        }

        return parsed;
    }

    private static byte[]? ParseRecoveryKey(string? value)
    {
        if (value is null)
        {
            return null;
        }

        return RecoveryKeyCodec.Parse(value)
            ?? throw new UsageException("Kunci recovery harus 64 digit heksadesimal (32 byte).");
    }

    private static byte[]? ReadKeyFile(string? path) => path is null ? null : File.ReadAllBytes(path);

    private static string ResolveDecryptName(string inputPath, string? embeddedFilename)
    {
        if (!string.IsNullOrEmpty(embeddedFilename))
        {
            var candidate = Path.GetFileName(embeddedFilename);
            if (!string.IsNullOrEmpty(candidate) && candidate is not "." and not "..")
            {
                return candidate;
            }
        }

        var name = Path.GetFileName(inputPath);
        if (name.EndsWith(".aegis", StringComparison.OrdinalIgnoreCase))
        {
            name = name[..^".aegis".Length];
        }

        return string.IsNullOrEmpty(name) ? "decrypted.bin" : name;
    }

    private static string ReadPassword(string prompt)
    {
        Console.Error.Write(prompt);

        if (Console.IsInputRedirected)
        {
            var line = Console.In.ReadLine() ?? string.Empty;
            Console.Error.WriteLine();
            return line;
        }

        var builder = new StringBuilder();
        while (true)
        {
            var key = Console.ReadKey(true);
            switch (key.Key)
            {
                case ConsoleKey.Enter:
                    Console.Error.WriteLine();
                    return builder.ToString();
                case ConsoleKey.Backspace:
                    if (builder.Length > 0)
                    {
                        builder.Length--;
                    }

                    break;
                default:
                    if (!char.IsControl(key.KeyChar))
                    {
                        builder.Append(key.KeyChar);
                    }

                    break;
            }
        }
    }

    private static FileStream OpenRead(string path) =>
        new(path, FileMode.Open, FileAccess.Read, FileShare.Read, 1 << 16, FileOptions.SequentialScan);
}

internal sealed class UsageException(string message) : Exception(message);

internal sealed class ParsedArgs
{
    private readonly Dictionary<string, string?> _options = new(StringComparer.Ordinal);
    private readonly List<string> _positionals = new();

    public IReadOnlyList<string> Positionals => _positionals;

    public static ParsedArgs Parse(ReadOnlySpan<string> args)
    {
        var result = new ParsedArgs();
        for (var i = 0; i < args.Length; i++)
        {
            var arg = args[i];
            if (!arg.StartsWith('-') || arg == "-")
            {
                result._positionals.Add(arg);
                continue;
            }

            if (arg is "-h" or "--help" or "--no-filename" or "--force")
            {
                result._options[arg] = null;
                continue;
            }

            if (!Program.ValueOptions.Contains(arg))
            {
                throw new UsageException($"Opsi tidak dikenal: {arg}");
            }

            if (i + 1 >= args.Length)
            {
                throw new UsageException($"Opsi {arg} memerlukan nilai.");
            }

            result._options[arg] = args[++i];
        }

        return result;
    }

    public bool Has(string name) => _options.ContainsKey(name);

    public string? Value(string name) => _options.TryGetValue(name, out var value) ? value : null;
}

