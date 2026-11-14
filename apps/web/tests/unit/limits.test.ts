import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CRYPTO_CONSTANTS,
  HEADER_LENGTH,
  LEGACY_HEADER_LENGTH,
  MAX_RECORDS,
  RECORD_HEADER_LENGTH,
  RECOVERY_KEY_LENGTH,
} from "../../src/constants";

/**
 * Cross-implementation drift guard. The desktop implementation keeps its
 * constants in C#; a mismatch silently breaks interoperability even though
 * both test suites stay green.
 */
const desktopConstants = readFileSync(
  fileURLToPath(new URL("../../../desktop/src/AegisCrypt.Core/AegisConstants.cs", import.meta.url)),
  "utf8",
);

const readDesktopInt = (name: string): number => {
  const match = new RegExp(`public const (?:int|uint) ${name} = ([0-9_]+)`).exec(desktopConstants);
  if (!match) throw new Error(`missing desktop constant ${name}`);
  return Number.parseInt(match[1].replaceAll("_", ""), 10);
};

const readDesktopULong = (name: string): number => {
  const match = new RegExp(`public const ulong ${name} = ([0-9_]+)UL`).exec(desktopConstants);
  if (!match) throw new Error(`missing desktop constant ${name}`);
  return Number.parseInt(match[1].replaceAll("_", ""), 10);
};

describe("cross-implementation limits", () => {
  it("agrees on the record cap and documents it as a policy value", () => {
    expect(MAX_RECORDS).toBe(4_294_967_294);
    expect(readDesktopULong("MaxRecords")).toBe(MAX_RECORDS);
    expect(desktopConstants).toContain("FilenameMetadataIndex = ulong.MaxValue");
  });

  it("agrees on the KDF and chunk envelopes", () => {
    expect(readDesktopInt("IterationsDefault")).toBe(CRYPTO_CONSTANTS.PBKDF2_ITERATIONS);
    expect(readDesktopInt("IterationsMin")).toBe(CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MIN);
    expect(readDesktopInt("IterationsMax")).toBe(CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MAX);
    expect(readDesktopInt("ChunkSizeDefault")).toBe(CRYPTO_CONSTANTS.CHUNK_SIZE);
    expect(readDesktopInt("ChunkSizeMin")).toBe(CRYPTO_CONSTANTS.CHUNK_SIZE_MIN);
    expect(readDesktopInt("ChunkSizeMax")).toBe(CRYPTO_CONSTANTS.CHUNK_SIZE_MAX);
  });

  it("agrees on the container geometry", () => {
    expect(readDesktopInt("HeaderLength")).toBe(HEADER_LENGTH);
    expect(readDesktopInt("HeaderAadLength")).toBe(68);
    expect(readDesktopInt("RecordHeaderLength")).toBe(RECORD_HEADER_LENGTH);
    expect(readDesktopInt("SaltLength")).toBe(CRYPTO_CONSTANTS.SALT_LENGTH);
    expect(readDesktopInt("IvLength")).toBe(CRYPTO_CONSTANTS.IV_LENGTH);
    expect(readDesktopInt("TagLength")).toBe(CRYPTO_CONSTANTS.TAG_LENGTH_BYTES);
    expect(readDesktopInt("KeyLength")).toBe(CRYPTO_CONSTANTS.KEY_LENGTH / 8);
    expect(readDesktopInt("DekLength")).toBe(CRYPTO_CONSTANTS.DEK_LENGTH);
    expect(readDesktopInt("RecoveryKeyLength")).toBe(RECOVERY_KEY_LENGTH);
    expect(readDesktopInt("LegacyHeaderLength")).toBe(LEGACY_HEADER_LENGTH);
  });
});
