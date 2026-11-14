import { describe, expect, it } from "vitest";
import {
  CRYPTO_CONSTANTS,
  FLAG_FILENAME_METADATA,
  FLAG_RECOVERY,
  HEADER_LENGTH,
  RECOVERY_SLOT_LENGTH,
} from "../../src/constants";
import {
  AegisError,
  processFileDecrypt,
  processFileEncrypt,
  rewrapFile,
} from "../../src/services/cryptoService";
import { patternBytes, toBytes, type Bytes } from "../helpers";

const FAST = {
  iterations: CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MIN,
  chunkSize: CRYPTO_CONSTANTS.CHUNK_SIZE_MIN,
};
const RECOVERY_KEY = patternBytes(32, 5);
const EMPTY = new Uint8Array(0);

const encryptWithRecovery = async (
  data: Bytes,
  options: { password?: string; keyFile?: ArrayBuffer | null; filename?: string | null } = {},
): Promise<Bytes> =>
  toBytes(
    await processFileEncrypt(
      new Blob([data]),
      options.password ?? "pw",
      options.keyFile ?? null,
      new AbortController().signal,
      () => {},
      { ...FAST, filename: options.filename, recoveryKey: RECOVERY_KEY },
    ),
  );

const decryptWithRecovery = async (bytes: Bytes, recoveryKey = RECOVERY_KEY) => {
  let filename: string | null = null;
  const output = await processFileDecrypt(
    new Blob([bytes]),
    EMPTY,
    null,
    new AbortController().signal,
    () => {},
    { recoveryKey, onFilename: (name) => (filename = name) },
  );
  return { bytes: await toBytes(output), filename };
};

describe("recovery slot", () => {
  it("sets flag bit1 and writes 60 bytes after the fixed header", async () => {
    const encrypted = await encryptWithRecovery(patternBytes(300), { filename: "secret.txt" });

    expect(encrypted[7] & FLAG_RECOVERY).toBe(FLAG_RECOVERY);
    expect(encrypted[7] & FLAG_FILENAME_METADATA).toBe(FLAG_FILENAME_METADATA);

    const slot = encrypted.subarray(HEADER_LENGTH, HEADER_LENGTH + RECOVERY_SLOT_LENGTH);
    expect(slot.byteLength).toBe(RECOVERY_SLOT_LENGTH);
    expect(slot.some((byte) => byte !== 0)).toBe(true);
  });

  it("decrypts with only the recovery key and keeps filename metadata", async () => {
    const data = patternBytes(700);
    const encrypted = await encryptWithRecovery(data, { filename: "notes.txt" });

    const { bytes, filename } = await decryptWithRecovery(encrypted);
    expect(bytes).toEqual(data);
    expect(filename).toBe("notes.txt");
  });

  it("rejects a wrong recovery key", async () => {
    const encrypted = await encryptWithRecovery(patternBytes(200));
    const wrong = patternBytes(32, 9);

    await expect(decryptWithRecovery(encrypted, wrong)).rejects.toThrow(AegisError.recoveryKey);
  });

  it("rejects a damaged slot", async () => {
    const encrypted = await encryptWithRecovery(patternBytes(200));
    encrypted[HEADER_LENGTH + 20] ^= 0xff;

    await expect(decryptWithRecovery(encrypted)).rejects.toThrow(AegisError.recoveryKey);
  });

  it("reports a missing slot when the file has none", async () => {
    const encrypted = await toBytes(
      await processFileEncrypt(
        new Blob([patternBytes(200)]),
        "pw",
        null,
        new AbortController().signal,
        () => {},
        FAST,
      ),
    );

    await expect(decryptWithRecovery(encrypted)).rejects.toThrow(AegisError.recoveryMissing);
  });

  it("rejects recovery keys that are not 32 bytes", async () => {
    await expect(
      processFileEncrypt(
        new Blob([patternBytes(32)]),
        "pw",
        null,
        new AbortController().signal,
        () => {},
        { ...FAST, recoveryKey: patternBytes(16) },
      ),
    ).rejects.toThrow(AegisError.recoveryKey);
  });

  it("keeps the slot valid after a password change", async () => {
    const data = patternBytes(500);
    const encrypted = await encryptWithRecovery(data, { filename: "payload.bin" });

    const rewrapped = await toBytes(
      await rewrapFile(new Blob([encrypted]), "pw", null, "new-pw", null, {
        iterations: CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MIN,
      }),
    );

    expect(rewrapped[7] & FLAG_RECOVERY).toBe(FLAG_RECOVERY);

    const viaRecovery = await decryptWithRecovery(rewrapped);
    expect(viaRecovery.bytes).toEqual(data);
    expect(viaRecovery.filename).toBe("payload.bin");

    const viaPassword = await processFileDecrypt(
      new Blob([rewrapped]),
      "new-pw",
      null,
      new AbortController().signal,
      () => {},
    );
    expect(await toBytes(viaPassword)).toEqual(data);
  });

  it("works with a keyfile-protected container", async () => {
    const keyFile = patternBytes(48, 2).buffer;
    const data = patternBytes(400);
    const encrypted = await encryptWithRecovery(data, { password: "pw", keyFile });

    const viaRecovery = await decryptWithRecovery(encrypted);
    expect(viaRecovery.bytes).toEqual(data);

    await expect(
      processFileDecrypt(
        new Blob([encrypted]),
        "pw",
        null,
        new AbortController().signal,
        () => {},
      ),
    ).rejects.toThrow(AegisError.credentials);
  });
});

