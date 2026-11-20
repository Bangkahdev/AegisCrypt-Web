import { describe, expect, it } from "vitest";
import {
  CRYPTO_CONSTANTS,
  FILE_VERSION,
  HEADER_LENGTH,
  KDF_ID_PBKDF2_SHA256,
  MAX_DEK_BLOCKS,
  RECORD_AAD_LENGTH,
  FILENAME_AAD_LENGTH,
} from "../../src/constants";
import {
  AegisError,
  countGcmBlocks,
  createDekAccountant,
  deriveKey,
  prepareKeyMaterial,
  processFileDecrypt,
  processFileEncrypt,
} from "../../src/services/cryptoService";
import blockAccountingVectors from "../fixtures/gcm-block-accounting.json";
import { buildLegacyV2, makeRng, patternBytes, toBytes, type Bytes } from "../helpers";

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

  it("rejects an already-aborted empty-file encryption", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      processFileEncrypt(
        new Blob([]),
        "pw",
        null,
        controller.signal,
        () => {},
      ),
    ).rejects.toThrow(AegisError.cancelled);
  });

  it("rejects an already-aborted non-empty encryption", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      processFileEncrypt(
        new Blob([patternBytes(CHUNK)]),
        "pw",
        null,
        controller.signal,
        () => {},
      ),
    ).rejects.toThrow(AegisError.cancelled);
  });

  it("cancels an empty-file encryption when the final progress callback aborts", async () => {
    const controller = new AbortController();
    await expect(
      processFileEncrypt(
        new Blob([]),
        "pw",
        null,
        controller.signal,
        () => controller.abort(),
      ),
    ).rejects.toThrow(AegisError.cancelled);
  });

  it("cancels a non-empty encryption when the final progress callback aborts", async () => {
    const controller = new AbortController();
    const plaintext = patternBytes(CHUNK * 2, 1);
    const reported: number[] = [];
    await expect(
      processFileEncrypt(
        new Blob([plaintext]),
        "pw",
        null,
        controller.signal,
        (bytes) => {
          reported.push(bytes);
          if (bytes === plaintext.byteLength) controller.abort();
        },
        { chunkSize: CHUNK },
      ),
    ).rejects.toThrow(AegisError.cancelled);
    expect(reported.at(-1)).toBe(plaintext.byteLength);
  });

  it("encrypts an empty file as a single final record", async () => {
    const container = await processFileEncrypt(
      new Blob([]),
      "pw",
      null,
      new AbortController().signal,
      () => {},
      { iterations: CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MIN },
    );
    const bytes = await toBytes(container);
    expect(bytes.byteLength).toBe(HEADER_LENGTH + 5 + CRYPTO_CONSTANTS.TAG_LENGTH_BYTES);
    const out = await processFileDecrypt(
      container,
      "pw",
      null,
      new AbortController().signal,
      () => {},
    );
    expect(await out.arrayBuffer()).toHaveProperty("byteLength", 0);
  });
});

describe("decryption cancellation and cleanup", () => {
  it("rejects an already-aborted decryption before reading the container", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      processFileDecrypt(
        new Blob([patternBytes(64)]),
        "pw",
        null,
        controller.signal,
        () => {},
      ),
    ).rejects.toThrow(AegisError.cancelled);
  });

  it("aborts the output sink when the password is wrong", async () => {
    const container = await encrypt(patternBytes(300), "right");
    const aborts: number[] = [];
    const sink = {
      write: () => {},
      finalize: () => new Blob([]),
      abort: () => {
        aborts.push(1);
      },
    };
    await expect(
      processFileDecrypt(
        container,
        "wrong",
        null,
        new AbortController().signal,
        () => {},
        { sink },
      ),
    ).rejects.toThrow(AegisError.credentials);
    expect(aborts).toHaveLength(1);
  });

  it("aborts the output sink when a record fails authentication", async () => {
    const container = await encrypt(patternBytes(300), "pw");
    const bytes = await toBytes(container);
    bytes[bytes.byteLength - 1] ^= 0xff;
    const aborts: number[] = [];
    const sink = {
      write: () => {},
      finalize: () => new Blob([]),
      abort: () => {
        aborts.push(1);
      },
    };
    await expect(
      processFileDecrypt(
        new Blob([bytes]),
        "pw",
        null,
        new AbortController().signal,
        () => {},
        { sink },
      ),
    ).rejects.toThrow(AegisError.tampered);
    expect(aborts).toHaveLength(1);
  });

  it("cancels when the progress callback aborts on the final v3 record", async () => {
    const controller = new AbortController();
    const container = await encrypt(patternBytes(300), "pw");
    const finalizes: number[] = [];
    const aborts: number[] = [];
    const sink = {
      write: () => {},
      finalize: () => {
        finalizes.push(1);
        return new Blob([]);
      },
      abort: () => {
        aborts.push(1);
      },
    };

    await expect(
      processFileDecrypt(
        container,
        "pw",
        null,
        controller.signal,
        () => controller.abort(),
        { sink },
      ),
    ).rejects.toThrow(AegisError.cancelled);
    expect(finalizes).toHaveLength(0);
    expect(aborts).toHaveLength(1);
  });

  it("cancels when the progress callback aborts on the final v2 record", async () => {
    const controller = new AbortController();
    const container = await buildLegacyV2(
      patternBytes(200),
      "legacy-pw",
      makeRng(2)(32),
      [makeRng(3)(CRYPTO_CONSTANTS.IV_LENGTH)],
    );
    const finalizes: number[] = [];
    const sink = {
      write: () => {},
      finalize: () => {
        finalizes.push(1);
        return new Blob([]);
      },
      abort: () => {},
    };

    await expect(
      processFileDecrypt(
        new Blob([container]),
        "legacy-pw",
        null,
        controller.signal,
        () => controller.abort(),
        { sink },
      ),
    ).rejects.toThrow(AegisError.cancelled);
    expect(finalizes).toHaveLength(0);
  });

  it("surfaces a v2 sink write failure instead of a credential error", async () => {
    const container = await buildLegacyV2(
      patternBytes(200),
      "legacy-pw",
      makeRng(2)(32),
      [makeRng(3)(CRYPTO_CONSTANTS.IV_LENGTH)],
    );
    const failure = new Error("penyimpanan penuh");
    const sink = {
      write: () => {
        throw failure;
      },
      finalize: () => new Blob([]),
      abort: () => {},
    };

    await expect(
      processFileDecrypt(
        new Blob([container]),
        "legacy-pw",
        null,
        new AbortController().signal,
        () => {},
        { sink },
      ),
    ).rejects.toThrow("penyimpanan penuh");
  });
});

describe("DEK usage budget (D1b, GHASH block accounting)", () => {
  const fixtureCases = (
    blockAccountingVectors as {
      cases: { aad: number; ciphertext: number; blocks: number }[];
    }
  ).cases;

  it("matches the shared cross-platform GHASH block-accounting fixture", () => {
    expect(fixtureCases.length).toBeGreaterThan(0);
    for (const c of fixtureCases) {
      expect(countGcmBlocks(c.aad, c.ciphertext)).toBe(c.blocks);
    }
  });

  it("accepts exactly maxDekBlocks and rejects one block over", () => {
    const acc = createDekAccountant(4);
    acc.charge(RECORD_AAD_LENGTH, 0); // 3 + 0 + 1 = 4 blocks: exactly the cap
    expect(acc.blocks).toBe(4);
    expect(() => acc.charge(0, 0)).toThrow(AegisError.dekBudget); // +1 block
  });

  it("enforces the byte cap as a secondary limit", () => {
    const acc = createDekAccountant(MAX_DEK_BLOCKS, 10);
    acc.charge(4, 6); // 10 bytes: exactly the cap
    expect(acc.bytes).toBe(10);
    expect(() => acc.charge(0, 1)).toThrow(AegisError.dekBudget);
  });

  it("rejects non-integer, negative and non-finite inputs", () => {
    const acc = createDekAccountant();
    expect(() => acc.charge(1.5, 0)).toThrow(AegisError.dekBudget);
    expect(() => acc.charge(-1, 0)).toThrow(AegisError.dekBudget);
    expect(() => acc.charge(0, Number.POSITIVE_INFINITY)).toThrow(AegisError.dekBudget);
    expect(() => acc.charge(Number.NaN, 0)).toThrow(AegisError.dekBudget);
  });

  it("charges large invocations without overflow", () => {
    const acc = createDekAccountant();
    const big = 2 ** 31;
    acc.charge(0, big);
    expect(acc.blocks).toBe(Math.ceil(big / 16) + 1);
  });

  it("encrypt rejects before sealing once the per-DEK budget is exceeded", async () => {
    const file = new Blob([new Uint8Array([1, 2, 3, 4])]);
    const signal = new AbortController().signal;
    await expect(
      processFileEncrypt(file, "pw", null, signal, () => {}, {
        chunkSize: CHUNK,
        maxDekBlocks: 4, // the 4-byte final record needs 5 blocks
      }),
    ).rejects.toThrow(AegisError.dekBudget);
    await expect(
      processFileEncrypt(file, "pw", null, signal, () => {}, {
        chunkSize: CHUNK,
        maxDekBlocks: 5,
      }),
    ).resolves.toBeInstanceOf(Blob);
  });

  it("encryption accounts for chunk boundaries (64 KiB / 1 MiB / 16 MiB)", async () => {
    for (const chunk of [
      CRYPTO_CONSTANTS.CHUNK_SIZE_MIN,
      CRYPTO_CONSTANTS.CHUNK_SIZE,
      CRYPTO_CONSTANTS.CHUNK_SIZE_MAX,
    ]) {
      const file = new Blob([new Uint8Array(chunk + 1)]);
      const total = chunk / 16 + 4 + 5; // full chunk record + 1-byte final record
      const pass = processFileEncrypt(file, "pw", null, new AbortController().signal, () => {}, {
        chunkSize: chunk,
        maxDekBlocks: total,
      });
      await expect(pass).resolves.toBeInstanceOf(Blob);
      const fail = processFileEncrypt(file, "pw", null, new AbortController().signal, () => {}, {
        chunkSize: chunk,
        maxDekBlocks: total - 1,
      });
      await expect(fail).rejects.toThrow(AegisError.dekBudget);
    }
  });

  it("charges filename metadata before payload records", async () => {
    const file = new Blob([new Uint8Array(0)]);
    const signal = new AbortController().signal;
    // Filename "a" (1 byte): 3 + 1 + 1 = 5 blocks; empty-file record: 4 blocks; total 9.
    await expect(
      processFileEncrypt(file, "pw", null, signal, () => {}, {
        chunkSize: CHUNK,
        filename: "a",
        maxDekBlocks: 8,
      }),
    ).rejects.toThrow(AegisError.dekBudget);
    await expect(
      processFileEncrypt(file, "pw", null, signal, () => {}, {
        chunkSize: CHUNK,
        filename: "a",
        maxDekBlocks: 9,
      }),
    ).resolves.toBeInstanceOf(Blob);
  });

  it("decrypt rejects before invoking GCM and publishes no plaintext", async () => {
    const payload = patternBytes(64, 7);
    const container = await processFileEncrypt(
      new Blob([payload]),
      "pw",
      null,
      new AbortController().signal,
      () => {},
      { chunkSize: CHUNK },
    );
    const writes: number[] = [];
    let aborts = 0;
    const sink = {
      write: () => {
        writes.push(1);
      },
      finalize: () => new Blob([]),
      abort: () => {
        aborts += 1;
      },
    };
    // 64-byte record needs 3 + ceil(64/16) + 1 = 8 blocks; budget allows only 7.
    await expect(
      processFileDecrypt(container, "pw", null, new AbortController().signal, () => {}, {
        sink,
        maxDekBlocks: 7,
      }),
    ).rejects.toThrow(AegisError.dekBudget);
    expect(writes).toHaveLength(0);
    expect(aborts).toBe(1);
  });

  it("decrypt boundary: exact block count passes, one less rejects", async () => {
    const payload = patternBytes(64, 7);
    const generate = () =>
      processFileEncrypt(new Blob([payload]), "pw", null, new AbortController().signal, () => {}, {
        chunkSize: CHUNK,
      });
    const total = countGcmBlocks(RECORD_AAD_LENGTH, payload.byteLength); // 8
    const pass = await generate();
    await expect(
      processFileDecrypt(pass, "pw", null, new AbortController().signal, () => {}, {
        maxDekBlocks: total,
      }),
    ).resolves.toBeInstanceOf(Blob);
    const fail = await generate();
    await expect(
      processFileDecrypt(fail, "pw", null, new AbortController().signal, () => {}, {
        maxDekBlocks: total - 1,
      }),
    ).rejects.toThrow(AegisError.dekBudget);
  });

  it("charges filename metadata on decrypt before payload records", async () => {
    const payload = patternBytes(4, 9);
    const filenameBlocks = countGcmBlocks(FILENAME_AAD_LENGTH, 1); // 5
    const recordBlocks = countGcmBlocks(RECORD_AAD_LENGTH, payload.byteLength); // 5
    const total = filenameBlocks + recordBlocks; // 10

    const generate = () =>
      processFileEncrypt(new Blob([payload]), "pw", null, new AbortController().signal, () => {}, {
        chunkSize: CHUNK,
        filename: "a",
      });

    const pass = await generate();
    await expect(
      processFileDecrypt(pass, "pw", null, new AbortController().signal, () => {}, {
        maxDekBlocks: total,
      }),
    ).resolves.toBeInstanceOf(Blob);
    const fail = await generate();
    await expect(
      processFileDecrypt(fail, "pw", null, new AbortController().signal, () => {}, {
        maxDekBlocks: total - 1,
      }),
    ).rejects.toThrow(AegisError.dekBudget);
  });
});
