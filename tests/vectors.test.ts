import { describe, expect, it } from "vitest";
import { CRYPTO_CONSTANTS, HEADER_LENGTH, LEGACY_HEADER_LENGTH } from "../src/constants";
import { processFileDecrypt, processFileEncrypt } from "../src/services/cryptoService";
import vector from "./fixtures/v3-vector.json";
import { fromHex, hex, makeRng, toBytes } from "./helpers";

/**
 * Shared frozen container (tests/fixtures/v3-vector.json) consumed by web and
 * desktop tests. Any change to the on-disk format or authenticated AAD breaks it.
 */
const V3_VECTOR_HEX = vector.containerHex;
const VECTOR_PLAINTEXT = vector.plaintext;
const VECTOR_PASSWORD = vector.password;
const VECTOR_KEYFILE = new TextEncoder().encode(vector.keyfile).buffer;

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
    expect(LEGACY_HEADER_LENGTH).toBe(38);
  });
});
