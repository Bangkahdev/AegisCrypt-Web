---
sidebar_position: 3
slug: /panduan-pengguna
title: "User Guide"
description: "Complete guide to using AegisCrypt: sessions, encryption/decryption, keyfiles, recovery keys, rewrap, offline use, and safe practices."
---

# User Guide

This page explains how to use AegisCrypt in the web app, including additional security features and operational limits.

## Starting a session

AegisCrypt requires credentials to derive encryption keys during an active session.

1. Open the app and choose a sign-in mode: **Password** or **Recovery key** (for recovery/decryption of files that include a recovery slot).
2. Provide credentials:
   - **Password:** your password, optionally with a keyfile.
   - **Recovery key:** a 32-byte key (hex format) for files that include a recovery slot.
3. Start the session. Credentials are used for cryptographic operations on the client.

:::info Keyfile
A keyfile is any file whose bytes are hashed (SHA-256) and combined into the key material. Changing a single byte in the keyfile produces a different key. Use a stable copy and keep a backup.
:::

## Encrypting files

1. Ensure a session is active with a password (and keyfile if used).
2. Add files or folders to the **Processing Queue**.
3. Run **Encrypt**.
4. When finished, download the `.aegis` output.

**Behavior notes:**
- Encryption processes data in chunks (default 1 MiB; per container parameters).
- The original filename can be stored as encrypted metadata inside the container (current implementation), while the downloaded container name still includes the original name (`name.ext.aegis`). Rename the container if the filename itself is sensitive.
- Heavy operations run in a Web Worker to keep the UI responsive.

## Decrypting files

1. Start a session with matching credentials:
   - The same password + keyfile, or
   - A recovery key (only for files that include a recovery slot).
2. Add `.aegis` file(s).
3. Run **Decrypt**.
4. Save the result.

If authentication or integrity fails, decryption is aborted and partial output is not published.

## Batch and folder processing

- You can add multiple files at once or drop folders (if supported by the browser) to process them in a queue.
- Processing runs per file; monitor status, progress, and logs.
- For very large files or memory-constrained devices, process one at a time to reduce memory/storage pressure.

## Recovery key

A recovery key is a separate 256-bit key that can unlock a file's **DEK** through the recovery slot.

### Create and store
1. Sign in with a password.
2. Open the **Recovery key** menu/dialog.
3. Generate the key, then copy or download it to secure offline storage.

### When it applies
- Files encrypted when/with a recovery slot included will carry the recovery flag.
- Older files without a recovery slot **cannot** be opened with a recovery key.

### Recovery session limits
- A recovery-key session is intended for **decryption/recovery**.
- It is not used to encrypt new files or change the password.

:::warning
AegisCrypt does not store the recovery key. If the key is lost and the password/keyfile are also unavailable, the data cannot be recovered.
:::

## Changing password / keyfile (Rewrap)

**Rewrap** re-wraps the DEK with new credentials without re-encrypting the payload.

1. Add a valid `.aegis` file.
2. Open **Change password** / rewrap.
3. Enter the old credentials (to unlock the DEK) and the new credentials.
4. (Optional) Adjust PBKDF2 iterations within the supported range.
5. Download the rewrapped file and keep it as a new copy.

Rewrap requires correct old credentials. The recovery slot (if present) is copied as-is and remains bound to the `fileId`, so the same recovery key remains valid for that file.

## Session lock, auto-lock, and cleanup

- A session can be locked manually or automatically after a period of inactivity (per app settings).
- When a session is locked/ended, the app clears the queue and makes a best-effort attempt to zeroize sensitive material in the UI (e.g. password/keyfile buffers managed as bytes).
- Close the tab/browser on shared devices to reduce exposure risk.

## Interface language

The app supports English and Indonesian. The language can be switched from the header and is remembered for future visits (when browser storage is available).

## Offline mode and PWA installation

- **Install:** use the browser's *Install* option where PWA is supported.
- **Offline:** after the first successful load, the service worker can serve the app shell from cache.
- **Updates:** reload while online to fetch a new version.
- **Cache privacy:** the service worker does not store user files, passwords, keyfiles, or plaintext.

## Recommended practices

- Use a long, unique password and store it in a trusted password manager.
- Keep keyfiles and recovery keys in separate, secure locations (offline/encrypted).
- Verify decryption of important files before deleting originals.
- Back up `.aegis` files and credentials separately.
- Keep your browser up to date for Web Crypto/OPFS support and security fixes.

## Related

- [Security Model](/keamanan)
- [.aegis v3 Format](/format-file)
- [Troubleshooting](/troubleshooting)
- [FAQ](/faq)
