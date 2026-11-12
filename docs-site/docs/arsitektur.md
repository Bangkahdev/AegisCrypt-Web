---
sidebar_position: 4
slug: /arsitektur
---

# Arsitektur

AegisCrypt adalah aplikasi satu halaman (SPA) yang di-deploy sebagai aset statis melalui Cloudflare Workers. Tidak ada server aplikasi, basis data, atau endpoint unggah.

## Alur data enkripsi

<div className="card">

1. Pengguna memasukkan kata sandi dan (opsional) keyfile.
2. `KeyMaterial = Password_Bytes || SHA-256(Keyfile_Bytes)` disiapkan; PBKDF2-HMAC-SHA256 (600.000 iterasi, garam 32 byte) menurunkan KEK AES-256.
3. DEK acak 256-bit dibungkus oleh KEK dengan AES-256-GCM; header 128 byte mencatat salt, iterasi, ukuran chunk, file ID, dan prefix nonce.
4. Berkas dipotong menjadi record (default 1 MiB, sesuai header), masing-masing dienkripsi dengan AES-256-GCM memakai nonce turunan `prefix || index` dan AAD 43 byte.
5. Output disimpan sebagai kontainer `.aegis` v3 dan diunduh ke browser. Kontainer v2 lama tetap dapat dibaca.

</div>

## Komponen utama

| Komponen | Tanggung jawab |
|----------|---------------|
| **Web Crypto API** | Operasi kriptografi di browser (AES-GCM, PBKDF2, SHA-256) |
| **Web Worker** | Menjalankan PBKDF2 dan enkripsi/dekripsi di luar thread UI agar antarmuka tetap responsif |
| **Service Worker** | Cache app shell agar aplikasi dapat dibuka offline; tidak pernah menyimpan berkas pengguna |
| **React 19** | Antarmuka pengguna dan manajemen status |
| **Vite 8** | Build tool dan bundler |
| **Cloudflare Workers** | Penyajian aset statis dan domain kustom |

## Model zero-knowledge

- Tidak ada endpoint unggah file.
- Tidak ada sistem akun.
- Tidak ada penanganan kunci di sisi server.
- Semua data diproses di perangkat pengguna dan tidak pernah meninggalkan perangkat.
- Dekripsi dapat memakai penyimpanan sementara OPFS untuk menjaga penggunaan memori; penghapusan berkas sementara dijadwalkan (saat halaman ditutup atau setelah timeout).

## Web Worker dan offline

- Setiap operasi membuat satu Web Worker; worker menjalankan PBKDF2, enkripsi, dekripsi, dan rewrap, lalu dihentikan setelah selesai.
- Progres dikirim ke thread UI sebagai pesan; pembatalan mengirim sinyal abort ke worker.
- Bila lingkungan tidak mendukung Worker (misalnya pengujian), operasi yang sama dijalankan langsung di thread utama sebagai fallback.
- Service worker menyimpan app shell (HTML, CSS, JavaScript, ikon, manifest) sehingga halaman dapat dibuka tanpa jaringan. Berkas pengguna, kata sandi, dan keyfile tidak pernah masuk cache.
- Aplikasi tetap berfungsi penuh secara offline karena seluruh kriptografi bersifat lokal.

## Sumber kode

Kode sumber aplikasi tersedia di GitHub: https://github.com/Bangkahdev/AegisCrypt-Web
