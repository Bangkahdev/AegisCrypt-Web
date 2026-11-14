import { describe, expect, it } from "vitest";
import {
  CRYPTO_CONSTANTS,
  FILE_ID_OFFSET,
  FILE_MAGIC,
  FILE_VERSION,
  HEADER_LENGTH,
  KDF_ID_PBKDF2_SHA256,
  MAX_RECORDS,
  NONCE_PREFIX_OFFSET,
  RECORD_HEADER_LENGTH,
  SALT_OFFSET,
  WRAPPED_DEK_OFFSET,
  WRAP_TAG_OFFSET,
} from "../../src/constants";
import {
  AegisError,
  processFileDecrypt,
  processFileEncrypt,
  rewrapFile,
} from "../../src/services/cryptoService";
import { concat, listV3Records, makeRng, patternBytes, toBytes, type Bytes } from "../helpers";

const CHUNK = CRYPTO_CONSTANTS.CHUNK_SIZE_MIN;

describe("record limit (D1 provisional)", () => {
  it("caps records at 2^32 - 2 as decided in the frozen spec", () => {
    expect(MAX_RECORDS).toBe(4_294_967_294);
    expect(MAX_RECORDS).toBeLessThan(Number.MAX_SAFE_INTEGER);
    expect(MAX_RECORDS).toBe(2 ** 32 - 2);
  });
});
const FAST = { iterations: CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MIN, chunkSize: CHUNK };

const encrypt = async (data: Bytes, password = "pw", keyFile: ArrayBuffer | null = null) =>
  toBytes(
    await processFileEncrypt(
      new Blob([data]),
      password,
      keyFile,
      new AbortController().signal,
      () => {},
      FAST,
    ),
  );

const decryptBytes = async (bytes: Bytes, password = "pw", keyFile: ArrayBuffer | null = null) =>
  new Uint8Array(
    await (
      await processFileDecrypt(
        new Blob([bytes]),
        password,
        keyFile,
        new AbortController().signal,
        () => {},
      )
    ).arrayBuffer(),
  );

const tamper = (bytes: Bytes, offset: number, value: number): Bytes => {
  const copy = bytes.slice();
  copy[offset] = value;
  return copy;
};

const expectError = async (
  bytes: Bytes,
  message: string,
  password = "pw",
  keyFile: ArrayBuffer | null = null,
) => {
  await expect(
    processFileDecrypt(new Blob([bytes]), password, keyFile, new AbortController().signal, () => {}),
  ).rejects.toThrow(message);
};

describe("v3 header", () => {
  it("writes every documented field at its fixed offset", async () => {
    const bytes = await encrypt(patternBytes(700), "pw", new Uint8Array([1, 2, 3]).buffer);
    const view = new DataView(bytes.buffer, bytes.byteOffset, HEADER_LENGTH);

    expect(Array.from(bytes.slice(0, 5))).toEqual(Array.from(FILE_MAGIC));
    expect(bytes[5]).toBe(FILE_VERSION);
    expect(bytes[6]).toBe(KDF_ID_PBKDF2_SHA256);
    expect(bytes[7]).toBe(0x01);
    expect(view.getUint32(8, false)).toBe(FAST.iterations);
    expect(view.getUint32(12, false)).toBe(CHUNK);
    expect(bytes.slice(SALT_OFFSET, SALT_OFFSET + 32).every((b) => b === 0)).toBe(false);
    expect(bytes.slice(FILE_ID_OFFSET, FILE_ID_OFFSET + 16).every((b) => b === 0)).toBe(false);
    expect(bytes.slice(NONCE_PREFIX_OFFSET, NONCE_PREFIX_OFFSET + 4).every((b) => b === 0)).toBe(
      false,
    );
    expect(bytes.slice(WRAPPED_DEK_OFFSET, WRAPPED_DEK_OFFSET + 32).every((b) => b === 0)).toBe(
      false,
    );
    expect(bytes.slice(WRAP_TAG_OFFSET, WRAP_TAG_OFFSET + 16).every((b) => b === 0)).toBe(false);
    expect(bytes.byteLength).toBe(HEADER_LENGTH + RECORD_HEADER_LENGTH + 700 + 16);
  });

  it("uses a fresh DEK, salt, file id and nonce prefix per file", async () => {
    const first = await encrypt(patternBytes(16));
    const second = await encrypt(patternBytes(16));
    expect(first.slice(SALT_OFFSET, SALT_OFFSET + 32)).not.toEqual(
      second.slice(SALT_OFFSET, SALT_OFFSET + 32),
    );
    expect(first.slice(FILE_ID_OFFSET, FILE_ID_OFFSET + 16)).not.toEqual(
      second.slice(FILE_ID_OFFSET, FILE_ID_OFFSET + 16),
    );
    expect(first.slice(WRAPPED_DEK_OFFSET, WRAPPED_DEK_OFFSET + 32)).not.toEqual(
      second.slice(WRAPPED_DEK_OFFSET, WRAPPED_DEK_OFFSET + 32),
    );
  });

  it("rejects an unknown magic", async () => {
    const bytes = await encrypt(patternBytes(4));
    bytes[0] = 0x42;
    await expectError(bytes, AegisError.format);
  });

  it("rejects an unsupported version", async () => {
    const bytes = await encrypt(patternBytes(4));
    await expectError(tamper(bytes, 5, 4), AegisError.version(4));
  });

  it("rejects an unknown KDF id", async () => {
    await expectError(tamper(await encrypt(patternBytes(4)), 6, 2), AegisError.kdf);
  });

  it("rejects unknown header flags", async () => {
    await expectError(tamper(await encrypt(patternBytes(4)), 7, 0x08), AegisError.flags);
  });

  it("rejects iterations outside the allowed range", async () => {
    const below = await encrypt(patternBytes(4));
    new DataView(below.buffer).setUint32(8, 1, false);
    await expectError(below, AegisError.iterations);

    const above = await encrypt(patternBytes(4));
    new DataView(above.buffer).setUint32(8, CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MAX + 1, false);
    await expectError(above, AegisError.iterations);
  });

  it("rejects chunk sizes outside the allowed range", async () => {
    const below = await encrypt(patternBytes(4));
    new DataView(below.buffer).setUint32(12, 1024, false);
    await expectError(below, AegisError.chunkSize);
  });

  it("rejects a truncated header before doing KDF work", async () => {
    const bytes = await encrypt(patternBytes(4));
    await expectError(bytes.slice(0, 100), AegisError.truncated);
    await expectError(bytes.slice(0, 5), AegisError.truncated);
  });

  it("authenticates the header when unwrapping the DEK", async () => {
    await expectError(tamper(await encrypt(patternBytes(4)), SALT_OFFSET, 0xff), AegisError.credentials);
    await expectError(tamper(await encrypt(patternBytes(4)), WRAPPED_DEK_OFFSET, 0xff), AegisError.credentials);
    await expectError(tamper(await encrypt(patternBytes(4)), WRAP_TAG_OFFSET, 0xff), AegisError.credentials);
  });
});

describe("v3 records", () => {
  it("stores an empty file as one final record containing only the tag", async () => {
    const bytes = await encrypt(new Uint8Array(0));
    const records = listV3Records(bytes);
    expect(records).toHaveLength(1);
    expect(records[0].isFinal).toBe(true);
    expect(records[0].ciphertextLength).toBe(CRYPTO_CONSTANTS.TAG_LENGTH_BYTES);
    expect(bytes.byteLength).toBe(HEADER_LENGTH + RECORD_HEADER_LENGTH + 16);
    expect(await decryptBytes(bytes)).toEqual(new Uint8Array(0));
  });

  it("marks only the last of several records as final", async () => {
    const bytes = await encrypt(patternBytes(CHUNK * 2 + 1));
    const records = listV3Records(bytes);
    expect(records).toHaveLength(3);
    expect(records.map((r) => r.isFinal)).toEqual([false, false, true]);
    expect(records[0].ciphertextLength).toBe(CHUNK + 16);
    expect(records[1].ciphertextLength).toBe(CHUNK + 16);
    expect(records[2].ciphertextLength).toBe(1 + 16);
  });

  it("rejects a record with an unknown flag", async () => {
    const bytes = await encrypt(patternBytes(10));
    bytes[HEADER_LENGTH] |= 0x02;
    await expectError(bytes, AegisError.record);
  });

  it("rejects a record shorter than the authentication tag", async () => {
    const bytes = await encrypt(patternBytes(10));
    new DataView(bytes.buffer).setUint32(HEADER_LENGTH + 1, 0, false);
    await expectError(bytes, AegisError.record);
  });

  it("rejects a record longer than chunk size plus tag", async () => {
    const bytes = await encrypt(patternBytes(10));
    new DataView(bytes.buffer).setUint32(HEADER_LENGTH + 1, CHUNK + 17, false);
    await expectError(bytes, AegisError.record);
  });

  it("rejects a non-final record that is not a full chunk", async () => {
    const bytes = await encrypt(patternBytes(10));
    bytes[HEADER_LENGTH] &= ~0x01;
    await expectError(bytes, AegisError.record);
  });

  it("detects a truncated record payload", async () => {
    const bytes = await encrypt(patternBytes(200));
    await expectError(bytes.slice(0, bytes.byteLength - 3), AegisError.truncated);
  });

  it("detects a missing final record", async () => {
    const bytes = await encrypt(patternBytes(CHUNK * 2));
    const final = listV3Records(bytes).at(-1)!;
    await expectError(bytes.slice(0, final.offset), AegisError.missingFinal);
  });

  it("rejects bytes appended after the final record", async () => {
    const bytes = await encrypt(patternBytes(50));
    await expectError(concat(bytes, new Uint8Array([0x00])), AegisError.trailing);
    await expectError(concat(bytes, new Uint8Array([1, 2, 3])), AegisError.trailing);
  });

  it("rejects a container with no records at all", async () => {
    const bytes = await encrypt(patternBytes(10));
    await expectError(bytes.slice(0, HEADER_LENGTH), AegisError.missingFinal);
  });

  it("detects a flipped ciphertext bit", async () => {
    const bytes = await encrypt(patternBytes(64));
    bytes[HEADER_LENGTH + RECORD_HEADER_LENGTH + 8] ^= 0x80;
    await expectError(bytes, AegisError.tampered);
  });

  it("detects a modified record header", async () => {
    const bytes = await encrypt(patternBytes(64));
    new DataView(bytes.buffer).setUint32(HEADER_LENGTH + 1, 16, false);
    await expectError(bytes, AegisError.tampered);
  });

  it("detects reordered records", async () => {
    const bytes = await encrypt(patternBytes(CHUNK * 2));
    const [first, second] = listV3Records(bytes);
    const reordered = concat(
      bytes.slice(0, HEADER_LENGTH),
      bytes.slice(second.offset, second.offset + second.length),
      bytes.slice(first.offset, first.offset + first.length),
    );
    await expectError(reordered, AegisError.tampered);
  });

  it("discards partial output when authentication fails mid-stream", async () => {
    const bytes = await encrypt(patternBytes(CHUNK * 2));
    const records = listV3Records(bytes);
    bytes[records[1].offset + RECORD_HEADER_LENGTH + 2] ^= 0xff;
    await expectError(bytes, AegisError.tampered);
  });

  it("aborts decryption on request", async () => {
    const bytes = await encrypt(patternBytes(CHUNK * 2));
    const controller = new AbortController();
    await expect(
      processFileDecrypt(
        new Blob([bytes]),
        "pw",
        null,
        controller.signal,
        () => controller.abort(),
      ),
    ).rejects.toThrow(AegisError.cancelled);
  });
});

describe("rewrapFile", () => {
  const oldKey = new TextEncoder().encode("old keyfile").buffer;
  const newKey = new TextEncoder().encode("new keyfile").buffer;

  it("changes credentials without touching the payload", async () => {
    const plaintext = patternBytes(CHUNK + 17, 5);
    const original = await encrypt(plaintext, "old-password", oldKey);
    const recordsStart = HEADER_LENGTH;

    const rewrapped = await toBytes(
      await rewrapFile(
        new Blob([original]),
        "old-password",
        oldKey,
        "new-password",
        newKey,
        { iterations: CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MIN, randomBytes: makeRng(3) },
      ),
    );

    expect(rewrapped.slice(recordsStart)).toEqual(original.slice(recordsStart));
    expect(rewrapped.slice(FILE_ID_OFFSET, FILE_ID_OFFSET + 16)).toEqual(
      original.slice(FILE_ID_OFFSET, FILE_ID_OFFSET + 16),
    );

    await expectError(original, AegisError.credentials, "new-password", newKey);
    expect(await decryptBytes(rewrapped, "new-password", newKey)).toEqual(plaintext);

    const headerView = new DataView(rewrapped.buffer, rewrapped.byteOffset, HEADER_LENGTH);
    expect(headerView.getUint32(8, false)).toBe(CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MIN);
    expect(rewrapped[7] & 0x01).toBe(0x01);
  });

  it("supports removing a keyfile and changing iterations", async () => {
    const plaintext = patternBytes(64, 9);
    const original = await encrypt(plaintext, "pw", oldKey);
    const rewrapped = await toBytes(
      await rewrapFile(original.buffer.slice(0), "pw", oldKey, "pw2", null, {
        iterations: CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MIN,
      }),
    );
    expect(rewrapped[7] & 0x01).toBe(0);
    expect(await decryptBytes(rewrapped, "pw2", null)).toEqual(plaintext);
  });

  it("rejects the wrong old password and legacy containers", async () => {
    const original = await encrypt(patternBytes(8), "pw");
    await expect(
      rewrapFile(new Blob([original]), "nope", null, "next", null),
    ).rejects.toThrow(AegisError.credentials);

    const legacy = await encrypt(patternBytes(8));
    legacy[5] = 2;
    await expect(rewrapFile(new Blob([legacy]), "pw", null, "next", null)).rejects.toThrow(
      AegisError.version(2),
    );
  });
});
