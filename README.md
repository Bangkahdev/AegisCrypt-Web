# AegisCrypt Web

**English** | [Bahasa Indonesia](README.id.md)

**Live:** [App](https://aegiscrypt.bangkah.tech) · [Documentation](https://docs.aegiscrypt.bangkah.tech)

AegisCrypt Web is a browser-based encryption tool designed with a **zero-knowledge** approach: files and passwords are processed entirely in the browser (Web Crypto API, in-memory/OPFS-bounded flows) and are never sent to any server.

> Status: production-readiness work in progress (Gate 1 feedback). Not independently audited yet.

---

## Key Features

- **AES-256-GCM**: authenticated encryption that detects tampering.
- **Two-factor derivation (optional)**: `Password` + `Keyfile` (`KeyMaterial = UTF8(password) || SHA256(keyfile bytes)`).
- **Streaming envelope (v3)**: 128-byte header, authenticated records, chunked processing (64 KiB–16 MiB, default 1 MiB) suitable for large files.
- **Encrypted filenames**: original name stored as encrypted metadata (flag bit 2) and restored on decrypt.
- **Rewrap**: re-wrap the file key with a new password/keyfile without re-encrypting payload.
- **Optional recovery key**: 60-byte recovery slot (HKDF info `"AEGISRCV"||fileId`) for decrypt without password; recovery sessions are decrypt-only.
- **Session hardening**: 10-minute idle auto-lock and best-effort zeroization of password/keyfile material on lock/logout.
- **Web Worker crypto**: PBKDF2 and encrypt/decrypt run off the UI thread.
- **PWA/offline**: installable; cache contains app shell only.
- **Bilingual UI**: English and Indonesian, switchable from the header.

## Security Overview

- **Cipher:** AES-256-GCM (authenticated encryption).
- **KDF:** PBKDF2-HMAC-SHA-256, 600,000–5,000,000 iterations (stored in header), 32-byte random salt per file.
- **Keyfile logic:** `KeyMaterial = Password_Bytes + SHA256(Keyfile_Bytes)`.
- **v3 streaming:** random 256-bit DEK wrapped by PBKDF2-derived KEK; per-record nonce `prefix(4) || index(8)` (not stored); 43-byte AAD binds header/record context. Filename metadata block (when present) uses index `2^64-1`.

Full format details: [docs/specs/spec-aegis-v3.md](docs/specs/spec-aegis-v3.md). Threat model: [docs/specs/threat-model-v1.md](docs/specs/threat-model-v1.md).

## Project Structure

```text
aegiscrypt-web/
├─ apps/
│  ├─ web/                  # Vite + React 19 web app
│  │  ├─ src/               # components/, services/crypto, lib/, i18n/
│  │  ├─ tests/             # unit (Vitest), e2e (Playwright), perf, fixtures
│  │  ├─ public/            # headers, sw.js, manifest, security.txt
│  │  └─ cloudflare.config.ts
│  └─ desktop/              # .NET 8 (Core, CLI, Avalonia) — same v3 format
├─ docs/
│  ├─ specs/                # v3 spec, threat model, architecture, readiness plan
│  ├─ guides/               # use-case guides
│  ├─ assets/screenshots/
│  └─ site/                 # Docusaurus (EN default, ID at /id/)
└─ .github/                 # CI and Dependabot
```

## Development & Testing

Web app (run from `apps/web`):

```bash
npm install
npm run typecheck
npm run lint
npm run test:unit                    # Vitest (unit + integration)
npm run build && npm run test:e2e    # Playwright: Chromium, Firefox, WebKit
npm run test:bench                   # throughput benchmark
```

Desktop (.NET 8): see [apps/desktop/README.md](apps/desktop/README.md).

```bash
dotnet test apps/desktop/AegisCrypt.sln
```

## Deployment

Static assets deployed as Cloudflare Workers.

| Site | URL | Worker |
|---|---|---|
| App | https://aegiscrypt.bangkah.tech | `aegiscrypt-web` |
| Docs | https://docs.aegiscrypt.bangkah.tech | `aegiscrypt-docs` |

```bash
# App
cd apps/web && npm run build && cf deploy

# Docs (Docusaurus)
cd docs/site && npm install && npm run build && npx wrangler deploy
```

## `.aegis` v3 Format (summary)

128-byte fixed header, big-endian. Legacy v2 containers remain readable.

| Offset | Length | Field | Value |
|---|---:|---|---|
| 0 | 5 | Magic | `AEGIS` |
| 5 | 1 | Version | `0x03` |
| 6 | 1 | KDF id | `0x01` (PBKDF2-HMAC-SHA256) |
| 7 | 1 | Flags | bit0 keyfile, bit1 recovery, bit2 encrypted filename |
| 8 | 4 | PBKDF2 iterations | uint32, 600k–5M |
| 12 | 4 | Chunk size | uint32, 64 KiB–16 MiB |
| 16 | 32 | Salt | random |
| 48 | 16 | File ID | random |
| 64 | 4 | Nonce prefix | random |
| 68 | 12 | Wrap nonce | random |
| 80 | 32 | Wrapped DEK | ciphertext |
| 112 | 16 | Wrap tag | 128-bit |

Each record: 5-byte header (`final flag` + uint32 ciphertext length) + ciphertext + tag. See [docs/specs/spec-aegis-v3.md](docs/specs/spec-aegis-v3.md) for full details.

## Security & Reporting

- Policy: [SECURITY.md](SECURITY.md)
- Contact: **atha@bangkah.tech** (do not open public issues for vulnerabilities)
- `/.well-known/security.txt` included in web build

## Documentation

- [docs/specs/spec-aegis-v3.md](docs/specs/spec-aegis-v3.md) — `.aegis` v3 format (frozen-candidate)
- [docs/specs/threat-model-v1.md](docs/specs/threat-model-v1.md) — threat model and residual risks
- [docs/specs/architecture-v1.md](docs/specs/architecture-v1.md) — architecture and data flow
- [docs/specs/production-readiness-plan-v1.0.md](docs/specs/production-readiness-plan-v1.0.md) — readiness plan (Gate 0–5)
- [apps/desktop/README.md](apps/desktop/README.md) — desktop implementation

## FAQ

**Lost password/keyfile?**  
Without a recovery key, no. AegisCrypt is zero-knowledge with no backdoor. Enable and store a recovery key offline if you need a recovery path.

**Browser asks to download multiple files?**  
Batch operations trigger one download per file; allow multiple downloads when prompted.

**Is the filename encrypted?**  
The original name is stored as encrypted metadata and restored on decrypt. The downloaded container name is `original.ext.aegis` — rename the container if the filename itself is sensitive.

**Does AegisCrypt send anything to a server?**  
No file contents, password/keyfile bytes, or derived keys are sent. The app is a static bundle (only app assets are fetched; crypto works after load even offline).

## License

[Apache-2.0](LICENSE)
