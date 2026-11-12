/**
 * Messages exchanged with the crypto worker. Kept in a dependency-free module
 * so both the worker and the main-thread client can import the types.
 */

export interface EncryptJobOptions {
  iterations?: number;
  chunkSize?: number;
  filename?: string | null;
}

export interface RewrapJobOptions {
  iterations?: number;
}

export type CryptoJobRequest =
  | {
      id: number;
      kind: "encrypt";
      file: Blob;
      password: Uint8Array;
      keyFile: ArrayBuffer | null;
      options: EncryptJobOptions;
    }
  | {
      id: number;
      kind: "decrypt";
      source: Blob;
      password: Uint8Array;
      keyFile: ArrayBuffer | null;
    }
  | {
      id: number;
      kind: "rewrap";
      source: Blob;
      oldPassword: Uint8Array;
      oldKeyFile: ArrayBuffer | null;
      newPassword: Uint8Array;
      newKeyFile: ArrayBuffer | null;
      options: RewrapJobOptions;
    };

export type CryptoJobMessage =
  | { id: number; type: "progress"; bytes: number }
  | { id: number; type: "filename"; filename: string }
  | { id: number; type: "done"; blob: Blob; tempName?: string }
  | { id: number; type: "error"; message: string };

export interface CryptoAbortMessage {
  type: "abort";
  id: number;
}

export type CryptoWorkerInbound = CryptoJobRequest | CryptoAbortMessage;
