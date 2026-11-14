using Avalonia;
using Avalonia.Headless;
using AvaloniaTestApp = AegisCrypt.App.App;

[assembly: AvaloniaTestApplication(typeof(AegisCrypt.App.Tests.TestAppBuilder))]

namespace AegisCrypt.App.Tests;

public static class TestAppBuilder
{
    public static AppBuilder BuildAvaloniaApp() =>
        AppBuilder.Configure<AvaloniaTestApp>()
            .UseHeadless(new AvaloniaHeadlessPlatformOptions());
}
