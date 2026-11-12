import {
  createDefaultSink,
  processFileDecrypt,
  processFileEncrypt,
  rewrapFile,
} from "../services/cryptoService";
import type {
  CryptoAbortMessage,
  CryptoJobMessage,
  CryptoJobRequest,
} from "../services/cryptoWorkerProtocol";

/**
 * Dedicated worker that runs the KDF and AES-GCM work off the main thread so
 * the UI keeps painting during 600k+ PBKDF2 iterations and large files.
 *
 * One worker handles one job, then the client terminates it.
 */

const scope = self as unknown as {
  postMessage(message: CryptoJobMessage): void;
  onmessage: ((event: MessageEvent<CryptoJobRequest | CryptoAbortMessage>) => void) | null;
};

let active: AbortController | null = null;

const post = (message: CryptoJobMessage) => scope.postMessage(message);

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

scope.onmessage = async (event) => {
  const request = event.data;

  if ((request as CryptoAbortMessage).type === "abort") {
    active?.abort();
    return;
  }

  const job = request as CryptoJobRequest;
  const controller = new AbortController();
  active = controller;

  const passwords: Uint8Array[] = [];
  const keyFiles: ArrayBuffer[] = [];

  try {
    let blob: Blob;
    let tempName: string | undefined;

    if (job.kind === "encrypt") {
      passwords.push(job.password);
      if (job.keyFile) keyFiles.push(job.keyFile);
      blob = await processFileEncrypt(
        job.file,
        job.password,
        job.keyFile,
        controller.signal,
        (bytes) => post({ id: job.id, type: "progress", bytes }),
        job.options,
      );
    } else if (job.kind === "decrypt") {
      passwords.push(job.password);
      if (job.keyFile) keyFiles.push(job.keyFile);
      const sink = await createDefaultSink();
      blob = await processFileDecrypt(
        job.source,
        job.password,
        job.keyFile,
        controller.signal,
        (bytes) => post({ id: job.id, type: "progress", bytes }),
        {
          sink,
          onFilename: (filename) => post({ id: job.id, type: "filename", filename }),
        },
      );
      tempName = sink.tempName;
    } else {
      passwords.push(job.oldPassword, job.newPassword);
      if (job.oldKeyFile) keyFiles.push(job.oldKeyFile);
      if (job.newKeyFile) keyFiles.push(job.newKeyFile);
      blob = await rewrapFile(
        job.source,
        job.oldPassword,
        job.oldKeyFile,
        job.newPassword,
        job.newKeyFile,
        job.options,
      );
    }

    post({ id: job.id, type: "done", blob, tempName });
  } catch (error) {
    post({ id: job.id, type: "error", message: errorMessage(error) });
  } finally {
    active = null;
    for (const password of passwords) password.fill(0);
    for (const keyFile of keyFiles) new Uint8Array(keyFile).fill(0);
  }
};
