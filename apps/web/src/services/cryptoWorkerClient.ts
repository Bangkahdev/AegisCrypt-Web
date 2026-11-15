import { AegisError, processFileDecrypt, processFileEncrypt, rewrapFile } from "./cryptoService";
import CryptoWorker from "../workers/cryptoWorker?worker";
import type {
  CryptoJobMessage,
  CryptoJobRequest,
  DecryptJobOptions,
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

/** How long the main thread waits for the worker to confirm cleanup abort. */
const ABORT_CLEANUP_TIMEOUT_MS = 5_000;

/** Best-effort removal of an OPFS temp file owned by the worker. */
const removeTempEntry = async (name: string): Promise<void> => {
  if (typeof navigator === "undefined") return;
  const storage = navigator.storage;
  if (!storage || typeof storage.getDirectory !== "function") return;
  try {
    const root = await storage.getDirectory();
    await root.removeEntry(name);
  } catch {
    /* best effort */
  }
};

/**
 * OPFS temp files created by the worker cannot be removed by the worker after
 * it is terminated, so the main thread schedules the cleanup instead.
 */
const scheduleTempCleanup = (name: string): void => {
  if (typeof window === "undefined") return;
  const storage = navigator.storage;
  if (!storage || typeof storage.getDirectory !== "function") return;

  let done = false;
  const remove = () => {
    if (done) return;
    done = true;
    storage
      .getDirectory()
      .then((root) => root.removeEntry(name))
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
    let jobPosted = false;
    let aborting = false;
    let tempName: string | undefined;
    let abortTimer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      if (abortTimer !== undefined) clearTimeout(abortTimer);
      worker.terminate();
      callbacks.signal?.removeEventListener("abort", onAbort);
    };

    const finish = <T>(settle: (value: T) => void, value: T) => {
      if (settled) return;
      settled = true;
      cleanup();
      settle(value);
    };

    const discardTemp = async (): Promise<void> => {
      if (!tempName) return;
      const name = tempName;
      tempName = undefined;
      await removeTempEntry(name);
    };

    function onAbort() {
      if (settled || aborting) return;
      aborting = true;
      if (!jobPosted) {
        finish(reject, cancelledError());
        return;
      }
      // Do not terminate here: the worker still has to abort its sink, which
      // closes the writable stream and deletes the OPFS temp file. Wait for its
      // acknowledgment (bounded by a fallback in case it never arrives).
      worker.postMessage({ type: "abort", id });
      abortTimer = setTimeout(() => {
        void discardTemp().finally(() => finish(reject, cancelledError()));
      }, ABORT_CLEANUP_TIMEOUT_MS);
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
        case "temp":
          tempName = message.tempName;
          break;
        case "aborted":
          void discardTemp().finally(() => finish(reject, cancelledError()));
          break;
        case "done":
          if (aborting) {
            if (message.tempName) void removeTempEntry(message.tempName);
            finish(reject, cancelledError());
            break;
          }
          tempName = undefined;
          if (message.tempName) scheduleTempCleanup(message.tempName);
          finish(resolve, message.blob);
          break;
        case "error":
          void discardTemp().finally(() => finish(reject, new Error(message.message)));
          break;
      }
    };

    worker.onerror = (event) => {
      void discardTemp().finally(() =>
        finish(reject, new Error(event.message || "Crypto worker failed.")),
      );
    };

    jobPosted = true;
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
        { onFilename: callbacks.onFilename, recoveryKey: body.options.recoveryKey },
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
  options: DecryptJobOptions = {},
): Promise<Blob> =>
  runJob(
    {
      kind: "decrypt",
      source,
      password: encodePassword(password),
      keyFile,
      options,
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
