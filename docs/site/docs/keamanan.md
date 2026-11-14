---
sidebar_position: 7
slug: /keamanan
title: "Security Model"
description: "Zero-knowledge principles, cryptographic properties, mitigated threats, limitations, and user responsibilities."
---

# Security Model

This document summarizes AegisCrypt's security model for the current implementation (Web/Desktop, `.aegis` v3 format). Detailed format specification and threat model are available in the repository.

:::warning Important
AegisCrypt protects the confidentiality and integrity of **file containers** assuming the device, browser/OS, and user credentials are secure. It cannot prevent compromise of the endpoint, malware, malicious extensions, or physical access to an unlocked device.
:::

## Zero-knowledge principle (Phase 1)

- Encryption and decryption are performed **locally** on the user's device.
- Plaintext/ciphertext files, passwords, keyfiles, recovery keys, and derived keys are **not sent** to the app server.
- Static distribution serves only app assets; there is no server-side processing of user data.
- There is no server-side credential recovery mechanism.

## Core cryptographic properties

| Area | Mechanism |
| --- | --- |
| Authenticated cipher | AES-256-GCM (128-bit tag) for payload, filename metadata, and DEK/recovery wrapping |
| Key derivation | PBKDF2-HMAC-SHA256, 32-byte salt, 600,000-5,000,000 iterations (stored in header) |
| Key material | `UTF8(password) \|\| SHA-256(keyfile bytes)` (optional keyfile, byte-exact) |
| Envelope encryption | Random per-file DEK wrapped by KEK; supports rewrap without re-encrypting payload |
| Nonce uniqueness | Record nonce derived deterministically as `prefix(4) \|\| index(8)` per DEK/file |
| Context binding (AAD) | AAD binds header/wrap, records (index/header/fileId/chunk), filename metadata, and recovery domain |
| Recovery | HKDF-SHA256 (`AEGISRCV` + `fileId`) to unlock recovery slot; slot can be copied during rewrap |
| Format validation | Magic/version/KDF/flags/ranges/structure/final record/trailing are validated; authentication failure aborts the operation |

## Threats addressed (summary)

| Threat | Mitigation |
| --- | --- |
| Modification of ciphertext/header/metadata | AES-GCM + AAD; verification failure rejects output |
| Truncation, insertion, reordering, duplication, or trailing bytes | Nonce/AAD indices, final flag, length/structure validation, trailing rejection |
| Offline password guessing (limited) | PBKDF2 with high iterations and random per-file salt; optional keyfile |
| Wrong credentials/recovery key | Unwrap/tag verification fails (controlled error messages) |
| Cross-file/context reuse | `fileId`, nonce prefix, and AAD domains bind data to the container |
| Malicious parameters/structure (parser DoS) | Limits on iterations/chunk/metadata/records and validation before/during processing |

## Limitations and residual risks

- **Compromised device:** malware, keyloggers, malicious extensions, or debuggers can read data/keys while being processed.
- **Memory/runtime:** memory erasure in JS/.NET is not instantly guaranteed by runtimes/GC; the app performs best-effort zeroization on controlled paths.
- **Temporary output:** temporary files (e.g. OPFS/downloads/temp) are cleaned up best-effort, but this is not a secure erase on all media/journals/snapshots.
- **Memory fallback (Web):** when OPFS is unavailable, decryption may use an in-memory fallback; encryption assembles output as a Blob (memory footprint depends on the browser).
- **Metadata & side channels:** container/chunk sizes, downloaded container names, and OS metadata can reveal information.
- **Credential availability:** without valid password/keyfile/recovery key, data cannot be recovered.
- **Assurance status:** v3 format is a frozen candidate; independent cryptographic audit and external review remain part of the readiness plan.

## User responsibilities

- Use a strong, unique password; store keyfiles/recovery keys separately and securely.
- Verify decryption of important files before deleting originals.
- Protect the device (screen lock, OS/browser updates, avoid untrusted devices).
- Understand that sharing a recovery key/password grants access to the data.

## Vulnerability reporting

Do not report security vulnerabilities through public issues. Follow the instructions in [SECURITY.md](https://github.com/Bangkahdev/AegisCrypt-Web/blob/main/SECURITY.md).

## Further reading

- [Architecture](/arsitektur)
- [.aegis v3 Format](/format-file)
- [Threat model (repo)](https://github.com/Bangkahdev/AegisCrypt-Web/blob/main/docs/specs/threat-model-v1.md)
- [v3 specification (repo)](https://github.com/Bangkahdev/AegisCrypt-Web/blob/main/docs/specs/spec-aegis-v3.md)
