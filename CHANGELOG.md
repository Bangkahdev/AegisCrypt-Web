# Changelog

Notable changes to AegisCrypt Web, the `.aegis` format, and the desktop implementation.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions are
semantic. Everything before `1.0.0` is a public preview: interfaces and the format may still
change, and nothing in this file is a security certification.

## [Unreleased]

### Security

- **Per-DEK AES-GCM usage budget (D1b)**: aggregate plaintext + AAD processed under one DEK is
  capped at 64 GiB (≈ 2^32 GCM blocks, forgery advantage ≈ 2^-64 per NIST SP 800-38D analysis).
  Web and Desktop enforce the budget at encryption and decryption and reject containers that
  would exceed it before any plaintext is published; includes boundary and overflow tests.
  Still provisional pending independent cryptographic review — see spec §7.2.

## [0.1.0] - 2026-11-15

First public preview of the web app, the `.aegis` v3 format, and the shared desktop core.
Not independently audited yet — see **Known limitations**.

### Added

- **Web app** (`apps/web`, [`aegiscrypt.bangkah.tech`](https://aegiscrypt.bangkah.tech)):
  encrypt/decrypt without an upload, batch and folder queues, drag-and-drop, progress with
  cancellation, session lock on inactivity, and a bilingual interface (English and Indonesian).
- **`.aegis` v3 format** (`docs/specs/spec-aegis-v3.md`): fixed 128-byte big-endian header,
  AES-256-GCM with per-record nonces, PBKDF2-HMAC-SHA256 (600,000–5,000,000 iterations),
  random per-file DEK wrapped by a KEK, encrypted filename metadata, optional 60-byte recovery
  slot (HKDF), and chunked records (64 KiB–16 MiB) for large files. Legacy v2 containers stay
  read-only.
- **Optional second factor**: `KeyMaterial = UTF8(password) || SHA-256(keyfile bytes)`.
- **Recovery key**: decrypt-only capability sealed into the container at encryption time.
- **Rewrap**: change password/keyfile without re-encrypting the payload.
- **Streaming output**: bounded-memory decryption through OPFS where available, with an
  in-memory fallback.
- **PWA**: installable, offline cold start, strict CSP, and a precache manifest.
- **Desktop preview** (`apps/desktop`): `AegisCrypt.Core`, a CLI, and an Avalonia GUI that share
  the v3 format, error catalogue, and cross-platform test vectors.
- **Documentation**: Docusaurus site (English with an Indonesian translation), user guides,
  format spec, threat model, architecture notes, and the production-readiness plan.
- **CI**: static analysis, unit and integration tests, browser tests (Chromium, Firefox,
  WebKit), desktop .NET tests, docs build, dependency audit, secret scan, SBOM, and security.txt
  expiry checks.

### Security

- Cancellation now completes worker cleanup before the operation is reported as cancelled:
  sinks are aborted, OPFS `.aegis-tmp-*` files are removed, and key material is zeroed.
  Decryption and encryption both honour cancellation requested from the final progress
  callback, so an aborted run never yields a "successful" output.
- GCM authentication failures are no longer remapped to credential errors, and output-sink
  failures (for example storage quota) surface as themselves.
- `security.txt` carries a BOM-free payload with an expiry enforced by CI.

### Known limitations

- **Not independently audited.** Treat the containers as a useful extra layer, not as the only
  copy of anything important.
- **Desktop is a preview.** Builds are unsigned and no installer or checksum set is published
  yet; desktop UI localization is pending.
- **Per-DEK usage budget** is documented in `spec-aegis-v3.md` §7.2 but not enforced. The
  record-count ceiling (`MAX_RECORDS`) is enforced on both platforms; the aggregate
  ciphertext/AAD block budget awaits an independent crypto review.
- **Search visibility.** `/awal/` and `/awal/id/` ship indexable with this release (canonical plus
  `hreflang` alternates); the feedback pages under `/awal/feedback/` stay `noindex`.
