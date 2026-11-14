namespace AegisCrypt.Core;

/// <summary>
/// Formats and parses 256-bit recovery keys. Encoding is cosmetic: uppercase
/// hex in groups of eight characters separated by dashes. Parsing ignores
/// whitespace and dashes, matching the web implementation.
/// </summary>
public static class RecoveryKeyCodec
{
    public static string Encode(byte[] key)
    {
        ArgumentNullException.ThrowIfNull(key);
        if (key.Length != AegisConstants.RecoveryKeyLength)
        {
            throw new ArgumentException(
                $"Kunci recovery harus {AegisConstants.RecoveryKeyLength} byte.",
                nameof(key));
        }

        var hex = Convert.ToHexString(key);
        var groups = new string[hex.Length / 8];
        for (var i = 0; i < groups.Length; i++)
        {
            groups[i] = hex.Substring(i * 8, 8);
        }

        return string.Join('-', groups);
    }

    /// <summary>
    /// Returns null for anything that is not exactly 32 bytes of hex.
    /// </summary>
    public static byte[]? Parse(string? value)
    {
        if (value is null)
        {
            return null;
        }

        var clean = new string(value.Where(c => !char.IsWhiteSpace(c) && c != '-').ToArray());
        if (clean.Length != AegisConstants.RecoveryKeyLength * 2)
        {
            return null;
        }

        foreach (var c in clean)
        {
            if (!Uri.IsHexDigit(c))
            {
                return null;
            }
        }

        return Convert.FromHexString(clean);
    }
}
