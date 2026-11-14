export const CRYPTO_CONSTANTS = {
  /**
   * Default PBKDF2 iteration count for newly written v3 files.
   * v3 allows 600_000 .. 5_000_000 (stored in the header).
   */
  PBKDF2_ITERATIONS: 600_000,
  PBKDF2_ITERATIONS_MIN: 600_000,
  PBKDF2_ITERATIONS_MAX: 5_000_000,

  /** Fixed iteration count used by the legacy v2 format (not stored in header). */
  LEGACY_PBKDF2_ITERATIONS: 100_000,

  SALT_LENGTH: 32,
  IV_LENGTH: 12, // GCM nonce length (wrap nonce)
  TAG_LENGTH_BITS: 128,
  TAG_LENGTH_BYTES: 16,
  KEY_LENGTH: 256,
  DEK_LENGTH: 32,

  ALGORITHM_AES: "AES-GCM",
  ALGORITHM_KDF: "PBKDF2",
  HASH_ALGO: "SHA-256",

  /** Default chunk size for new v3 files. Allowed range is stored in the header. */
  CHUNK_SIZE: 1_048_576, // 1 MiB
  CHUNK_SIZE_MIN: 65_536, // 64 KiB
  CHUNK_SIZE_MAX: 16_777_216, // 16 MiB
} as const;

// ---------------------------------------------------------------------------
// Container constants
// ---------------------------------------------------------------------------

export const EXTENSION_ENCRYPTED = ".aegis";

export const FILE_MAGIC = new Uint8Array([0x41, 0x45, 0x47, 0x49, 0x53]); // "AEGIS"
export const FILE_VERSION = 3;
export const LEGACY_FILE_VERSION = 2;

/** KDF identifiers. 0x01 = PBKDF2-HMAC-SHA256. Others are reserved (e.g. Argon2id). */
export const KDF_ID_PBKDF2_SHA256 = 0x01;

// ---------------------------------------------------------------------------
// v3 fixed header layout (128 bytes, all integers big-endian)
// ---------------------------------------------------------------------------
//
//  0   5  magic "AEGIS"
//  5   1  version 0x03
//  6   1  KDF id
//  7   1  flags
//  8   4  PBKDF2 iterations (uint32 BE)
// 12   4  chunk size (uint32 BE)
// 16  32  salt
// 48  16  file id
// 64   4  per-file nonce prefix
// 68  12  wrap nonce
// 80  32  wrapped DEK
// 112 16  wrap GCM tag
//
export const HEADER_LENGTH = 128;
export const HEADER_AAD_LENGTH = 68; // bytes 0..67 authenticate the wrap

export const SALT_OFFSET = 16;
export const FILE_ID_OFFSET = 48;
export const FILE_ID_LENGTH = 16;
export const NONCE_PREFIX_OFFSET = 64;
export const NONCE_PREFIX_LENGTH = 4;
export const WRAP_NONCE_OFFSET = 68;
export const WRAPPED_DEK_OFFSET = 80;
export const WRAP_TAG_OFFSET = 112;

// Header flags
export const FLAG_KEYFILE = 0x01;
export const FLAG_RECOVERY = 0x02;
export const FLAG_FILENAME_METADATA = 0x04;
export const KNOWN_FLAGS = FLAG_KEYFILE | FLAG_RECOVERY | FLAG_FILENAME_METADATA;

// Recovery slot appended after the fixed header when bit1 is set. The DEK is
// wrapped under a KEK derived from a 256-bit recovery key (never stored in the
// container), bound to fileId so rewrap can copy the slot verbatim.
//
// Layout: nonce(12) + wrapped DEK(32) + tag(16).
export const RECOVERY_SLOT_LENGTH = 60;
export const RECOVERY_SLOT_OFFSET = HEADER_LENGTH;
export const RECOVERY_KEY_LENGTH = 32;
export const RECOVERY_NONCE_OFFSET = 0;
export const RECOVERY_WRAPPED_DEK_OFFSET = 12;
export const RECOVERY_TAG_OFFSET = 44;
export const RECOVERY_HKDF_DOMAIN = new Uint8Array([0x41, 0x45, 0x47, 0x49, 0x53, 0x52, 0x43, 0x56]); // "AEGISRCV"
export const RECOVERY_AAD_LENGTH = 5 + 1 + 8 + 16; // magic + version + domain + fileId

// ---------------------------------------------------------------------------
// Encrypted filename metadata (flag bit2)
// ---------------------------------------------------------------------------
//
// Layout, directly after the fixed header (and recovery slot when present):
//
//   length 2 bytes  uint16 BE, ciphertext length including the 16-byte tag
//   ciphertext+tag  UTF-8 filename bytes encrypted with the file DEK
//
// The metadata nonce uses the reserved index 2^64-1 so it can never collide
// with a payload record (records start at 0 and increment).
//
export const FILENAME_METADATA_MAX_LENGTH = 1024;
export const FILENAME_METADATA_LENGTH_BYTES = 2;
export const FILENAME_METADATA_INDEX = 0xffffffffffffffffn;
export const FILENAME_AAD_DOMAIN = new Uint8Array([0x41, 0x45, 0x47, 0x49, 0x53, 0x46, 0x4e, 0x4d]); // "AEGISFNM"
export const FILENAME_AAD_LENGTH = 36; // magic(5)+version(1)+fileId(16)+prefix(4)+domain(8)+length(2)

// ---------------------------------------------------------------------------
// v3 record layout
// ---------------------------------------------------------------------------
//
//  record header 5 bytes: flags(1, bit0=final) + ciphertext length(4, uint32 BE; includes tag)
//  nonce is derived: nonce = noncePrefix(4) || index(8, uint64 BE); never stored
//  AAD 43 bytes: magic(5) || version(1) || chunkSize(4) || fileId(16)
//                || noncePrefix(4) || recordHeader(5) || index(8)
//
export const RECORD_HEADER_LENGTH = 5;
export const RECORD_FLAG_FINAL = 0x01;
export const RECORD_KNOWN_FLAGS = RECORD_FLAG_FINAL;
export const RECORD_AAD_LENGTH = 43;

/**
 * Maximum number of payload records per file/DEK (D1 provisional).
 * Derived from the NIST SP 800-38D §8.3 invocation limit for 96-bit IVs with
 * deterministic construction (2^32), minus 2 for margin and the reserved
 * filename-metadata index. See docs/spec-aegis-v3.md §7.
 */
export const MAX_RECORDS = 4_294_967_294;

/** Legacy v2 header: magic(5) + version(1) + salt(32). */
export const LEGACY_HEADER_LENGTH = 38;
