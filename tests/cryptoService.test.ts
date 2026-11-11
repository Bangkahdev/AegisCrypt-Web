import { describe, expect, it } from "vitest";
import {
  CRYPTO_CONSTANTS,
  FILE_VERSION,
  HEADER_LENGTH,
  KDF_ID_PBKDF2_SHA256,
} from "../src/constants";
import {
  AegisError,
  deriveKey,
  prepareKeyMaterial,
  processFileDecrypt,
  processFileEncrypt,
} from "../src/services/cryptoService";
import { makeRng, patternBytes, toBytes, type Bytes } from "./helpers";

const CHUNK = CRYPTO_CONSTANTS.CHUNK_SIZE_MIN; // 64 KiB keeps multi-record tests fast

const encrypt = (
  data: Bytes,
  password = "correct horse",
  keyFile: ArrayBuffer | null = null,
  extra: { iterations?: number; chunkSize?: number; randomBytes?: (n: number) => Bytes } = {},
) =>
  processFileEncrypt(
    new Blob([data]),
    password,
    keyFile,
    new AbortController().signal,
    () => {},
    { chunkSize: CHUNK, ...extra },
  );

const decrypt = (blob: Blob, password = "correct horse", keyFile: ArrayBuffer | null = null) =>
  processFileDecrypt(
    blob,
    password,
    keyFile,
    new AbortController().signal,
    () => {},
    { sink: undefined },
  );

describe("prepareKeyMaterial", () => {
  it("uses password bytes when no keyfile is supplied", async () => {
    const material = await prepareKeyMaterial("pässword");
    expect(material).toEqual(new TextEncoder().encode("pässword"));
  });

  it("appends SHA-256(keyfile) to the password bytes", async () => {
    const keyFile = new TextEncoder().encode("keyfile contents").buffer;
    const material = await prepareKeyMaterial("pass", keyFile);
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", keyFile));
    const expected = new Uint8Array(new TextEncoder().encode("pass").length + digest.length);
    expected.set(new TextEncoder().encode("pass"), 0);
    expected.set(digest, 4);
    expect(material).toEqual(expected);
  });
});

describe("deriveKey", () => {
  it("derives an interchangeable key from identical inputs", async () => {
    const salt = new Uint8Array(32).fill(3);
    const material = await prepareKeyMaterial("same");
    const encKey = await deriveKey(material, salt, ["encrypt"]);
    const decKey = await deriveKey(material, salt, ["decrypt"]);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const sealed = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, encKey, new Uint8Array([1, 2, 3]));
    const opened = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, decKey, sealed);
    expect(new Uint8Array(opened)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("derives different keys for different passwords", async () => {
    const salt = new Uint8Array(32).fill(9);
    const iv = new Uint8Array(12).fill(1);
    const keyA = await deriveKey(await prepareKeyMaterial("a"), salt, ["encrypt"]);
    const keyB = await deriveKey(await prepareKeyMaterial("b"), salt, ["decrypt"]);
    const sealed = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, keyA, new Uint8Array([7]));
    await expect(crypto.subtle.decrypt({ name: "AES-GCM", iv }, keyB, sealed)).rejects.toThrow();
  });
});

describe("v3 roundtrip", () => {
  const cases: Array<[string, number]> = [
    ["empty", 0],
    ["single byte", 1],
    ["just under one chunk", CHUNK - 1],
    ["exactly one chunk", CHUNK],
    ["one chunk plus one", CHUNK + 1],
    ["two chunks plus tail", CHUNK * 2 + 123],
  ];

  for (const [label, size] of cases) {
    it(`roundtrips ${label} (${size} bytes)`, async () => {
      const plaintext = patternBytes(size, 11);
      const progress: number[] = [];
      const encrypted = await processFileEncrypt(
        new Blob([plaintext]),
        "roundtrip",
        null,
        new AbortController().signal,
        (bytes) => progress.push(bytes),
        { chunkSize: CHUNK },
      );

      const header = new Uint8Array(await encrypted.slice(0, HEADER_LENGTH).arrayBuffer());
      expect(Array.from(header.slice(0, 5))).toEqual([0x41, 0x45, 0x47, 0x49, 0x53]);
      expect(header[5]).toBe(FILE_VERSION);
      expect(header[6]).toBe(KDF_ID_PBKDF2_SHA256);
      expect(header[7]).toBe(0);
      expect(new DataView(header.buffer).getUint32(12, false)).toBe(CHUNK);

      const decrypted = await decrypt(encrypted, "roundtrip");
      expect(new Uint8Array(await decrypted.arrayBuffer())).toEqual(plaintext);

      expect(progress.at(-1)).toBe(size);
      for (let i = 1; i < progress.length; i++) {
        expect(progress[i]).toBeGreaterThan(progress[i - 1]);
      }
    });
  }

  it("accepts an ArrayBuffer source", async () => {
    const plaintext = patternBytes(1000, 2);
    const encrypted = await encrypt(plaintext);
    const bytes = await toBytes(encrypted);
    const out = await processFileDecrypt(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
      "correct horse",
      null,
      new AbortController().signal,
      () => {},
    );
    expect(new Uint8Array(await out.arrayBuffer())).toEqual(plaintext);
  });

  it("decrypts with a keyfile and rejects a different keyfile", async () => {
    const keyFile = new TextEncoder().encode("the key file").buffer;
    const wrongKeyFile = new TextEncoder().encode("not the key file").buffer;
    const plaintext = patternBytes(5000, 4);
    const encrypted = await encrypt(plaintext, "pw", keyFile);

    const decrypted = await decrypt(encrypted, "pw", keyFile);
    expect(new Uint8Array(await decrypted.arrayBuffer())).toEqual(plaintext);

    await expect(decrypt(encrypted, "pw", wrongKeyFile)).rejects.toThrow(AegisError.credentials);
    await expect(decrypt(encrypted, "pw", null)).rejects.toThrow(AegisError.credentials);
  });

  it("sets the keyfile flag in the header", async () => {
    const encrypted = await encrypt(patternBytes(10), "pw", new Uint8Array([1]).buffer);
    const byte7 = new Uint8Array(await encrypted.slice(7, 8).arrayBuffer())[0];
    expect(byte7 & 0x01).toBe(0x01);
  });

  it("rejects the wrong password", async () => {
    const encrypted = await encrypt(patternBytes(300));
    await expect(decrypt(encrypted, "wrong")).rejects.toThrow(AegisError.credentials);
  });

  it("honours an explicit iteration count", async () => {
    const encrypted = await encrypt(patternBytes(32), "pw", null, {
      iterations: CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MIN,
    });
    const header = new Uint8Array(await encrypted.slice(8, 12).arrayBuffer());
    expect(new DataView(header.buffer).getUint32(0, false)).toBe(
      CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MIN,
    );
    expect(new Uint8Array(await (await decrypt(encrypted, "pw")).arrayBuffer())).toEqual(
      patternBytes(32),
    );
  });

  it("rejects out-of-range parameters", async () => {
    await expect(encrypt(patternBytes(4), "pw", null, { iterations: 1 })).rejects.toThrow(
      AegisError.iterations,
    );
    await expect(
      encrypt(patternBytes(4), "pw", null, { iterations: CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MAX + 1 }),
    ).rejects.toThrow(AegisError.iterations);
    await expect(encrypt(patternBytes(4), "pw", null, { chunkSize: 1024 })).rejects.toThrow(
      AegisError.chunkSize,
    );
    await expect(
      encrypt(patternBytes(4), "pw", null, { chunkSize: CRYPTO_CONSTANTS.CHUNK_SIZE_MAX + 1 }),
    ).rejects.toThrow(AegisError.chunkSize);
  });

  it("produces deterministic output for a fixed RNG", async () => {
    const plaintext = patternBytes(600, 8);
    const first = await encrypt(plaintext, "pw", null, {
      iterations: CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MIN,
      randomBytes: makeRng(1),
    });
    const second = await encrypt(plaintext, "pw", null, {
      iterations: CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MIN,
      randomBytes: makeRng(1),
    });
    expect(await toBytes(first)).toEqual(await toBytes(second));

    const different = await encrypt(plaintext, "pw", null, {
      iterations: CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MIN,
      randomBytes: makeRng(2),
    });
    expect(await toBytes(different)).not.toEqual(await toBytes(first));
  });

  it("aborts cleanly during encryption", async () => {
    const controller = new AbortController();
    const plaintext = patternBytes(CHUNK * 3, 1);
    await expect(
      processFileEncrypt(
        new Blob([plaintext]),
        "pw",
        null,
        controller.signal,
        () => controller.abort(),
        { chunkSize: CHUNK },
      ),
    ).rejects.toThrow(AegisError.cancelled);
  });
});
