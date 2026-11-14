---
sidebar_position: 9
slug: /deployment
title: "Deployment"
description: "Cara membangun dan men-deploy aplikasi web dan situs dokumentasi AegisCrypt ke Cloudflare."
---

# Deployment

AegisCrypt Web dan dokumentasi disajikan sebagai aset statis pada Cloudflare Workers. Tidak ada backend aplikasi untuk memproses data pengguna.

## Target deployment

| Situs | Direktori | URL | Worker | Alat |
| --- | --- | --- | --- | --- |
| Aplikasi web | `apps/web` | [aegiscrypt.bangkah.tech](https://aegiscrypt.bangkah.tech) | `aegiscrypt-web` | `cf` CLI (`cloudflare.config.ts`) |
| Dokumentasi | `docs/site` | [docs.aegiscrypt.bangkah.tech](https://docs.aegiscrypt.bangkah.tech) | `aegiscrypt-docs` | Wrangler (`wrangler.jsonc`) |

## Prasyarat

- Node.js dan npm
- Akses/autentikasi Cloudflare yang sesuai (akun, domain/route, dan permission)
- Dependensi terpasang (`npm ci`/`npm install`) di direktori terkait

## Deploy aplikasi web

Jalankan dari `apps/web`:

```bash
npm ci
npm run build
cf deploy
```

`cf deploy` menggunakan konfigurasi `apps/web/cloudflare.config.ts` untuk membangun/mengunggah aset sesuai pengaturan proyek.

## Deploy dokumentasi

Jalankan dari `docs/site`:

```bash
npm ci
npm run build
npx wrangler deploy
```

Konfigurasi berada di `docs/site/wrangler.jsonc` (aset `./build`, domain kustom `docs.aegiscrypt.bangkah.tech`).

## Validasi sebelum deploy

```bash
# Aplikasi (dari apps/web)
cf deploy --dry-run

# Dokumentasi (dari docs/site)
npx wrangler deploy --dry-run
```

Disarankan juga menjalankan pemeriksaan kualitas sebelum rilis:

```bash
# apps/web
npm run lint
npm run typecheck
npm run test:unit
npm run build
```

## Catatan operasional

- **Sertifikat/domain:** pada penambahan domain kustom pertama kali, penyediaan HTTPS dapat memerlukan waktu singkat.
- **Rollback:** gunakan riwayat deployment Cloudflare/commit Git untuk kembali ke versi sebelumnya.
- **Cache/PWA:** setelah deploy, klien yang pernah membuka aplikasi dapat memuat app shell lama dari cache hingga service worker diperbarui; instruksikan pengguna memuat ulang saat online bila perlu.
- **Header keamanan:** aplikasi dan docs menyertakan header keamanan statis (`_headers`) seperti CSP, HSTS, dan kebijakan terkait sesuai konfigurasi masing-masing.
- **Rahasia:** jangan menyimpan kredensial di repositori; gunakan secret/env yang dikelola platform.

## CI

Workflow CI di `.github/workflows/ci.yml` menjalankan pemeriksaan Web/Desktop (lint, typecheck, unit, e2e, audit, secret scan, SBOM, build) sesuai konfigurasi saat ini. Deployment produksi dilakukan manual sesuai proses proyek.

## Referensi

- [Cloudflare `cf` CLI](https://developers.cloudflare.com/cf/)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/)
- [Pemecahan Masalah](/troubleshooting)
