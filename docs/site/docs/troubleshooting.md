---
sidebar_position: 10
slug: /troubleshooting
title: "Troubleshooting"
description: "Solutions for common issues when using AegisCrypt: credentials, format, integrity, memory/quota, and app updates."
---

# Troubleshooting

Use this page to diagnose common issues. If a failure may involve a security vulnerability, follow the [security reporting policy](https://github.com/Bangkahdev/AegisCrypt-Web/blob/main/SECURITY.md).

## Common issues

| Symptom | Common cause | Action |
| --- | --- | --- |
| "Invalid file format" / not recognized | File is not a valid `.aegis` container or is severely corrupted | Ensure the correct file is selected and was not truncated during transfer |
| "Unsupported file version" | Container created by an unsupported version/format | Use the latest app version; old v2 can be read, future formats require a compatible app |
| "Wrong password or keyfile" | Credentials do not match, different keyfile, or header/unwrap authentication failed | Verify the password, ensure the keyfile is byte-identical; try the original keyfile copy |
| "This file has no recovery slot" | File does not include a recovery slot | Decrypt with the original password/keyfile; recovery slot only exists if enabled at encryption time |
| "Wrong recovery key or corrupted slot" | Incorrect recovery key or modified slot | Recheck the key (format/characters), use the correct backup key |
| "Filename metadata is corrupted..." | Encrypted metadata block is invalid/tampered | Restore from an intact container backup |
| "File is truncated or incomplete" | Incomplete download/copy | Copy the `.aegis` file again from an intact source |
| "Final record not found" / "Data after final record" / "Invalid record structure" | Container truncated, modified, or invalidly structured | Do not use the result; restore from a trusted backup |
| "File authentication failed; data tampered..." | GCM tag failed (tamper/wrong context credentials) | Verify credentials; if it persists, treat as corrupted/tampered and use a backup |
| Insufficient storage/quota | OPFS/origin storage full during decryption/operation | Free space/site quota, close other tabs, process smaller files or one at a time |
| App looks outdated after update | Service worker serving cached app shell | Reload while online; if needed, clear site data for the domain and reopen |
| Cannot open offline | App shell cache not yet created or was cleared | Open once while online and wait for load to complete; ensure SW/PWA is not blocked |
| UI slow/unresponsive | Limited device, very large file, or non-worker fallback | Use an up-to-date browser, process incrementally, close other apps; check if Worker/OPFS is available |

## Quick checks

1. **Credentials:** retry with the exact same password (including case/spaces) and identical keyfile.
2. **File integrity:** compare container size/hash with the original/backup copy.
3. **Storage space:** ensure sufficient disk space and browser storage quota.
4. **App version:** reload to ensure this is not an old-cache issue.
5. **Isolate:** try another small file to distinguish credential/file issues from browser environment issues.

## When to stop

- If an important file appears corrupted/tampered, stop overwrite attempts and use a backup.
- If the device is suspected to be compromised, do not enter sensitive credentials; secure the device first.
- If the password, keyfile, and recovery key are all lost, encrypted data cannot be recovered by design.

## Useful info when reporting a (non-security) bug

Include (without sharing sensitive data/plaintext/credentials):
- app version/commit, browser and OS
- reproduction steps
- displayed error message
- approximate file size and whether OPFS/offline is active
- whether the issue occurs with other files

Report non-security bugs on [GitHub Issues](https://github.com/Bangkahdev/AegisCrypt-Web/issues).
