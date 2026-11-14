---
sidebar_position: 5
slug: /format-file
title: ".aegis v3 File Format"
description: "Reference for the .aegis v3 container structure: header, envelope encryption, records, filename metadata, recovery slot, and v2 compatibility."
---

# `.aegis` v3 File Format

The `.aegis` v3 container uses **envelope encryption**: the payload is encrypted with a random per-file **DEK**, and the DEK is wrapped by a **KEK** derived from user credentials. The format provides integrity authentication, record-based processing, encrypted filename metadata, an optional recovery slot, and credential rewrap.

:::info Status & source of truth
This page is a reference summary for users and developers. The normative implementation sources are the [v3 specification](https://github.com/Bangkahdev/AegisCrypt-Web/blob/main/docs/specs/spec-aegis-v3.md), code constants, and frozen test vectors in the repository. Current status: *frozen candidate* (D1/DEK usage limits are provisional).
:::

## Conventions

- Multi-byte integers: **big-endian** (except legacy v2 fields stated explicitly).
- Sizes/offsets are in bytes.
- `UTF8(x)` without BOM; `SHA256(x)` = 32 bytes.

## Primitives and parameters

| Function | Details |
| --- | --- |
| Authenticated cipher | AES-256-GCM, 96-bit nonce, 128-bit tag |
| Credential KDF | PBKDF2-HMAC-SHA256 (`kdf_id=0x01`), 32-byte salt, 600,000-5,000,000 iterations, 32-byte output |
| Recovery KDF | HKDF-SHA256, empty salt, info `"AEGISRCV" \|\| fileId`, 32-byte output |
| Keyfile hash | SHA-256 over raw keyfile bytes |
| `chunk_size` | 64 KiB - 16 MiB (default 1 MiB) |

**Key material:** `PasswordBytes || KeyFilePart`, where `PasswordBytes = UTF8(password)` (no Unicode normalization) and `KeyFilePart = SHA256(keyfile bytes)` when a keyfile is used.

## Container layout

```text
[ Fixed header 128 B ]
[ Recovery slot 60 B ]        (if FLAG_RECOVERY)
[ Variable filename metadata ] (if FLAG_FILENAME_METADATA)
[ Record 0 ][ Record 1 ] ...  [ Record N (final) ]
```

`metadataOffset = 128 + (recovery ? 60 : 0)`.

## Fixed header (128 bytes)

| Offset | Size | Field | Description |
| ---: | ---: | --- | --- |
| 0 | 5 | `magic` | ASCII `AEGIS` (`41 45 47 49 53`) |
| 5 | 1 | `version` | `0x03` |
| 6 | 1 | `kdf_id` | `0x01` = PBKDF2-HMAC-SHA256 |
| 7 | 1 | `flags` | bit0 keyfile, bit1 recovery, bit2 filename metadata; other bits rejected |
| 8 | 4 | `iterations` | u32 BE |
| 12 | 4 | `chunk_size` | u32 BE |
| 16 | 32 | `salt` | KDF salt |
| 48 | 16 | `file_id` | unique per-file binding |
| 64 | 4 | `nonce_prefix` | per-file nonce prefix |
| 68 | 12 | `wrap_nonce` | DEK wrapping nonce |
| 80 | 32 | `wrapped_dek` | DEK ciphertext (32 bytes) |
| 112 | 16 | `wrap_tag` | wrap GCM tag (16 bytes) |

**DEK unwrap AAD (68 bytes):** header bytes `0..67` (magic, version, kdf, flags, iterations, chunk size, salt, file id, nonce prefix). Changing any authenticated field causes unwrap to fail.

## Filename metadata (optional)

If `FLAG_FILENAME_METADATA` is set, the metadata block appears after the header/recovery slot:

| Field | Size | Description |
| --- | ---: | --- |
| `ct_len` | 2 | u16 BE, length of ciphertext + tag |
| `sealed` | `ct_len` | AES-256-GCM(DEK) over UTF-8 filename |

- **Nonce:** `nonce_prefix(4) || 0xFFFFFFFFFFFFFFFF` (reserved index, never used by payload records).
- **AAD (36 bytes):** `magic(5) || version(1) || file_id(16) || nonce_prefix(4) || "AEGISFNM"(8) || ct_len(2)`.
- **Policy:** valid UTF-8 name, 1-1024 bytes, no NUL/`/`/`\`.
- Containers without this flag are valid; the decrypted name is derived from the container name.

## Payload records

Each record: 5-byte header + `ct_len` bytes of encrypted data.

| Part | Size | Description |
| --- | ---: | --- |
| `flags` | 1 | bit0 = FINAL; other bits rejected |
| `ct_len` | 4 | u32 BE, includes ciphertext + tag (>= 16) |
| `sealed` | `ct_len` | AES-256-GCM ciphertext + tag |

- **Nonce (not stored):** `nonce_prefix(4) || index(8, u64 BE)`, index starts at 0 and increments per record.
- **AAD (43 bytes):** `magic(5) || version(1) || chunk_size(4) || file_id(16) || nonce_prefix(4) || recordHeader(5) || index(8)`.
- **Non-final record:** must be exactly `chunk_size + 16` bytes of sealed data.
- **Final record:** `16 \<= ct_len \<= chunk_size + 16`.
- **Empty file:** one final record with 0-byte plaintext (`ct_len == 16`).
- **Completeness:** exactly one final record is required; no bytes after the final record; a stream without a final record is rejected.

## Recovery slot (optional)

If `FLAG_RECOVERY` is set, a 60-byte slot is located at offset 128:

| Part | Size | Description |
| --- | ---: | --- |
| `nonce` | 12 | recovery wrap nonce |
| `wrapped_dek` | 32 | encrypted DEK |
| `tag` | 16 | GCM tag |

- **Recovery KEK:** `HKDF-SHA256(ikm=recoveryKey, salt=empty, info="AEGISRCV"||fileId, L=32)`.
- **AAD (30 bytes):** `magic(5) || version(1) || "AEGISRCV"(8) || fileId(16)`.
- AAD/info do not bind salt/iterations/main wrap, so the slot can be copied during rewrap and the same recovery key remains valid for that file.
- The recovery key (32 bytes) is generated randomly, shown to the user, and **never stored** in the container/app.

## DEK usage limits (provisional)

The current specification sets a conservative limit on the number of records per DEK/file (`MAX_RECORDS`, provisional) to maintain a security margin and compatibility; the final normative decision awaits external cryptographic review. See [spec v3 §7](https://github.com/Bangkahdev/AegisCrypt-Web/blob/main/docs/specs/spec-aegis-v3.md).

## v2 compatibility (read-only)

| Aspect | v2 (legacy) |
| --- | --- |
| Status | Can be decrypted, **not written** |
| Header | 38 bytes: `magic(5) + version(0x02) + salt(32)` |
| KDF | PBKDF2-HMAC-SHA256, 100,000 iterations (fixed) |
| Records | `chunkLen(4, int32 LE) + iv(12) + ciphertext+tag` |
| AAD / envelope / recovery / filename metadata | None |

## Validation and failure

The parser rejects containers with invalid magic/version/KDF/flags/out-of-range parameters, truncated structure, invalid record lengths, invalid order/final, trailing data, invalid metadata, or GCM authentication failure. On failure, decryption must not produce partial authenticated plaintext.

## References

- [v3 specification (normative)](https://github.com/Bangkahdev/AegisCrypt-Web/blob/main/docs/specs/spec-aegis-v3.md)
- [Security Model](/keamanan)
- [Web API Reference](/referensi-api)
