---
sidebar_position: 4
slug: /arsitektur
---

# Arsitektur

AegisCrypt adalah aplikasi satu halaman (SPA) yang di-deploy sebagai aset statis melalui Cloudflare Workers. Tidak ada server aplikasi, basis data, atau endpoint unggah.

## Alur data enkripsi

<div className="card">

1. Pengguna memasukkan kata sandi dan (opsional) keyfile.
2. PBKDF2-HMAC-SHA256 (100.000 iterasi, garam 32 byte) menurunkan kunci AES 256-bit.
3. Berkas dipotong menjadi bagian 1 MiB, masing-masing dienkripsi dengan AES-256-GCM dan IV unik.
4. Output disimpan sebagai kontainer `.aegis` v2 dan diunduh ke browser.

</div>

## Komponen utama

| Komponen | Tanggung jawab |
|----------|---------------|
| **Web Crypto API** | Operasi kriptografi di browser (AES-GCM, PBKDF2, SHA-256) |
| **React 19** | Antarmuka pengguna dan manajemen status |
| **Vite 8** | Build tool dan bundler |
| **Cloudflare Workers** | Penyajian aset statis dan domain kustom |

## Model zero-knowledge

- Tidak ada endpoint unggah file.
- Tidak ada sistem akun.
- Tidak ada penanganan kunci di sisi server.
- Semua data diproses di RAM browser dan tidak pernah meninggalkan perangkat pengguna.

## Sumber kode

Kode sumber aplikasi tersedia di GitHub: https://github.com/Bangkahdev/AegisCrypt-Web
