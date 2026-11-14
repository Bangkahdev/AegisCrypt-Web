import { describe, expect, it } from "vitest";
import { CRYPTO_CONSTANTS, HEADER_LENGTH, LEGACY_HEADER_LENGTH } from "../src/constants";
import { AegisError, processFileDecrypt, processFileEncrypt } from "../src/services/cryptoService";
import unicodeVector from "./fixtures/v3-unicode-vector.json";
import v2 from "./fixtures/v2-vector.json";
import vector from "./fixtures/v3-vector.json";
import { fromHex, hex, makeRng, toBytes } from "./helpers";

/**
 * Shared frozen containers consumed by web and desktop tests. Any change to the
 * on-disk format, authenticated AAD, or key derivation breaks them.
 */
const V3_VECTOR_HEX = vector.containerHex;
const UNICODE_VECTOR_HEX = unicodeVector.containerHex;
const UNICODE_PLAINTEXT = unicodeVector.plaintext;
const VECTOR_PLAINTEXT = vector.plaintext;
const VECTOR_PASSWORD = vector.password;
const VECTOR_KEYFILE = new TextEncoder().encode(vector.keyfile).buffer;

const V2_VECTOR_HEX = v2.containerHex;
const V2_PASSWORD = v2.password;
const V2_KEYFILE = fromHex(v2.keyfileHex).buffer;

const encrypted = () =>
  processFileEncrypt(
    new Blob([new TextEncoder().encode(VECTOR_PLAINTEXT)]),
    VECTOR_PASSWORD,
    VECTOR_KEYFILE,
    new AbortController().signal,
    () => {},
    {
      iterations: vector.iterations,
      chunkSize: vector.chunkSize,
      randomBytes: makeRng(vector.rngSeed),
    },
  );

describe("unicode password vectors", () => {
  const encryptWith = (password: string) =>
    processFileEncrypt(
      new Blob([new TextEncoder().encode(UNICODE_PLAINTEXT)]),
      password,
      null,
      new AbortController().signal,
      () => {},
      {
        iterations: unicodeVector.iterations,
        chunkSize: unicodeVector.chunkSize,
        randomBytes: makeRng(unicodeVector.rngSeed),
      },
    );

  it("reproduces the frozen NFC container byte for byte", async () => {
    expect(hex(await toBytes(await encryptWith(unicodeVector.passwordNfc)))).toBe(
      UNICODE_VECTOR_HEX,
    );
  });

  it("decrypts the frozen NFC container", async () => {
    const out = await processFileDecrypt(
      new Blob([fromHex(UNICODE_VECTOR_HEX)]),
      unicodeVector.passwordNfc,
      null,
      new AbortController().signal,
      () => {},
    );
    expect(await out.text()).toBe(UNICODE_PLAINTEXT);
  });

  it("treats an NFD spelling as different credentials", async () => {
    await expect(
      processFileDecrypt(
        new Blob([fromHex(UNICODE_VECTOR_HEX)]),
        unicodeVector.passwordNfd,
        null,
        new AbortController().signal,
        () => {},
      ),
    ).rejects.toThrow(AegisError.credentials);
  });

  it("encodes NFC and NFD spellings differently without normalization", () => {
    expect(hex(new TextEncoder().encode(unicodeVector.passwordNfc))).toBe(
      unicodeVector.passwordNfcUtf8Hex,
    );
    expect(hex(new TextEncoder().encode(unicodeVector.passwordNfd))).toBe(
      unicodeVector.passwordNfdUtf8Hex,
    );
    expect(unicodeVector.passwordNfcUtf8Hex).not.toBe(unicodeVector.passwordNfdUtf8Hex);
  });
});

describe("format vectors", () => {
  it("reproduces the frozen v3 vector byte for byte", async () => {
    expect(hex(await toBytes(await encrypted()))).toBe(V3_VECTOR_HEX);
  });

  it("decrypts the frozen v3 vector", async () => {
    const out = await processFileDecrypt(
      new Blob([fromHex(V3_VECTOR_HEX)]),
      VECTOR_PASSWORD,
      VECTOR_KEYFILE,
      new AbortController().signal,
      () => {},
    );
    expect(await out.text()).toBe(VECTOR_PLAINTEXT);
  });

  it("decrypts the frozen legacy v2 vector", async () => {
    const out = await processFileDecrypt(
      new Blob([fromHex(V2_VECTOR_HEX)]),
      V2_PASSWORD,
      V2_KEYFILE,
      new AbortController().signal,
      () => {},
    );
    expect(await out.text()).toBe(v2.plaintextUtf8);
  });

  it("is case-insensitive when parsing the hex fixture", () => {
    expect(hex(fromHex(V3_VECTOR_HEX.toLowerCase()))).toBe(V3_VECTOR_HEX);
  });

  it("documents the vector geometry", () => {
    expect(vector.iterations).toBe(CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MIN);
    expect(vector.chunkSize).toBe(CRYPTO_CONSTANTS.CHUNK_SIZE_MIN);
    const bytes = fromHex(V3_VECTOR_HEX);
    expect(bytes.byteLength).toBe(HEADER_LENGTH + 5 + VECTOR_PLAINTEXT.length + 16);
    expect(bytes[5]).toBe(3);
    expect(bytes[6]).toBe(1);
    expect(bytes[7]).toBe(0x01);
    const view = new DataView(bytes.buffer);
    expect(view.getUint32(8, false)).toBe(vector.iterations);
    expect(view.getUint32(12, false)).toBe(vector.chunkSize);

    const v2bytes = fromHex(V2_VECTOR_HEX);
    expect(v2bytes[5]).toBe(2);
    expect(v2bytes.byteLength).toBeGreaterThan(LEGACY_HEADER_LENGTH);
    expect(v2.records).toHaveLength(2);
  });
});
