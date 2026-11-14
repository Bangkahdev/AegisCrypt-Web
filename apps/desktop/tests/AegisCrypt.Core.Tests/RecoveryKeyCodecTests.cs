using AegisCrypt.Core;
using Xunit;

namespace AegisCrypt.Core.Tests;

public class RecoveryKeyCodecTests
{
    [Fact]
    public void EncodesUppercaseHexInEightCharacterGroups()
    {
        var key = Enumerable.Repeat((byte)0xAB, AegisConstants.RecoveryKeyLength).ToArray();

        var encoded = RecoveryKeyCodec.Encode(key);

        var groups = encoded.Split('-');
        Assert.Equal(8, groups.Length);
        Assert.All(groups, group => Assert.Equal(8, group.Length));
        Assert.All(groups, group => Assert.Equal("ABABABAB", group));
    }

    [Fact]
    public void ParsesGroupedKeyBackToTheSameBytes()
    {
        var key = Enumerable.Range(0, AegisConstants.RecoveryKeyLength)
            .Select(i => (byte)(i * 7))
            .ToArray();

        var parsed = RecoveryKeyCodec.Parse(RecoveryKeyCodec.Encode(key));

        Assert.Equal(key, parsed);
    }

    [Fact]
    public void ParsingIgnoresSeparatorsAndCase()
    {
        var key = Enumerable.Range(0, AegisConstants.RecoveryKeyLength)
            .Select(i => (byte)(255 - i))
            .ToArray();
        var spaced = string.Join(" ", RecoveryKeyCodec.Encode(key).ToLowerInvariant().Split('-'));

        Assert.Equal(key, RecoveryKeyCodec.Parse(spaced));
    }

    [Fact]
    public void ParsingRejectsMalformedInput()
    {
        Assert.Null(RecoveryKeyCodec.Parse(null));
        Assert.Null(RecoveryKeyCodec.Parse(string.Empty));
        Assert.Null(RecoveryKeyCodec.Parse("ABCDEF"));
        Assert.Null(RecoveryKeyCodec.Parse(new string('z', AegisConstants.RecoveryKeyLength * 2)));
        Assert.Null(RecoveryKeyCodec.Parse(new string('A', AegisConstants.RecoveryKeyLength * 2 - 1)));
    }

    [Fact]
    public void EncodingRejectsWrongKeyLength()
    {
        Assert.Throws<ArgumentException>(() => RecoveryKeyCodec.Encode(new byte[16]));
        Assert.Throws<ArgumentNullException>(() => RecoveryKeyCodec.Encode(null!));
    }
}
