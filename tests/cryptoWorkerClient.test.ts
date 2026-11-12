import { describe, expect, it } from "vitest";
import { CRYPTO_CONSTANTS } from "../src/constants";
import {
  decryptFileTask,
  encryptFileTask,
  rewrapFileTask,
} from "../src/services/cryptoWorkerClient";
import { toBytes } from "./helpers";

const FAST = {
  iterations: CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MIN,
  chunkSize: CRYPTO_CONSTANTS.CHUNK_SIZE_MIN,
};

describe("crypto worker client (local fallback)", () => {
  it("encrypts and decrypts through the task API", async () => {
    const data = new TextEncoder().encode("worker task roundtrip");
    const password = new TextEncoder().encode("task-password");

    const encrypted = await encryptFileTask(
      new Blob([data]),
      password,
      null,
      undefined,
      () => {},
      { ...FAST, filename: "notes.txt" },
    );

    let filename: string | null = null;
    const decrypted = await decryptFileTask(
      encrypted,
      password,
      null,
      undefined,
      () => {},
      (name) => (filename = name),
    );

    expect(filename).toBe("notes.txt");
    expect(new Uint8Array(await decrypted.arrayBuffer())).toEqual(data);
  });

  it("carries the recovery key through the task API", async () => {
    const data = new TextEncoder().encode("recovery task payload");
    const password = new TextEncoder().encode("task-password");
    const recoveryKey = new Uint8Array(32).map((_, index) => index + 1);

    const encrypted = await encryptFileTask(
      new Blob([data]),
      password,
      null,
      undefined,
      () => {},
      { ...FAST, recoveryKey },
    );

    const decrypted = await decryptFileTask(
      encrypted,
      new Uint8Array(0),
      null,
      undefined,
      () => {},
      undefined,
      { recoveryKey },
    );
    expect(new Uint8Array(await decrypted.arrayBuffer())).toEqual(data);

    const rewrapped = await rewrapFileTask(encrypted, password, null, password, null, FAST);
    const viaRecovery = await decryptFileTask(
      rewrapped,
      new Uint8Array(0),
      null,
      undefined,
      () => {},
      undefined,
      { recoveryKey },
    );
    expect(new Uint8Array(await viaRecovery.arrayBuffer())).toEqual(data);
  });

  it("re-wraps credentials through the task API", async () => {
    const password = new TextEncoder().encode("old-password");
    const newPassword = new TextEncoder().encode("new-password");
    const data = new TextEncoder().encode("rewrap task payload");

    const encrypted = await encryptFileTask(new Blob([data]), password, null, undefined, () => {}, FAST);
    const rewrapped = await rewrapFileTask(encrypted, password, null, newPassword, null, FAST);

    const decrypted = await decryptFileTask(rewrapped, newPassword, null, undefined, () => {});
    expect(new Uint8Array(await decrypted.arrayBuffer())).toEqual(data);
  });

  it("rejects when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      encryptFileTask(
        new Blob([new TextEncoder().encode("aborted")]),
        new TextEncoder().encode("password"),
        null,
        controller.signal,
        () => {},
        FAST,
      ),
    ).rejects.toThrow(/cancelled/i);
  });
});

