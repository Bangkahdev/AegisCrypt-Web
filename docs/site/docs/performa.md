---
sidebar_position: 8
slug: /performa
title: "Performance & Limits"
description: "Performance characteristics, memory usage, browser support, format limits, and benchmark notes for AegisCrypt."
---

# Performance & Limits

This page describes AegisCrypt's performance characteristics and practical limits. Actual numbers depend on the device, browser, file size, and OPFS availability.

## Technical summary

| Aspect | Value |
| --- | --- |
| Cipher | AES-256-GCM (128-bit tag) |
| KDF | PBKDF2-HMAC-SHA256 |
| PBKDF2 iterations | Default 600,000, range 600,000-5,000,000 |
| Salt / fileId / nonce prefix | 32 / 16 / 4 bytes (random per file) |
| Chunk size | Default 1 MiB, range 64 KiB-16 MiB |
| v3 header | 128 bytes (fixed) + optional metadata/slot |
| Overhead per record | 5-byte record header + 16-byte tag |
| Filename metadata | 2-byte length + ciphertext+tag (UTF-8 name \<= 1024 bytes) |
| Recovery slot | 60 bytes (optional) |
| Read compatibility | v3 and legacy v2 |

## UI responsiveness

- Key derivation (PBKDF2) and encryption/decryption run in a **Web Worker** to keep the UI responsive.
- Progress and cancellation are handled via worker messages/abort signals.
- In environments without Workers, operations may fall back to the main thread.

## Memory and temporary storage model

| Scenario | Behavior | Implication |
| --- | --- | --- |
| **Decryption + OPFS available** | Plaintext is written incrementally to a temporary OPFS file | RAM usage is more controlled; requires origin storage quota |
| **Decryption without OPFS** | In-memory sink fallback (Blob/buffer) | RAM can scale with decrypted output size |
| **Encryption (Web)** | Input is read in chunks, output assembled as a Blob | Peak memory can increase for very large files (browser-dependent) |
| **Desktop** | Seekable stream I/O | Caller writes to a temporary output and publishes on success |

:::warning Quota and cleanup
OPFS-based decryption may require additional temporary space (e.g. during download/deferred cleanup). Cleanup is best-effort and not a guaranteed secure erase. If quota is insufficient, use smaller files, free site/origin storage, or process separately.
:::

## Browser support

Required or strongly recommended:
- **Web Crypto API** (`crypto.subtle`) in a secure context (HTTPS/localhost)
- **File/Blob/File.slice** for file reading
- **Web Worker** for responsiveness
- **OPFS** (`navigator.storage.getDirectory`) optional for lower-memory decryption
- **Service Worker + Cache Storage** for PWA/offline

Compatibility is tested on major modern engines (Chromium/Firefox/WebKit) in project testing; OPFS/quota behavior can vary by browser and profile.

## Format and operational limits

- Out-of-range parameters (iterations, chunk, flags, metadata/record sizes) are rejected.
- Each DEK/file has a record count limit per the current specification policy (`MAX_RECORDS`, *provisional*).
- Corrupted/tampered/truncated/trailing `.aegis` files are rejected (fail closed).
- v2 is supported for **read/decrypt** only; new writes are always v3.
- Decrypted filenames follow encrypted metadata (if present) or are derived from the container name; unsafe characters are not accepted.

## Performance tips

- Use an up-to-date desktop browser for large files.
- Close other heavy tabs/apps when processing very large files.
- Process large files one at a time to reduce memory/quota pressure.
- Ensure sufficient device space and browser origin quota (especially for large OPFS decryption).
- To change credentials on large files, use **rewrap** (more efficient than re-encrypting the payload).

## Local benchmarks (development)

The Web repo provides a throughput benchmark (Playwright/Chromium) from `apps/web`:

```bash
npm run build
npm run test:bench
```

Size variation (example):

```bash
BENCH_SIZE_MB=256 npm run test:bench
```

```powershell
$env:BENCH_SIZE_MB=256; npm run test:bench
```

Notes:
- Results include KDF overhead, browser pipeline, and test download/storage overhead; this is **not** pure AES throughput.
- Use for relative comparisons between changes on the same machine.
- Very large test files can be affected by browser/test-profile quota.

## References

- [Architecture](/arsitektur)
- [.aegis v3 Format](/format-file)
- [Troubleshooting](/troubleshooting)
