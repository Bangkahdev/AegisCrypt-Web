using Avalonia.Headless.XUnit;
using AegisCrypt.App.ViewModels;
using Xunit;

namespace AegisCrypt.App.Tests;

public class MainWindowTests
{
    [AvaloniaFact]
    public void WindowLoadsWithViewModel()
    {
        var window = new MainWindow();
        window.Show();

        Assert.Equal("AegisCrypt", window.Title);
        Assert.IsType<MainWindowViewModel>(window.DataContext);
        Assert.NotNull(window.DataContext);

        window.Close();
    }
}
