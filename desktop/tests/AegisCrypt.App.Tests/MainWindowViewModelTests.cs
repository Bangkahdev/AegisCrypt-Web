using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using AegisCrypt.App.ViewModels;
using AegisCrypt.Core;
using Xunit;

namespace AegisCrypt.App.Tests;

public sealed class MainWindowViewModelTests : IDisposable
{
    private readonly string _workspace;

    public MainWindowViewModelTests()
    {
        _workspace = Path.Combine(
            AppContext.BaseDirectory,
            "vm-tests",
            Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_workspace);
    }

    [Fact]
    public async Task EncryptThenDecryptRoundTrips()
    {
        var source = WriteFile("plain.bin", PatternBytes(70_000));
        var container = Workspace("plain.bin.aegis");
        var restored = Workspace("restored.bin");

        var encrypt = EncryptViewModel(source, container);
        await encrypt.RunAsync();

        Assert.False(encrypt.HasError, encrypt.StatusMessage);
        Assert.True(File.Exists(container));

        var decrypt = new MainWindowViewModel
        {
            Mode = OperationMode.Decrypt,
            InputPath = container,
            OutputPath = restored,
            Password = "sandi-uji",
        };
        await decrypt.RunAsync();

        Assert.False(decrypt.HasError, decrypt.StatusMessage);
        Assert.Equal(File.ReadAllBytes(source), File.ReadAllBytes(restored));
    }

    [Fact]
    public async Task DecryptWithoutOutputUsesEmbeddedFilename()
    {
        var source = WriteFile("dokumen.txt", Encoding.UTF8.GetBytes("isi rahasia"));
        var container = Workspace("dokumen.txt.aegis");

        var encrypt = EncryptViewModel(source, container);
        await encrypt.RunAsync();
        Assert.False(encrypt.HasError, encrypt.StatusMessage);

        File.Delete(source);

        var decrypt = new MainWindowViewModel
        {
            Mode = OperationMode.Decrypt,
            InputPath = container,
            Password = "sandi-uji",
        };
        await decrypt.RunAsync();

        Assert.False(decrypt.HasError, decrypt.StatusMessage);
        Assert.Equal(Encoding.UTF8.GetBytes("isi rahasia"), File.ReadAllBytes(source));
    }

    [Fact]
    public async Task PasswordConfirmationMustMatch()
    {
        var source = WriteFile("plain.bin", PatternBytes(128));
        var container = Workspace("plain.bin.aegis");

        var viewModel = EncryptViewModel(source, container);
        viewModel.ConfirmPassword = "beda";

        await viewModel.RunAsync();

        Assert.True(viewModel.HasError);
        Assert.Contains("tidak cocok", viewModel.StatusMessage, StringComparison.OrdinalIgnoreCase);
        Assert.False(File.Exists(container));
    }

    [Fact]
    public async Task ExistingOutputRequiresOverwriteFlag()
    {
        var source = WriteFile("plain.bin", PatternBytes(256));
        var container = Workspace("plain.bin.aegis");

        var encrypt = EncryptViewModel(source, container);
        await encrypt.RunAsync();
        Assert.False(encrypt.HasError, encrypt.StatusMessage);

        var decrypt = new MainWindowViewModel
        {
            Mode = OperationMode.Decrypt,
            InputPath = container,
            OutputPath = source,
            Password = "sandi-uji",
        };

        await decrypt.RunAsync();
        Assert.True(decrypt.HasError);
        Assert.Contains("sudah ada", decrypt.StatusMessage, StringComparison.OrdinalIgnoreCase);

        decrypt.OverwriteExisting = true;
        await decrypt.RunAsync();
        Assert.False(decrypt.HasError, decrypt.StatusMessage);
        Assert.Equal(PatternBytes(256), File.ReadAllBytes(source));
    }

    [Fact]
    public async Task RecoveryKeyUnlocksContainerWithoutPassword()
    {
        var source = WriteFile("arsip.bin", PatternBytes(1_500));
        var container = Workspace("arsip.bin.aegis");
        var restored = Workspace("arsip-restored.bin");

        var encrypt = EncryptViewModel(source, container);
        encrypt.GenerateRecoveryKeyCommand.Execute(null);
        Assert.False(string.IsNullOrWhiteSpace(encrypt.RecoveryKey));

        await encrypt.RunAsync();
        Assert.False(encrypt.HasError, encrypt.StatusMessage);

        var header = File.ReadAllBytes(container);
        Assert.Equal(
            AegisConstants.FlagRecovery | AegisConstants.FlagFilename,
            header[7]);

        var decrypt = new MainWindowViewModel
        {
            Mode = OperationMode.Decrypt,
            InputPath = container,
            OutputPath = restored,
            RecoveryKey = encrypt.RecoveryKey,
        };
        await decrypt.RunAsync();

        Assert.False(decrypt.HasError, decrypt.StatusMessage);
        Assert.Equal(File.ReadAllBytes(source), File.ReadAllBytes(restored));
    }

    [Fact]
    public async Task WrongKeyFileIsReported()
    {
        var source = WriteFile("plain.bin", PatternBytes(300));
        var keyFileA = WriteFile("kunci-a.bin", Encoding.UTF8.GetBytes("kunci-a"));
        var keyFileB = WriteFile("kunci-b.bin", Encoding.UTF8.GetBytes("kunci-b"));
        var container = Workspace("plain.bin.aegis");
        var restored = Workspace("restored.bin");

        var encrypt = EncryptViewModel(source, container);
        encrypt.KeyFilePath = keyFileA;
        await encrypt.RunAsync();
        Assert.False(encrypt.HasError, encrypt.StatusMessage);

        var decrypt = new MainWindowViewModel
        {
            Mode = OperationMode.Decrypt,
            InputPath = container,
            OutputPath = restored,
            Password = "sandi-uji",
            KeyFilePath = keyFileB,
        };
        await decrypt.RunAsync();

        Assert.True(decrypt.HasError);
        Assert.Equal(AegisErrors.Credentials, decrypt.StatusMessage);
    }

    [Fact]
    public async Task MissingInputIsReported()
    {
        var viewModel = new MainWindowViewModel
        {
            InputPath = Workspace("tidak-ada.bin"),
            Password = "x",
            ConfirmPassword = "x",
        };

        await viewModel.RunAsync();

        Assert.True(viewModel.HasError);
        Assert.Contains("tidak ditemukan", viewModel.StatusMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task InvalidRecoveryKeyIsReported()
    {
        var source = WriteFile("plain.bin", PatternBytes(32));
        var viewModel = EncryptViewModel(source, Workspace("plain.bin.aegis"));
        viewModel.RecoveryKey = "bukan-hex";

        await viewModel.RunAsync();

        Assert.True(viewModel.HasError);
        Assert.Contains("heksadesimal", viewModel.StatusMessage, StringComparison.OrdinalIgnoreCase);
    }

    public void Dispose()
    {
        try
        {
            Directory.Delete(_workspace, true);
        }
        catch (IOException)
        {
        }
    }

    private static MainWindowViewModel EncryptViewModel(string source, string container) => new()
    {
        InputPath = source,
        OutputPath = container,
        Password = "sandi-uji",
        ConfirmPassword = "sandi-uji",
        ChunkSizeText = "65536",
    };

    private string Workspace(string name) => Path.Combine(_workspace, name);

    private string WriteFile(string name, byte[] bytes)
    {
        var path = Workspace(name);
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
