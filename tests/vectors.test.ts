import { describe, expect, it } from "vitest";
import { CRYPTO_CONSTANTS, HEADER_LENGTH, LEGACY_HEADER_LENGTH } from "../src/constants";
import { processFileDecrypt, processFileEncrypt } from "../src/services/cryptoService";
import { fromHex, hex, makeRng, toBytes } from "./helpers";

/**
 * Frozen container produced by the v3 writer with a deterministic RNG.
 * Any change to the on-disk format or to the authenticated AAD breaks this.
 */
const V3_VECTOR_HEX =
  "4145474953030101000927c00001000026456483a2c1e0ff1e3d5c7b9ab9d8f71635547392b1d0ef0e2d4c6b8aa9c8e7e60524436281a0bfdefd1c3b5a7998b7d6f51433527190afceed0c2b4a6988a79c085315a2b0af9c73010c67d3e65f067e119814e245d6e582b99aa7bfa4181377df6bc1446c6e12eb046fb687e6390f0100000031e842ccca36215b23858710c6f904b3de7f967ac32233fe44902f02a1142bd0a8882d96682218a396265f8f7f1127315563";

const VECTOR_PLAINTEXT = "AegisCrypt format v3 test vector\n";
const VECTOR_PASSWORD = "vector-password";
const VECTOR_KEYFILE = new TextEncoder().encode("vector-keyfile").buffer;

const encrypted = () =>
  processFileEncrypt(
    new Blob([new TextEncoder().encode(VECTOR_PLAINTEXT)]),
    VECTOR_PASSWORD,
    VECTOR_KEYFILE,
    new AbortController().signal,
    () => {},
    {
      iterations: CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MIN,
      chunkSize: CRYPTO_CONSTANTS.CHUNK_SIZE_MIN,
      randomBytes: makeRng(1),
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
    const bytes = fromHex(V3_VECTOR_HEX);
    expect(bytes.byteLength).toBe(HEADER_LENGTH + 5 + VECTOR_PLAINTEXT.length + 16);
    expect(bytes[5]).toBe(3);
    expect(bytes[6]).toBe(1);
    expect(bytes[7]).toBe(0x01);
    const view = new DataView(bytes.buffer);
    expect(view.getUint32(8, false)).toBe(CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MIN);
    expect(view.getUint32(12, false)).toBe(CRYPTO_CONSTANTS.CHUNK_SIZE_MIN);
    expect(LEGACY_HEADER_LENGTH).toBe(38);
  });
});
