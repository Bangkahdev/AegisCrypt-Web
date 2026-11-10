---
sidebar_position: 9
slug: /deployment
---

# Deployment

Kedua situs (aplikasi dan dokumentasi) di-deploy sebagai Cloudflare Workers dengan aset statis. Aplikasi memakai [`cf` CLI](https://developers.cloudflare.com/cf/), sedangkan dokumentasi (Docusaurus/webpack) memakai [Wrangler](https://developers.cloudflare.com/workers/wrangler/) dengan konfigurasi `wrangler.jsonc`.

## Situs yang di-deploy

<div className="card">

| Situs | URL | Worker |
|-------|-----|--------|
| **Aplikasi** | https://aegiscrypt.bangkah.tech | `aegiscrypt-web` |
| **Dokumentasi** | https://docs.aegiscrypt.bangkah.tech | `aegiscrypt-docs` |

</div>

## Cara deploy

```bash
# Deploy aplikasi
npm run build
npm run deploy

# Deploy dokumentasi
cd docs-site
npm install
npm run build
npm run deploy
```

## Detail teknis

- Pada deploy pertama, Cloudflare membuat catatan DNS `AAAA 100::` terproxy untuk setiap domain kustom dan menyediakan sertifikat HTTPS.
- Beberapa saat setelah deploy pertama, HTTPS dapat gagal sementara sertifikat diterbitkan. Coba lagi nanti akan mengembalikan `200 text/html`.
- Deploy ulang membangun dan mengunggah hash aset baru; domain kustom dan catatan DNS digunakan kembali.

## Validasi tanpa mengunggah

```bash
# Aplikasi
cf deploy --dry-run

# Dokumentasi
cd docs-site
npx wrangler deploy --dry-run
```

## Sumber kode

Kode sumber aplikasi dan dokumentasi tersedia di GitHub: https://github.com/Bangkahdev/AegisCrypt-Web
