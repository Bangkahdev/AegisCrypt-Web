import { describe, expect, it } from "vitest";
import { CRYPTO_CONSTANTS, LEGACY_HEADER_LENGTH, LEGACY_FILE_VERSION } from "../src/constants";
import { AegisError, processFileDecrypt } from "../src/services/cryptoService";
import { buildLegacyV2, makeRng, patternBytes, type Bytes } from "./helpers";

const LEGACY_CHUNK = CRYPTO_CONSTANTS.CHUNK_SIZE_MIN;

const ivsFor = (count: number, seed = 5): Bytes[] => {
  const rng = makeRng(seed);
  return Array.from({ length: count }, () => rng(CRYPTO_CONSTANTS.IV_LENGTH));
};

const decrypt = (bytes: Bytes, password = "legacy-pw", keyFile: ArrayBuffer | null = null) =>
  processFileDecrypt(new Blob([bytes]), password, keyFile, new AbortController().signal, () => {});

describe("legacy v2 reader", () => {
  it("reads a v2 container produced by an independent encoder", async () => {
    const plaintext = patternBytes(LEGACY_CHUNK * 2 + 77, 3);
    const salt = makeRng(11)(32);
    const bytes = await buildLegacyV2(
      plaintext,
      "legacy-pw",
      salt,
      ivsFor(3),
      LEGACY_CHUNK,
    );
    expect(bytes[5]).toBe(LEGACY_FILE_VERSION);

    const out = await decrypt(bytes);
    expect(new Uint8Array(await out.arrayBuffer())).toEqual(plaintext);
  });

  it("reads an empty v2 container as an empty file", async () => {
    const bytes = await buildLegacyV2(new Uint8Array(0), "legacy-pw", makeRng(1)(32), []);
    expect(bytes.byteLength).toBe(LEGACY_HEADER_LENGTH);
    const out = await decrypt(bytes);
    expect(out.size).toBe(0);
  });

  it("reads v2 files that use a keyfile", async () => {
    const keyFile = new TextEncoder().encode("legacy keyfile").buffer;
    const plaintext = patternBytes(500, 2);
    const bytes = await buildLegacyV2(
      plaintext,
      "legacy-pw",
      makeRng(4)(32),
      ivsFor(1, 9),
      LEGACY_CHUNK,
      keyFile,
    );
    const out = await decrypt(bytes, "legacy-pw", keyFile);
    expect(new Uint8Array(await out.arrayBuffer())).toEqual(plaintext);

    await expect(decrypt(bytes, "legacy-pw", null)).rejects.toThrow(AegisError.credentials);
  });

  it("rejects the wrong password", async () => {
    const bytes = await buildLegacyV2(patternBytes(64), "legacy-pw", makeRng(2)(32), ivsFor(1));
    await expect(decrypt(bytes, "wrong")).rejects.toThrow(AegisError.credentials);
  });

  it("rejects a truncated header", async () => {
    const bytes = await buildLegacyV2(patternBytes(0), "legacy-pw", makeRng(2)(32), []);
    await expect(decrypt(bytes.slice(0, 20))).rejects.toThrow(AegisError.truncated);
  });

  it("rejects a partially written length prefix", async () => {
    const bytes = await buildLegacyV2(patternBytes(10), "legacy-pw", makeRng(2)(32), ivsFor(1));
    await expect(decrypt(bytes.slice(0, LEGACY_HEADER_LENGTH + 2))).rejects.toThrow(
      AegisError.legacyCorrupt,
    );
  });

  it("rejects a zero or negative chunk length", async () => {
    const zero = await buildLegacyV2(patternBytes(10), "legacy-pw", makeRng(2)(32), ivsFor(1));
    new DataView(zero.buffer).setInt32(LEGACY_HEADER_LENGTH, 0, true);
    await expect(decrypt(zero)).rejects.toThrow(AegisError.legacyCorrupt);

    const negative = await buildLegacyV2(patternBytes(10), "legacy-pw", makeRng(2)(32), ivsFor(1));
    new DataView(negative.buffer).setInt32(LEGACY_HEADER_LENGTH, -1, true);
    await expect(decrypt(negative)).rejects.toThrow(AegisError.legacyCorrupt);
  });

  it("rejects a chunk length larger than the remaining payload", async () => {
    const bytes = await buildLegacyV2(patternBytes(100), "legacy-pw", makeRng(2)(32), ivsFor(1));
    new DataView(bytes.buffer).setInt32(LEGACY_HEADER_LENGTH, 5000, true);
    await expect(decrypt(bytes)).rejects.toThrow(AegisError.legacyCorrupt);
  });

  it("rejects an unknown magic even when the version byte is 2", async () => {
    const bytes = await buildLegacyV2(patternBytes(10), "legacy-pw", makeRng(2)(32), ivsFor(1));
    bytes[0] = 0x42;
    await expect(decrypt(bytes)).rejects.toThrow(AegisError.format);
  });

  it("rejects a v2 container carrying an unsupported version", async () => {
    const bytes = await buildLegacyV2(patternBytes(10), "legacy-pw", makeRng(2)(32), ivsFor(1));
    bytes[5] = 1;
    await expect(decrypt(bytes)).rejects.toThrow(AegisError.version(1));
  });

  it("rejects trailing bytes after the last record", async () => {
    const bytes = await buildLegacyV2(patternBytes(100), "legacy-pw", makeRng(2)(32), ivsFor(1));
    const withTrailing = new Uint8Array(bytes.byteLength + 1);
    withTrailing.set(bytes);
    await expect(decrypt(withTrailing)).rejects.toThrow(AegisError.legacyCorrupt);
  });

  it("rejects a corrupt v2 payload without emitting output", async () => {
    const bytes = await buildLegacyV2(patternBytes(100), "legacy-pw", makeRng(2)(32), ivsFor(1));
    bytes[LEGACY_HEADER_LENGTH + 4 + CRYPTO_CONSTANTS.IV_LENGTH + 3] ^= 0xff;
    await expect(decrypt(bytes)).rejects.toThrow(AegisError.credentials);
  });
});
