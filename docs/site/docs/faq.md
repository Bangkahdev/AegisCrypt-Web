---
sidebar_position: 11
slug: /faq
title: "FAQ"
description: "Common questions about privacy, credentials, recovery keys, compatibility, offline use, and AegisCrypt limitations."
---

# FAQ

## Privacy and data transmission

### Does AegisCrypt upload my files or passwords?
No. Core cryptographic operations run on the client (browser/device). Files, passwords, keyfiles, recovery keys, and derived keys are not sent to the app server.

### Does AegisCrypt store key backups?
No. AegisCrypt does not store passwords, keyfiles, or recovery keys for you. Keep credentials and backups yourself.

## Credentials and recovery

### What is the difference between a password, keyfile, and recovery key?
- **Password:** the primary secret entered by the user.
- **Keyfile (optional):** an additional factor; the SHA-256 hash of the keyfile bytes is combined into the key material.
- **Recovery key (optional):** a 256-bit key to unlock the recovery slot on files that include one.

### Can files be recovered if the password/keyfile is lost?
Only if you have a **valid recovery key** and the file was encrypted with a **recovery slot**. Without matching credentials, files cannot be recovered.

### Can a recovery key replace the password for everything?
No. A recovery session is intended for recovery/decryption of files that have a recovery slot. It is not used to encrypt new files or change the password.

### Does changing the password (rewrap) invalidate the recovery key?
No. The recovery slot is copied during rewrap and remains bound to the file (via `fileId`), so the same recovery key remains valid.

## Features and compatibility

### Are filenames encrypted?
The original name can be stored as **encrypted metadata** inside the v3 container (flag bit2). However, the downloaded container name usually still reflects the original name (e.g. `document.pdf.aegis`), so rename the container if the filename itself is sensitive.

### Can I change the password without re-encrypting the entire file?
Yes. Use **rewrap**: the DEK is unlocked with old credentials and re-wrapped with new credentials, so the payload does not need to be re-encrypted.

### Can old v2 files still be opened?
Yes, the current implementation can read/decrypt legacy v2 containers. New container writes always use v3 format.

### Is AegisCrypt Web compatible with Desktop?
The goal is yes: Web and Desktop share the `.aegis` v3 format and test vectors for parity. Always verify with a round-trip test for important data.

## Offline, PWA, and performance

### Can it be used offline?
Yes, after app assets have been successfully loaded and cached by the service worker. Cryptographic features run locally without a network.

### Are my files stored in the PWA cache?
No. The PWA cache is intended for the app shell/static assets, not user files, passwords, or plaintext.

### Why can processing large files be slow or fail?
Common factors: KDF (high iterations), file size, device performance, OPFS availability, and browser storage quota. See [Performance & Limits](/performa) and [Troubleshooting](/troubleshooting).

## Errors and security

### Why does decryption fail even though I think the password is correct?
Common causes: non-identical password/keyfile, truncated/tampered file, not a valid v3/v2 container, missing recovery slot/wrong key, or mismatched parameters/context. AegisCrypt rejects output if authentication/integrity fails.

### Is AegisCrypt safe if my device is infected with malware?
No encryption app can fully protect data on a compromised device/OS/browser. Secure the endpoint first.

### Where do I report a vulnerability?
Use the process in [SECURITY.md](https://github.com/Bangkahdev/AegisCrypt-Web/blob/main/SECURITY.md). Do not open a public issue for security problems.

## References

- [Quick Start](/mulai-cepat)
- [User Guide](/panduan-pengguna)
- [Security Model](/keamanan)
- [.aegis v3 Format](/format-file)
