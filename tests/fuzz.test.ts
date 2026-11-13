import { describe, expect, it } from "vitest";
import { CRYPTO_CONSTANTS } from "../src/constants";
import { AegisError, processFileDecrypt, processFileEncrypt } from "../src/services/cryptoService";
import { concat, makeRng, patternBytes, toBytes, type Bytes } from "./helpers";

const FAST = {
  iterations: CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MIN,
  chunkSize: CRYPTO_CONSTANTS.CHUNK_SIZE_MIN,
};

const PASSWORD = "fuzz-password";

const mulberry32 = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const knownMessages = new Set<string>(
  Object.values(AegisError).flatMap((value) => (typeof value === "string" ? [value] : [])),
);

const isKnownAegisMessage = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : "";
  return knownMessages.has(message) || /^Versi file tidak didukung \(v\d+\)\./.test(message);
};

const expectRejected = async (bytes: Bytes): Promise<void> => {
  try {
    await processFileDecrypt(
      new Blob([bytes]),
      PASSWORD,
      null,
      new AbortController().signal,
      () => {},
    );
  } catch (error) {
    expect(
      isKnownAegisMessage(error),
      `unexpected error for ${bytes.byteLength} bytes: ${error instanceof Error ? error.message : String(error)}`,
    ).toBe(true);
    return;
  }
  throw new Error(`malformed container (${bytes.byteLength} bytes) was accepted`);
};

const validContainer = async (): Promise<Bytes> =>
  toBytes(
    await processFileEncrypt(
      new Blob([patternBytes(300)]),
      PASSWORD,
      null,
      new AbortController().signal,
      () => {},
      { ...FAST, randomBytes: makeRng(42) },
    ),
  );

const randomBytes = (length: number, rng: () => number): Bytes => {
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i++) out[i] = Math.floor(rng() * 256);
  return out;
};

describe("fuzzing: malformed containers", () => {
  it(
    "rejects random byte streams with a controlled AegisError",
    async () => {
      const rng = mulberry32(0x51eed);
      for (let i = 0; i < 120; i++) {
        const length = Math.floor(rng() * 400);
        await expectRejected(randomBytes(length, rng));
      }
    },
    60_000,
  );

  it(
    "rejects random byte streams that keep a v3 magic prefix",
    async () => {
      const magic = new Uint8Array([0x41, 0x45, 0x47, 0x49, 0x53, 3]);
      const rng = mulberry32(0xbadf00d);
      for (let i = 0; i < 40; i++) {
        const body = randomBytes(Math.floor(rng() * 260), rng);
        await expectRejected(concat(magic, body));
      }
    },
    60_000,
  );

  it(
    "rejects single-byte mutations of a valid container",
    async () => {
      const original = await validContainer();
      const rng = mulberry32(0xc0ffee);
      for (let i = 0; i < 24; i++) {
        const mutated = original.slice();
        const position = Math.floor(rng() * mutated.byteLength);
        mutated[position] = mutated[position] ^ (1 + Math.floor(rng() * 255));
        await expectRejected(mutated);
      }
    },
    120_000,
  );

  it(
    "rejects every truncation point around structural boundaries",
    async () => {
      const original = await validContainer();
      const boundaries = new Set<number>([
        0, 1, 4, 5, 6, 7, 8, 12, 64, 127, 128, 129, 130, 160, 192,
        original.byteLength - 17,
        original.byteLength - 16,
        original.byteLength - 5,
        original.byteLength - 1,
      ]);
      for (const cut of boundaries) {
        if (cut < 0 || cut >= original.byteLength) continue;
        await expectRejected(original.slice(0, cut));
      }
      await expectRejected(new Uint8Array(0));
    },
    120_000,
  );

  it(
    "rejects data appended after the final record",
    async () => {
      const original = await validContainer();
      const rng = mulberry32(0x7a11);
      for (const extra of [1, 2, 3, 8, 33, 64]) {
        await expectRejected(concat(original, randomBytes(extra, rng)));
      }
    },
    60_000,
  );
});
