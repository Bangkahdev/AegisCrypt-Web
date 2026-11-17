using AegisCrypt.Core;
using Xunit;

namespace AegisCrypt.Core.Tests;

public class DekBudgetTests
{
    [Fact]
    public void AllowsExactlyMaxDekBytes()
    {
        var next = AegisCrypto.AccumulateDekBytes(0, AegisConstants.MaxDekBytes);
        Assert.Equal(AegisConstants.MaxDekBytes, next);
    }

    [Fact]
    public void RejectsOneByteOverMaxDekBytes()
    {
        Assert.Throws<AegisFormatException>(() =>
            AegisCrypto.AccumulateDekBytes(AegisConstants.MaxDekBytes, 1));
    }

    [Fact]
    public void RejectsOverflow()
    {
        Assert.Throws<AegisFormatException>(() =>
            AegisCrypto.AccumulateDekBytes(ulong.MaxValue, 1));
    }

    [Fact]
    public void AccumulatesAcrossRecordsUpToBoundary()
    {
        var used = 0UL;
        var perRecord = (ulong)(AegisConstants.ChunkSizeDefault + AegisConstants.RecordAadLength);
        var count = (long)(AegisConstants.MaxDekBytes / perRecord);

        for (var i = 0; i < count; i++)
        {
            used = AegisCrypto.AccumulateDekBytes(used, perRecord);
        }

        Assert.True(used <= AegisConstants.MaxDekBytes);
        Assert.Throws<AegisFormatException>(() =>
            AegisCrypto.AccumulateDekBytes(used, perRecord));
    }
}
