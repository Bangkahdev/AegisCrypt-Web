using System.Threading.Tasks;
using Avalonia.Controls;
using Avalonia.Interactivity;
using Avalonia.Platform.Storage;
using AegisCrypt.App.ViewModels;

namespace AegisCrypt.App;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        DataContext = new MainWindowViewModel();
    }

    private MainWindowViewModel ViewModel => (MainWindowViewModel)DataContext!;

    private async void BrowseInput_Click(object? sender, RoutedEventArgs e)
    {
        var path = await PickOpenFileAsync("Pilih berkas masukan");
        if (path is not null)
        {
            ViewModel.InputPath = path;
        }
    }

    private async void BrowseOutput_Click(object? sender, RoutedEventArgs e)
    {
        var suggested = string.IsNullOrWhiteSpace(ViewModel.InputPath)
            ? "keluaran.aegis"
            : ViewModel.InputPath + ".aegis";
        var path = await PickSaveFileAsync("Simpan berkas keluaran", suggested);
        if (path is not null)
        {
            ViewModel.OutputPath = path;
        }
    }

    private async void BrowseKeyFile_Click(object? sender, RoutedEventArgs e)
    {
        var path = await PickOpenFileAsync("Pilih berkas kunci");
        if (path is not null)
        {
            ViewModel.KeyFilePath = path;
        }
    }

    private void GenerateRecoveryKey_Click(object? sender, RoutedEventArgs e) =>
        ViewModel.GenerateRecoveryKeyCommand.Execute(null);

    private void EncryptMode_Click(object? sender, RoutedEventArgs e) =>
        ViewModel.Mode = OperationMode.Encrypt;

    private void DecryptMode_Click(object? sender, RoutedEventArgs e) =>
        ViewModel.Mode = OperationMode.Decrypt;

    private async Task<string?> PickOpenFileAsync(string title)
    {
        var files = await StorageProvider.OpenFilePickerAsync(new FilePickerOpenOptions
        {
            Title = title,
            AllowMultiple = false,
        });

        return files.Count > 0 ? files[0].TryGetLocalPath() : null;
    }

    private async Task<string?> PickSaveFileAsync(string title, string suggestedName)
    {
        var file = await StorageProvider.SaveFilePickerAsync(new FilePickerSaveOptions
        {
            Title = title,
            SuggestedFileName = suggestedName,
            DefaultExtension = "aegis",
            ShowOverwritePrompt = true,
        });

        return file?.TryGetLocalPath();
    }
}
