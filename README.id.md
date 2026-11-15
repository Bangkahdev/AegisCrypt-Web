# AegisCrypt Web

[English](README.md) | **Bahasa Indonesia**

**Live:** [Aplikasi](https://aegiscrypt.bangkah.tech) · [Dokumentasi](https://docs.aegiscrypt.bangkah.tech)

AegisCrypt Web mengenkripsi file di browser: file dan kata sandi diproses sepenuhnya di perangkat Anda (Web Crypto API, alur memori/terbatas OPFS) dan tidak pernah dikirim ke server mana pun.

> Status: dalam pengerjaan kesiapan produksi (Gate 1/umpan balik). Belum diaudit pihak independen. Pratinjau publik pertama: [0.1.0](CHANGELOG.md).

---

## Fitur Utama

- **AES-256-GCM**: enkripsi terotentikasi yang mendeteksi manipulasi data.
- **Derivasi dua faktor (opsional)**: `Kata sandi` + `Keyfile` (`KeyMaterial = UTF8(password) || SHA256(keyfile bytes)`).
- **Streaming envelope (v3)**: header 128 byte, record terautentikasi, pemrosesan per chunk (64 KiB–16 MiB, bawaan 1 MiB) untuk file besar.
- **Nama file terenkripsi**: nama asli disimpan sebagai metadata terenkripsi (flag bit 2) dan dipulihkan saat dekripsi.
- **Rewrap (ganti kata sandi)**: bungkus ulang kunci file dengan kata sandi/keyfile baru tanpa mengenkripsi ulang payload.
- **Kunci recovery opsional**: slot recovery 60 byte (HKDF info `"AEGISRCV"||fileId`) untuk dekripsi tanpa kata sandi; sesi recovery bersifat hanya-dekripsi.
- **Pengamanan sesi**: auto-lock setelah 10 menit idle dan upaya zeroisasi material kata sandi/keyfile saat lock/logout.
- **Kripto di Web Worker**: PBKDF2 dan enkripsi/dekripsi berjalan di luar thread UI.
- **PWA/offline**: dapat dipasang; cache hanya berisi app shell.
- **Antarmuka dua bahasa**: Inggris dan Indonesia, dapat diganti dari header.

## Ringkasan Keamanan

- **Sandi:** AES-256-GCM (enkripsi terotentikasi).
- **KDF:** PBKDF2-HMAC-SHA-256, 600.000–5.000.000 iterasi (disimpan di header), salt acak 32 byte per file.
- **Logika keyfile:** `KeyMaterial = Password_Bytes + SHA256(Keyfile_Bytes)`.
- **Streaming v3:** DEK acak 256-bit dibungkus KEK hasil PBKDF2; nonce per record `prefix(4) || index(8)` (tidak disimpan); AAD 43 byte mengikat konteks header/record. Metadata nama (bila ada) memakai indeks `2^64-1`.

Detail format: [docs/specs/spec-aegis-v3.md](docs/specs/spec-aegis-v3.md). Model ancaman: [docs/specs/threat-model-v1.md](docs/specs/threat-model-v1.md).

## Struktur Proyek

```text
aegiscrypt-web/
├─ apps/
│  ├─ web/                  # Aplikasi web Vite + React 19
│  │  ├─ src/               # components/, services/crypto, lib/, i18n/
│  │  ├─ tests/             # unit (Vitest), e2e (Playwright), perf, fixtures
│  │  ├─ public/            # headers, sw.js, manifest, security.txt
│  │  └─ cloudflare.config.ts
│  └─ desktop/              # .NET 8 (Core, CLI, Avalonia) — format v3 sama
├─ docs/
│  ├─ specs/                # spesifikasi v3, threat model, arsitektur, rencana kesiapan
│  ├─ guides/               # panduan use case
│  ├─ assets/screenshots/
│  └─ site/                 # Docusaurus (EN bawaan, ID di /id/)
└─ .github/                 # CI dan Dependabot
```

## Pengembangan & Pengujian

Aplikasi web (jalankan dari `apps/web`, Node.js 22.23+):

```bash
npm install
npm run typecheck
npm run lint
npm run test:unit                    # Vitest (unit + integrasi)
npm run build && npm run test:e2e    # Playwright: Chromium, Firefox, WebKit
npm run test:bench                   # benchmark throughput
```

Desktop (.NET 8): lihat [apps/desktop/README.md](apps/desktop/README.md).

```bash
dotnet test apps/desktop/AegisCrypt.sln
```

## Deployment

Aset statis di-deploy sebagai Cloudflare Workers.

| Situs | URL | Worker |
|---|---|---|
| Aplikasi | https://aegiscrypt.bangkah.tech | `aegiscrypt-web` |
| Dokumentasi | https://docs.aegiscrypt.bangkah.tech | `aegiscrypt-docs` |

```bash
# Aplikasi
cd apps/web && npm run build && cf deploy

# Dokumentasi (Docusaurus)
cd docs/site && npm install && npm run build && npx wrangler deploy
```

## Format `.aegis` v3 (ringkasan)

Header tetap 128 byte, big-endian. Kontainer v2 lama tetap dapat dibaca.

| Offset | Panjang | Field | Nilai |
|---|---:|---|---|
| 0 | 5 | Magic | `AEGIS` |
| 5 | 1 | Versi | `0x03` |
| 6 | 1 | ID KDF | `0x01` (PBKDF2-HMAC-SHA256) |
| 7 | 1 | Flag | bit0 keyfile, bit1 recovery, bit2 nama file terenkripsi |
| 8 | 4 | Iterasi PBKDF2 | uint32, 600k–5M |
| 12 | 4 | Ukuran chunk | uint32, 64 KiB–16 MiB |
| 16 | 32 | Salt | acak |
| 48 | 16 | File ID | acak |
| 64 | 4 | Prefix nonce | acak |
| 68 | 12 | Nonce wrap | acak |
| 80 | 32 | DEK terbungkus | ciphertext |
| 112 | 16 | Tag wrap | 128-bit |

Setiap record: header 5 byte (`flag final` + panjang ciphertext uint32) + ciphertext + tag. Lihat [docs/specs/spec-aegis-v3.md](docs/specs/spec-aegis-v3.md) untuk detail lengkap.

## Keamanan & Pelaporan

- Kebijakan: [SECURITY.md](SECURITY.md)
- Kontak: **atha@bangkah.tech** (jangan buka issue publik untuk kerentanan)
- `/.well-known/security.txt` disertakan pada build web

## Dokumentasi

- [docs/specs/spec-aegis-v3.md](docs/specs/spec-aegis-v3.md) — format `.aegis` v3 (frozen-candidate)
- [docs/specs/threat-model-v1.md](docs/specs/threat-model-v1.md) — model ancaman dan risiko residual
- [docs/specs/architecture-v1.md](docs/specs/architecture-v1.md) — arsitektur dan alur data
- [docs/specs/production-readiness-plan-v1.0.md](docs/specs/production-readiness-plan-v1.0.md) — rencana kesiapan (Gate 0–5)
- [apps/desktop/README.md](apps/desktop/README.md) — implementasi desktop

## FAQ

**Lupa kata sandi/keyfile?**  
Tanpa kunci recovery, tidak. AegisCrypt tidak memiliki mekanisme pemulihan bawaan: satu-satunya jalan masuk adalah kata sandi/keyfile yang Anda pilih dan kunci recovery yang Anda buat sendiri. Aktifkan dan simpan kunci recovery secara offline jika butuh jalur pemulihan.

**Browser meminta izin mengunduh banyak file?**  
Pemrosesan batch memicu satu unduhan per file; izinkan unduhan ganda saat diminta.

**Apakah nama file dienkripsi?**  
Nama asli disimpan sebagai metadata terenkripsi dan dipulihkan saat dekripsi. Nama container yang diunduh adalah `original.ext.aegis` — ubah nama container jika nama file itu sendiri sensitif.

**Apakah AegisCrypt mengirim sesuatu ke server?**  
Tidak ada konten file, byte kata sandi/keyfile, atau kunci turunan yang dikirim. Aplikasi adalah bundel statis (hanya aset aplikasi yang diambil; kripto bekerja setelah dimuat bahkan saat offline).

## Lisensi

[Apache-2.0](LICENSE)
