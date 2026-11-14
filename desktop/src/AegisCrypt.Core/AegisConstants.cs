namespace AegisCrypt.Core;

public static class AegisConstants
{
    public const int IterationsDefault = 600_000;
    public const int IterationsMin = 600_000;
    public const int IterationsMax = 5_000_000;
    public const int LegacyIterations = 100_000;

    public const int SaltLength = 32;
    public const int IvLength = 12;
    public const int TagLength = 16;
    public const int KeyLength = 32;
    public const int DekLength = 32;

    public const int ChunkSizeDefault = 1_048_576;
    public const int ChunkSizeMin = 65_536;
    public const int ChunkSizeMax = 16_777_216;

    public const int HeaderLength = 128;
    public const int HeaderAadLength = 68;

    public const int SaltOffset = 16;
    public const int FileIdOffset = 48;
    public const int FileIdLength = 16;
    public const int NoncePrefixOffset = 64;
    public const int NoncePrefixLength = 4;
    public const int WrapNonceOffset = 68;
    public const int WrappedDekOffset = 80;
    public const int WrapTagOffset = 112;

    public const byte FlagKeyFile = 0x01;
    public const byte FlagRecovery = 0x02;
    public const byte FlagFilename = 0x04;
    public const byte KnownFlags = FlagKeyFile | FlagRecovery | FlagFilename;

    public const int RecoverySlotLength = 60;
    public const int RecoverySlotOffset = HeaderLength;
    public const int RecoveryKeyLength = 32;
    public const int RecoveryNonceOffset = 0;
    public const int RecoveryWrappedDekOffset = 12;
    public const int RecoveryTagOffset = 44;
    public const int RecoveryAadLength = 5 + 1 + 8 + 16;

    public const int FilenameMaxLength = 1024;
    public const int FilenameLengthBytes = 2;
    public const ulong FilenameMetadataIndex = ulong.MaxValue;
    public const int FilenameAadLength = 36;

    public const int RecordHeaderLength = 5;
    public const byte RecordFlagFinal = 0x01;
    public const int RecordAadLength = 43;

    /// <summary>
    /// Maximum payload records per file/DEK (D1 provisional). Conservative
    /// product policy, not a direct SP 800-38D section 8.3 mandate: the nonce is
    /// a 96-bit deterministic construction (section 8.2.1, prefix + index), which
    /// section 8.3 explicitly exempts from its 2^32 invocation cap. The cap keeps
    /// invocations far below the 2^64 invocation field and reserves the final
    /// index for filename metadata. See docs/spec-aegis-v3.md sections 7 and 7.2.
    /// </summary>
    public const ulong MaxRecords = 4_294_967_294UL;

    public const int LegacyHeaderLength = 38;

    public const byte FileVersion = 3;
    public const byte LegacyVersion = 2;
    public const byte KdfPbkdf2Sha256 = 0x01;

    public static readonly byte[] FileMagic = "AEGIS"u8.ToArray();
    public static readonly byte[] RecoveryHkdfDomain = "AEGISRCV"u8.ToArray();
    public static readonly byte[] FilenameAadDomain = "AEGISFNM"u8.ToArray();
}
