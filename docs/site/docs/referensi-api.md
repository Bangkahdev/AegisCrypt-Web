---
sidebar_position: 6
slug: /referensi-api
title: "Web API Reference"
description: "Reference for public cryptography functions and constants in the AegisCrypt Web implementation."
---

# Web API Reference

This reference summarizes the main cryptography interfaces in `apps/web/src/services/cryptoService.ts`, `apps/web/src/constants.ts`, and related utilities. It is intended for developers reading or integrating the Web code in the monorepo.

:::info
This API surface is an internal TypeScript module interface (not a stabilized public npm SDK). Normative container behavior is defined by the [v3 specification](/format-file).
:::

## Main modules

| Module | Contents |
| --- | --- |
| `apps/web/src/services/cryptoService.ts` | Encrypt, decrypt, rewrap, key derivation, sinks, filename helpers, `AegisError` |
| `apps/web/src/constants.ts` | v3/v2 format constants, parameter limits, header offsets, AAD domains |
| `apps/web/src/lib/recovery.ts` | Recovery key generation/codec and slot utilities |
| `apps/web/src/lib/errors.ts` | Error message mapping to UI i18n keys |

## Important types and options

### Source & password

- **`password`**: `string | Uint8Array` (UTF-8). Byte form allows zeroization in the UI.
- **`keyFileBuffer`**: `ArrayBuffer | null | undefined`.
- **Decrypt/rewrap source (`source`)**: `File | Blob | ArrayBuffer` (streaming reads supported for `Blob/File`).

### Encryption options

| Option | Type | Description |
| --- | --- | --- |
| `iterations` | `number` | PBKDF2 iterations (600,000-5,000,000) |
| `chunkSize` | `number` | Plaintext chunk size (64 KiB-16 MiB) |
| `filename` | `string \| null` | UTF-8 name for encrypted metadata (flag bit2); `null`/empty disables |
| `recoveryKey` | `Uint8Array` | Include a recovery slot (32 bytes) |
| `randomBytes` | `(n) => Uint8Array` | RNG injection for deterministic tests |

### Decryption options

| Option | Type | Description |
| --- | --- | --- |
| `sink` | `DecryptSink` | Plaintext output destination |
| `recoveryKey` | `Uint8Array` | Unlock DEK via recovery slot |
| `onFilename` | `(name: string) => void` | Callback for filename from encrypted metadata |

### Rewrap options

| Option | Type | Description |
| --- | --- | --- |
| `iterations` | `number` | New iterations (defaults to preserving the old value) |
| `randomBytes` | `(n) => Uint8Array` | RNG injection for deterministic tests |

## Functions

| Function | Signature (summary) | Result / behavior |
| --- | --- | --- |
| `prepareKeyMaterial` | `(password, keyFileBuffer?) => Promise<Uint8Array>` | `UTF8(password) \|\| SHA-256(keyfile)` or password only |
| `deriveKey` | `(keyMaterial, salt, usage, iterations?) => Promise<CryptoKey>` | AES-GCM key via PBKDF2-HMAC-SHA256 |
| `processFileEncrypt` | `(file, password, keyFileBuffer?, signal?, onProgress?, options?) => Promise<Blob>` | `.aegis` v3 container; supports cancellation/progress |
| `processFileDecrypt` | `(source, password, keyFileBuffer?, signal?, onProgress?, options?) => Promise<Blob>` | Authenticated plaintext; supports v3 and legacy v2 (read) |
| `rewrapFile` | `(source, oldPassword, oldKeyFile?, newPassword, newKeyFile?, options?) => Promise<Blob>` | New header, payload/metadata/slot preserved per rules |
| `createDefaultSink` | `() => Promise<DecryptSink>` | OPFS when available, in-memory fallback |
| `createBlobSink` | `() => DecryptSink` | In-memory (Blob) sink |
| `getEncryptedFilename` | `(originalName) => string` | Appends `.aegis` extension |
| `getDecryptedFilename` | `(encryptedName) => string` | Strips `.aegis` or provides a fallback name |

> Note: `onProgress` receives byte progress values (the implementation may report processed source bytes/read position; see `cryptoService.ts`/worker for call details).

## Decryption sink

`DecryptSink` provides an incremental write interface (`write`), finalization (`close` -> `Blob`/result), and cancellation/cleanup (`abort`). Use `createDefaultSink()` to select OPFS when available.

## Errors (`AegisError`)

The crypto engine throws structured errors for conditions such as:

- invalid format/version/KDF/flags/iterations/chunk size
- corrupted or invalid filename metadata
- truncated container, missing final record, trailing data, invalid record structure
- authentication failure/tamper, wrong credentials
- missing recovery slot or wrong recovery key
- corrupted legacy v2 container
- cancelled operation

The UI maps these messages to localized text via `apps/web/src/lib/errors.ts`.

## Important constants (`constants.ts`)

| Constant | Value / meaning |
| --- | --- |
| Magic / version | `AEGIS`, v3 write, v2 read |
| Header | 128 bytes, 68-byte wrap AAD |
| KDF | PBKDF2-SHA256 (`0x01`), 600,000-5,000,000 iterations, 32-byte salt |
| Chunk | default 1 MiB, range 64 KiB-16 MiB |
| Record | 5-byte header, 16-byte tag, 43-byte AAD, final flag |
| Recovery | 60-byte slot, `AEGISRCV` domain, 30-byte AAD |
| Filename metadata | `AEGISFNM` domain, 36-byte AAD, reserved nonce index `2^64-1`, max 1024-byte name |
| Record limit | `MAX_RECORDS` (provisional, see specification) |

## Usage example (conceptual)

```ts
import { processFileEncrypt, processFileDecrypt } from "@/services/cryptoService";

const container = await processFileEncrypt(file, password, keyFileBuffer, abortSignal, onProgress, {
  iterations: 600_000,
  filename: file.name,
});

const plaintext = await processFileDecrypt(container, password, keyFileBuffer, abortSignal, onProgress, {
  onFilename: (name) => console.log(name),
});
```

## References

- [.aegis v3 Format](/format-file)
- [Architecture](/arsitektur)
- [Security Model](/keamanan)
