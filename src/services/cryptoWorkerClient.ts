import { AegisError, processFileDecrypt, processFileEncrypt, rewrapFile } from "./cryptoService";
import CryptoWorker from "../workers/cryptoWorker?worker";
import type {
  CryptoJobMessage,
  CryptoJobRequest,
  EncryptJobOptions,
  RewrapJobOptions,
} from "./cryptoWorkerProtocol";

/**
 * Main-thread facade for the crypto worker. Falls back to running the same
 * operations locally when Workers are unavailable (tests, very old browsers).
 */

interface TaskCallbacks {
  signal?: AbortSignal;
  onProgress?: (bytes: number) => void;
  onFilename?: (filename: string) => void;
}

type JobBody =
  | Omit<Extract<CryptoJobRequest, { kind: "encrypt" }>, "id">
  | Omit<Extract<CryptoJobRequest, { kind: "decrypt" }>, "id">
  | Omit<Extract<CryptoJobRequest, { kind: "rewrap" }>, "id">;

const encodePassword = (password: string | Uint8Array): Uint8Array =>
  typeof password === "string" ? new TextEncoder().encode(password) : password;

const cancelledError = () => new Error(AegisError.cancelled);

const supportsWorker = (): boolean =>
  typeof Worker !== "undefined" && typeof URL !== "undefined";

/**
 * OPFS temp files created by the worker cannot be removed by the worker after
 * it is terminated, so the main thread schedules the cleanup instead.
 */
const scheduleTempCleanup = (name: string): void => {
  if (typeof window === "undefined") return;
  const storage = (navigator as any)?.storage;
  if (!storage || typeof storage.getDirectory !== "function") return;

  let done = false;
  const remove = () => {
    if (done) return;
    done = true;
    storage
      .getDirectory()
      .then((root: any) => root.removeEntry(name))
      .catch(() => {
        /* best effort */
      });
  };

  window.setTimeout(remove, 60_000);
  window.addEventListener("pagehide", remove, { once: true });
};

const runJob = (body: JobBody, callbacks: TaskCallbacks): Promise<Blob> => {
  if (!supportsWorker()) return runLocally(body, callbacks);

  return new Promise<Blob>((resolve, reject) => {
    const id = 1;
    const worker = new CryptoWorker();
    let settled = false;

    const cleanup = () => {
      worker.terminate();
      callbacks.signal?.removeEventListener("abort", onAbort);
    };

    const finish = (settle: (value: any) => void, value: any) => {
      if (settled) return;
      settled = true;
      cleanup();
      settle(value);
    };

    function onAbort() {
      worker.postMessage({ type: "abort", id });
      finish(reject, cancelledError());
    }

    if (callbacks.signal?.aborted) {
      onAbort();
      return;
    }
    callbacks.signal?.addEventListener("abort", onAbort, { once: true });

    worker.onmessage = (event: MessageEvent<CryptoJobMessage>) => {
      const message = event.data;
      switch (message.type) {
        case "progress":
          callbacks.onProgress?.(message.bytes);
          break;
        case "filename":
          callbacks.onFilename?.(message.filename);
          break;
        case "done":
          if (message.tempName) scheduleTempCleanup(message.tempName);
          finish(resolve, message.blob);
          break;
        case "error":
          finish(reject, new Error(message.message));
          break;
      }
    };

    worker.onerror = (event) => {
      finish(reject, new Error(event.message || "Crypto worker failed."));
    };

    worker.postMessage({ ...body, id });
  });
};

const runLocally = async (body: JobBody, callbacks: TaskCallbacks): Promise<Blob> => {
  const controller = new AbortController();
  const onAbort = () => controller.abort();

  if (callbacks.signal?.aborted) throw cancelledError();
  callbacks.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    if (body.kind === "encrypt") {
      return await processFileEncrypt(
        body.file,
        body.password,
        body.keyFile,
        controller.signal,
        (bytes) => callbacks.onProgress?.(bytes),
        body.options,
      );
    }

    if (body.kind === "decrypt") {
      return await processFileDecrypt(
        body.source,
        body.password,
        body.keyFile,
        controller.signal,
        (bytes) => callbacks.onProgress?.(bytes),
        { onFilename: callbacks.onFilename },
      );
    }

    return await rewrapFile(
      body.source,
      body.oldPassword,
      body.oldKeyFile,
      body.newPassword,
      body.newKeyFile,
      body.options,
    );
  } finally {
    callbacks.signal?.removeEventListener("abort", onAbort);
  }
};

export const encryptFileTask = (
  file: Blob,
  password: string | Uint8Array,
  keyFile: ArrayBuffer | null,
  signal: AbortSignal | undefined,
  onProgress: (bytes: number) => void,
  options: EncryptJobOptions = {},
): Promise<Blob> =>
  runJob(
    {
      kind: "encrypt",
      file,
      password: encodePassword(password),
      keyFile,
      options,
    },
    { signal, onProgress },
  );

export const decryptFileTask = (
  source: Blob,
  password: string | Uint8Array,
  keyFile: ArrayBuffer | null,
  signal: AbortSignal | undefined,
  onProgress: (bytes: number) => void,
  onFilename?: (filename: string) => void,
): Promise<Blob> =>
  runJob(
    {
      kind: "decrypt",
      source,
      password: encodePassword(password),
      keyFile,
    },
    { signal, onProgress, onFilename },
  );

export const rewrapFileTask = (
  source: Blob,
  oldPassword: string | Uint8Array,
  oldKeyFile: ArrayBuffer | null,
  newPassword: string | Uint8Array,
  newKeyFile: ArrayBuffer | null,
  options: RewrapJobOptions = {},
): Promise<Blob> =>
  runJob(
    {
      kind: "rewrap",
      source,
      oldPassword: encodePassword(oldPassword),
      oldKeyFile,
      newPassword: encodePassword(newPassword),
      newKeyFile,
      options,
    },
    {},
  );
