using System;
using System.Globalization;
using System.IO;
using System.Threading.Tasks;
using AegisCrypt.Core;

namespace AegisCrypt.App.ViewModels;

public enum OperationMode
{
    Encrypt,
    Decrypt,
}

public sealed class MainWindowViewModel : ObservableObject
{
    private OperationMode _mode = OperationMode.Encrypt;
    private string _inputPath = string.Empty;
    private string _outputPath = string.Empty;
    private string _password = string.Empty;
    private string _confirmPassword = string.Empty;
    private string _keyFilePath = string.Empty;
    private string _recoveryKey = string.Empty;
    private string _iterationsText = "600000";
    private string _chunkSizeText = "1048576";
    private string _statusMessage = string.Empty;
    private bool _saveFilename = true;
    private bool _overwriteExisting;
    private bool _hasError;
    private bool _isBusy;
    private double _progressPercent;

    public MainWindowViewModel()
    {
        RunCommand = new AsyncRelayCommand(RunAsync);
        GenerateRecoveryKeyCommand = new RelayCommand(GenerateRecoveryKey);
    }

    public AsyncRelayCommand RunCommand { get; }

    public RelayCommand GenerateRecoveryKeyCommand { get; }

    public OperationMode Mode
    {
        get => _mode;
        set
        {
            if (!SetProperty(ref _mode, value))
            {
                return;
            }

            OnPropertyChanged(nameof(IsEncryptMode));
            OnPropertyChanged(nameof(IsDecryptMode));
            OnPropertyChanged(nameof(RunLabel));
            SetStatus(string.Empty, false);
        }
    }

    public bool IsEncryptMode => _mode == OperationMode.Encrypt;

    public bool IsDecryptMode => _mode == OperationMode.Decrypt;

    public string RunLabel => IsEncryptMode ? "Enkripsi berkas" : "Dekripsi berkas";

    public string InputPath
    {
        get => _inputPath;
        set => SetProperty(ref _inputPath, value);
    }

    public string OutputPath
    {
        get => _outputPath;
        set => SetProperty(ref _outputPath, value);
    }

    public string Password
    {
        get => _password;
        set => SetProperty(ref _password, value);
    }

    public string ConfirmPassword
    {
        get => _confirmPassword;
        set => SetProperty(ref _confirmPassword, value);
    }

    public string KeyFilePath
    {
        get => _keyFilePath;
        set => SetProperty(ref _keyFilePath, value);
    }

    public string RecoveryKey
    {
        get => _recoveryKey;
        set => SetProperty(ref _recoveryKey, value);
    }

    public string IterationsText
    {
        get => _iterationsText;
        set => SetProperty(ref _iterationsText, value);
    }

    public string ChunkSizeText
    {
        get => _chunkSizeText;
        set => SetProperty(ref _chunkSizeText, value);
    }

    public bool SaveFilename
    {
        get => _saveFilename;
        set => SetProperty(ref _saveFilename, value);
    }

    public bool OverwriteExisting
    {
        get => _overwriteExisting;
        set => SetProperty(ref _overwriteExisting, value);
    }

    public string StatusMessage
    {
        get => _statusMessage;
        private set => SetProperty(ref _statusMessage, value);
    }

    public bool HasError
    {
        get => _hasError;
        private set => SetProperty(ref _hasError, value);
    }

    public bool IsBusy
    {
        get => _isBusy;
        private set => SetProperty(ref _isBusy, value);
    }

    public double ProgressPercent
    {
        get => _progressPercent;
        private set => SetProperty(ref _progressPercent, value);
    }

    public async Task RunAsync()
    {
        if (IsBusy)
        {
            return;
        }

        SetStatus(string.Empty, false);
        IsBusy = true;
        ProgressPercent = 0;

        try
        {
            var input = ValidateInput();
            var keyFile = LoadKeyFile();
            var recoveryKey = ParseRecoveryKey();

            if (IsEncryptMode)
            {
                await EncryptAsync(input, keyFile, recoveryKey);
            }
            else
            {
                await DecryptAsync(input, keyFile, recoveryKey);
            }
        }
        catch (Exception error)
        {
            SetStatus(error.Message, true);
        }
        finally
        {
            IsBusy = false;
        }
    }

    private async Task EncryptAsync(string input, byte[]? keyFile, byte[]? recoveryKey)
    {
        if (string.IsNullOrEmpty(Password))
        {
            throw new InvalidOperationException("Kata sandi wajib diisi.");
        }

        if (!string.Equals(Password, ConfirmPassword, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Konfirmasi kata sandi tidak cocok.");
        }

        var iterations = ParseInt(IterationsText, "Iterations");
        var chunkSize = ParseInt(ChunkSizeText, "Chunk size");
        var output = string.IsNullOrWhiteSpace(OutputPath)
            ? input + ".aegis"
            : Path.GetFullPath(OutputPath);

        if (IsSamePath(input, output))
        {
            throw new InvalidOperationException("Berkas masukan dan keluaran tidak boleh sama.");
        }

        EnsureOutputAvailable(output);

        var directory = Path.GetDirectoryName(output);
        if (!string.IsNullOrEmpty(directory))
        {
            Directory.CreateDirectory(directory);
        }

        var total = new FileInfo(input).Length;
        var progress = CreateProgress(total);
        var password = Password;
        var options = new EncryptOptions
        {
            Iterations = iterations,
            ChunkSize = chunkSize,
            Filename = SaveFilename ? Path.GetFileName(input) : null,
            RecoveryKey = recoveryKey,
            Progress = bytes => progress.Report(bytes),
        };

        await Task.Run(() =>
        {
            using var source = OpenRead(input);
            using var destination = File.Create(output);
            AegisCrypto.Encrypt(source, destination, password, keyFile, options);
        });

        ProgressPercent = 100;
        SetStatus($"Terenkripsi: {output}", false);
    }

    private async Task DecryptAsync(string input, byte[]? keyFile, byte[]? recoveryKey)
    {
        if (recoveryKey is null && string.IsNullOrEmpty(Password))
        {
            throw new InvalidOperationException("Isi kata sandi atau kunci recovery.");
        }

        var requested = string.IsNullOrWhiteSpace(OutputPath)
            ? null
            : Path.GetFullPath(OutputPath);
        var directory = Path.GetDirectoryName(input) ?? Directory.GetCurrentDirectory();
        var tempPath = Path.Combine(directory, $".aegiscrypt-{Guid.NewGuid():N}.tmp");

        try
        {
            var total = new FileInfo(input).Length;
            var progress = CreateProgress(total);
            var password = Password;

            var result = await Task.Run(() =>
            {
                using var source = OpenRead(input);
                using var destination = File.Create(tempPath);
                return AegisCrypto.Decrypt(
                    source,
                    destination,
                    password,
                    keyFile,
                    recoveryKey,
                    bytes => progress.Report(bytes));
            });

            var finalPath = requested ?? Path.Combine(
                directory,
                ResolveDecryptName(input, result.Filename));

            if (IsSamePath(input, finalPath))
            {
                throw new InvalidOperationException("Berkas masukan dan keluaran tidak boleh sama.");
            }

            EnsureOutputAvailable(finalPath);
            File.Move(tempPath, finalPath, true);

            ProgressPercent = 100;
            SetStatus(
                result.LegacyV2
                    ? $"Terdekripsi (format v2): {finalPath}"
                    : $"Terdekripsi: {finalPath}",
                false);
        }
        finally
        {
            if (File.Exists(tempPath))
            {
                File.Delete(tempPath);
            }
        }
    }

    private string ValidateInput()
    {
        if (string.IsNullOrWhiteSpace(InputPath))
        {
            throw new InvalidOperationException("Pilih berkas masukan terlebih dahulu.");
        }

        var path = Path.GetFullPath(InputPath);
        if (!File.Exists(path))
        {
            throw new InvalidOperationException($"Berkas tidak ditemukan: {path}");
        }

        return path;
    }

    private byte[]? LoadKeyFile()
    {
        if (string.IsNullOrWhiteSpace(KeyFilePath))
        {
            return null;
        }

        var path = Path.GetFullPath(KeyFilePath);
        if (!File.Exists(path))
        {
            throw new InvalidOperationException($"Berkas kunci tidak ditemukan: {path}");
        }

        return File.ReadAllBytes(path);
    }

    private byte[]? ParseRecoveryKey()
    {
        if (string.IsNullOrWhiteSpace(RecoveryKey))
        {
            return null;
        }

        return RecoveryKeyCodec.Parse(RecoveryKey)
            ?? throw new InvalidOperationException(
                "Kunci recovery harus 64 digit heksadesimal (32 byte).");
    }

    private void GenerateRecoveryKey()
    {
        RecoveryKey = RecoveryKeyCodec.Encode(AegisCrypto.GenerateRecoveryKey());
    }

    private void EnsureOutputAvailable(string path)
    {
        if (File.Exists(path) && !OverwriteExisting)
        {
            throw new InvalidOperationException(
                $"Berkas keluaran sudah ada: {path}. Aktifkan 'Timpa berkas' untuk menimpanya.");
        }
    }

    private static bool IsSamePath(string left, string right) =>
        string.Equals(
            Path.GetFullPath(left),
            Path.GetFullPath(right),
            StringComparison.OrdinalIgnoreCase);

    private static int ParseInt(string value, string label)
    {
        if (!int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
        {
            throw new InvalidOperationException($"{label} harus berupa bilangan bulat.");
        }

        return parsed;
    }

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

    private IProgress<long> CreateProgress(long total) =>
        new Progress<long>(bytes =>
            ProgressPercent = total <= 0
                ? 100
                : Math.Clamp(bytes * 100.0 / total, 0, 100));

    private static FileStream OpenRead(string path) =>
        new(path, FileMode.Open, FileAccess.Read, FileShare.Read, 1 << 16, FileOptions.SequentialScan);

    private void SetStatus(string message, bool isError)
    {
        StatusMessage = message;
        HasError = isError;
    }
}
