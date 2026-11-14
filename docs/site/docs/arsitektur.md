---
sidebar_position: 4
slug: /arsitektur
title: "Architecture"
description: "AegisCrypt client architecture, cryptographic data flow, Web Workers, temporary storage, and offline model."
---

# Architecture

AegisCrypt Phase 1 is a **client-side** cryptography application. The web app is served as static assets, while all encryption/decryption runs on the user's device.

## Component overview

| Component | Technology / Location | Role |
| --- | --- | --- |
| UI | React 19, Vite (`apps/web/src`) | Credential input, file queue, progress, logs, dialogs |
| Web crypto engine | `apps/web/src/services/cryptoService.ts` | Parse/write v3 header, KDF, wrap/unwrap DEK, records, metadata, rewrap, read v2 |
| Worker | `cryptoWorker.ts` / `cryptoWorkerClient.ts` | Run heavy operations off the UI thread |
| File I/O | `apps/web/src/lib/files.ts` | Read sources, output sinks, quota/support detection |
| PWA | `apps/web/public/sw.js`, manifest | Cache the app shell for offline loading |
| Desktop | `apps/desktop/src/AegisCrypt.*` (.NET 8) | Core/CLI/App implementation with format parity |
| Distribution | Cloudflare Workers (static assets) | Serves the app and documentation |

## Encryption flow (Web, summary)

1. The user provides a password and optional keyfile.
2. `KeyMaterial = UTF8(password) || SHA-256(keyfile bytes)` (keyfile optional) is prepared.
3. A KEK is derived with PBKDF2-HMAC-SHA256 (random salt, iterations from parameters/header).
4. A random 256-bit DEK is wrapped (AES-256-GCM) with header AAD.
5. Filename metadata (optional) and payload are encrypted per record with the DEK; nonce/AAD bind file context and index.
6. A `.aegis` v3 container is produced and downloaded to the user's device.

## Decryption flow (Web, summary)

1. The parser validates magic, version, KDF, flags, and parameter ranges.
2. The DEK is unwrapped via credentials (KEK) or the recovery slot (when selected and available).
3. Filename metadata (if present) is decrypted and validated.
4. Records are processed in order; each GCM tag is verified, a final record is required, and trailing bytes after the final record are rejected.
5. Plaintext is written to the output sink; on failure, partial output is aborted/discarded.

## Envelope encryption & rewrap

- **DEK per file:** encrypts payload/metadata.
- **Credential-derived KEK:** wraps the DEK (stored in the header).
- **Rewrap:** changes the DEK wrapping (and related header parameters) without re-encrypting the payload; data after the header is copied.

## Web Worker and responsiveness

- KDF and encryption/decryption run in a worker (with a fallback to the main thread if workers are unavailable).
- The UI receives progress updates and can cancel operations.
- The worker is terminated after each operation completes.

## Temporary storage and memory model

Memory behavior depends on the operation type and browser API availability:

| Operation / condition | Behavior |
| --- | --- |
| **Decryption with OPFS available** | Plaintext is written incrementally to a temporary OPFS file; RAM usage can be bounded (does not hold the entire result in memory). |
| **Decryption without OPFS** | A fallback may buffer the result in memory (Blob/buffer), so memory use can scale with output size. |
| **Encryption (Web)** | Input is read in chunks, but the container output is assembled as a Blob; peak memory may depend on browser implementation/file size. |
| **Desktop** | Stream-based I/O; the caller is responsible for writing to a temporary output and publishing only on success. |

Cleanup of temporary files is best-effort; it is **not** a guaranteed secure erase on SSDs/journals/snapshots.

## Offline and trust boundaries

- **Offline:** after assets are loaded/cached, cryptography requires no network access.
- **Cache:** the service worker stores static app assets, not user data.
- **Trust boundary:** confidentiality depends on the integrity of the browser/OS/device. Threats and residual risks are discussed in the [Security Model](/keamanan).

## Web and Desktop parity

- The byte-format contract is defined by the `.aegis` v3 specification and frozen fixtures/test vectors.
- Web and Desktop implementations are tested to read/write compatible containers and handle errors consistently.
- Format changes require updates to the specification, test vectors, and both implementations.

## References

- [Security Model](/keamanan)
- [.aegis v3 Format](/format-file)
- [Performance & Limits](/performa)
- [v3 specification (repo)](https://github.com/Bangkahdev/AegisCrypt-Web/blob/main/docs/specs/spec-aegis-v3.md)
