import { describe, expect, it } from "vitest";
import {
  CRYPTO_CONSTANTS,
  FLAG_FILENAME_METADATA,
  FLAG_KEYFILE,
  HEADER_LENGTH,
} from "../src/constants";
import {
  AegisError,
  processFileDecrypt,
  processFileEncrypt,
  rewrapFile,
} from "../src/services/cryptoService";
import { patternBytes, toBytes, type Bytes } from "./helpers";

const CHUNK = CRYPTO_CONSTANTS.CHUNK_SIZE_MIN;
const FAST = {
  iterations: CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MIN,
  chunkSize: CHUNK,
};

const encrypt = (
  data: Bytes,
  password: string | Uint8Array = "metadata-password",
  options: { filename?: string | null; keyFile?: ArrayBuffer | null } = {},
) =>
  processFileEncrypt(
    new Blob([data]),
    password,
    options.keyFile ?? null,
    new AbortController().signal,
    () => {},
    { ...FAST, filename: options.filename },
  );

const decrypt = async (
  blob: Blob,
  password: string | Uint8Array = "metadata-password",
  keyFile: ArrayBuffer | null = null,
) => {
  let filename: string | null = null;
  const output = await processFileDecrypt(
    blob,
    password,
    keyFile,
    new AbortController().signal,
    () => {},
    { onFilename: (name) => (filename = name) },
  );
  return { filename, bytes: new Uint8Array(await output.arrayBuffer()) };
};

describe("encrypted filename metadata", () => {
  it("stores the filename encrypted and restores it", async () => {
    const plaintext = patternBytes(512, 3);
    const encrypted = await encrypt(plaintext, "metadata-password", {
      filename: "rahasia 日本語.txt",
    });
    const bytes = await toBytes(encrypted);

    expect(bytes[7] & FLAG_FILENAME_METADATA).toBe(FLAG_FILENAME_METADATA);
    expect(new TextDecoder().decode(bytes)).not.toContain("rahasia");

    const result = await decrypt(encrypted);
    expect(result.filename).toBe("rahasia 日本語.txt");
    expect(result.bytes).toEqual(plaintext);
  });

  it("works together with a keyfile flag", async () => {
    const keyFile = new TextEncoder().encode("keyfile").buffer;
    const plaintext = patternBytes(64, 4);
    const encrypted = await encrypt(plaintext, "pw", {
      filename: "secret.bin",
      keyFile,
    });
    const bytes = await toBytes(encrypted);
    expect(bytes[7] & FLAG_KEYFILE).toBe(FLAG_KEYFILE);
    expect(bytes[7] & FLAG_FILENAME_METADATA).toBe(FLAG_FILENAME_METADATA);

    const result = await decrypt(encrypted, "pw", keyFile);
    expect(result.filename).toBe("secret.bin");
    expect(result.bytes).toEqual(plaintext);
  });

  it("does not emit metadata when no filename is supplied", async () => {
    const plaintext = patternBytes(8, 5);
    const encrypted = await encrypt(plaintext);
    const bytes = await toBytes(encrypted);
    expect(bytes[7] & FLAG_FILENAME_METADATA).toBe(0);

    let called = false;
    const output = await processFileDecrypt(
      encrypted,
      "metadata-password",
      null,
      new AbortController().signal,
      () => {},
      { onFilename: () => (called = true) },
    );
    expect(called).toBe(false);
    expect(new Uint8Array(await output.arrayBuffer())).toEqual(plaintext);
  });

  it("handles the maximum filename length", async () => {
    const name = "a".repeat(1024);
    const encrypted = await encrypt(patternBytes(16, 6), "metadata-password", { filename: name });
    const result = await decrypt(encrypted);
    expect(result.filename).toBe(name);
  });

  it("rejects empty and oversized filenames", async () => {
    await expect(encrypt(patternBytes(4), "pw", { filename: "" })).rejects.toThrow(
      AegisError.filenameMetadata,
    );
    await expect(
      encrypt(patternBytes(4), "pw", { filename: "a".repeat(1025) }),
    ).rejects.toThrow(AegisError.filenameMetadata);
  });

  it("fails authentication when the metadata ciphertext is tampered", async () => {
    const encrypted = await encrypt(patternBytes(32, 7), "pw", { filename: "doc.pdf" });
    const bytes = await toBytes(encrypted);
    const metadataCiphertextStart = HEADER_LENGTH + 2;
    bytes[metadataCiphertextStart] ^= 0xff;
    await expect(decrypt(new Blob([bytes]), "pw")).rejects.toThrow(AegisError.tampered);
  });
});

describe("rewrap", () => {
  it("changes the password without touching metadata or payload", async () => {
    const plaintext = patternBytes(CHUNK + 33, 8);
    const original = await toBytes(
      await encrypt(plaintext, "old-password", { filename: "archive.zip" }),
    );

    const rewrapped = await toBytes(
      await rewrapFile(
        new Blob([original]),
        "old-password",
        null,
        "new-password",
        null,
        { iterations: CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MIN },
      ),
    );

    expect(rewrapped.subarray(HEADER_LENGTH)).toEqual(original.subarray(HEADER_LENGTH));

    const result = await decrypt(new Blob([rewrapped]), "new-password");
    expect(result.filename).toBe("archive.zip");
    expect(result.bytes).toEqual(plaintext);

    await expect(decrypt(new Blob([rewrapped]), "old-password")).rejects.toThrow(
      AegisError.credentials,
    );
  });

  it("updates the iteration count in the header", async () => {
    const original = await encrypt(patternBytes(32, 9), "pw");
    const rewrapped = await toBytes(
      await rewrapFile(original, "pw", null, "pw", null, {
        iterations: CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MIN,
      }),
    );
    const before = new DataView((await toBytes(original)).buffer).getUint32(8, false);
    const after = new DataView(rewrapped.buffer, rewrapped.byteOffset, 12).getUint32(8, false);
    expect(before).toBe(CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MIN);
    expect(after).toBe(CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MIN);
  });

  it("can add and remove a keyfile", async () => {
    const keyFile = new TextEncoder().encode("new-keyfile").buffer;
    const plaintext = patternBytes(100, 10);
    const passwordEncrypted = await encrypt(plaintext, "pw");

    const withKeyfile = await rewrapFile(
      passwordEncrypted,
      "pw",
      null,
      "pw",
      keyFile,
      { iterations: CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MIN },
    );
    const header = await toBytes(withKeyfile);
    expect(header[7] & FLAG_KEYFILE).toBe(FLAG_KEYFILE);
    await expect(decrypt(withKeyfile, "pw", null)).rejects.toThrow(AegisError.credentials);
    expect((await decrypt(withKeyfile, "pw", keyFile)).bytes).toEqual(plaintext);

    const withoutKeyfile = await rewrapFile(
      withKeyfile,
      "pw",
      keyFile,
      "pw",
      null,
      { iterations: CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MIN },
    );
    const cleared = await toBytes(withoutKeyfile);
    expect(cleared[7] & FLAG_KEYFILE).toBe(0);
    expect((await decrypt(withoutKeyfile, "pw")).bytes).toEqual(plaintext);
  });
});

describe("password input", () => {
  it("treats UTF-8 password bytes the same as the string form", async () => {
    const password = "pässwörd-🔐";
    const plaintext = patternBytes(80, 11);
    const fromString = await encrypt(plaintext, password);
    const fromBytes = await encrypt(plaintext, new TextEncoder().encode(password));
    const result = await decrypt(fromBytes, new TextEncoder().encode(password));
    expect(result.bytes).toEqual(plaintext);
    expect((await decrypt(fromString, password)).bytes).toEqual(plaintext);
  });
});
