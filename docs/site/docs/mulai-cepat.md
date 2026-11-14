---
sidebar_position: 2
slug: /mulai-cepat
title: "Quick Start"
description: "Quick steps to encrypt and decrypt files with AegisCrypt in the browser."
---

# Quick Start

AegisCrypt runs as a static web app. You do not need to install dependencies or create an account to use the core encryption features.

## Prerequisites

- A modern browser with support for `crypto.subtle`, `File`, `Blob`, and (recommended) Web Workers.
- An internet connection to load the app for the first time. Once assets are cached, cryptographic operations can run locally/offline.

## 1. Open the app

Go to [aegiscrypt.bangkah.tech](https://aegiscrypt.bangkah.tech).

<div className="screenshot-frame">
  <img src="/screenshots/login.png" alt="AegisCrypt login screen" />
</div>
<div className="screenshot-caption">Start screen: choose a credential mode, enter a password, and optionally add a keyfile or recovery key.</div>

## 2. Start a session

1. Enter a **strong password**.
2. (Optional) Enable a **keyfile** and choose any file as an additional factor. The exact same keyfile is required for decryption.
3. Click **Start Session**.

:::warning Keep your credentials safe
Without the correct password and keyfile (or a valid recovery key for files that include a recovery slot), encrypted files cannot be recovered. AegisCrypt does not provide server-side password reset.
:::

## 3. Encrypt files

1. Add files or folders to the queue (drag and drop or use the file picker).
2. Click **Encrypt**.
3. Monitor progress and operation status.
4. Download the output file with the `.aegis` extension (the container name is typically `original-name.ext.aegis`).

<div className="screenshot-frame">
  <img src="/screenshots/dashboard.png" alt="AegisCrypt processing dashboard" />
</div>
<div className="screenshot-caption">Dashboard: file queue, encrypt/decrypt actions, progress, and logs.</div>

## 4. Decrypt files

1. Start a session with the **same password and keyfile** used for encryption.
2. Add the `.aegis` file(s).
3. Click **Decrypt**.
4. Save the result. If the container stores encrypted filename metadata, the original name is restored from metadata.

## 5. Advanced options (optional)

| Feature | When to use | Notes |
| --- | --- | --- |
| **Keyfile** | Add a second factor beyond the password | Key material uses the SHA-256 hash of the keyfile bytes. |
| **Recovery key** | Backup access if the password/keyfile is lost | Must be created and saved before/during encryption of the relevant files; only works for files that include a recovery slot. |
| **Rewrap** | Change the password/keyfile | Rewrites the header without re-encrypting the payload. |
| **PWA/offline** | Repeated use or no network | Install from the browser; cache stores only app assets, not user files. |

## Next steps

- Learn the full workflows in the [User Guide](/panduan-pengguna).
- Understand guarantees and limits in the [Security Model](/keamanan).
- See the container structure in the [.aegis v3 Format](/format-file).
- If you run into issues, check [Troubleshooting](/troubleshooting).
