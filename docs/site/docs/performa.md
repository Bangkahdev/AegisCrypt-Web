---
sidebar_position: 8
slug: /performa
title: "Performa & Batasan"
description: "Karakteristik performa, penggunaan memori, dukungan browser, batas format, dan catatan benchmark AegisCrypt."
---

# Performa & Batasan

Halaman ini menjelaskan karakteristik performa dan batasan praktis AegisCrypt. Angka aktual bergantung pada perangkat, browser, ukuran berkas, dan ketersediaan OPFS.

## Ringkasan teknis

| Aspek | Nilai |
| --- | --- |
| Cipher | AES-256-GCM (tag 128-bit) |
| KDF | PBKDF2-HMAC-SHA256 |
| Iterasi PBKDF2 | Default 600.000, rentang 600.000-5.000.000 |
| Salt / fileId / nonce prefix | 32 / 16 / 4 byte (acak per berkas) |
| Ukuran chunk | Default 1 MiB, rentang 64 KiB-16 MiB |
| Header v3 | 128 byte (tetap) + metadata/slot opsional |
| Overhead per record | 5 byte header record + 16 byte tag |
| Metadata nama | 2 byte panjang + ciphertext+tag (nama UTF-8 \<= 1024 byte) |
| Recovery slot | 60 byte (opsional) |
| Kompatibilitas baca | v3 dan legacy v2 |

## Responsivitas UI

- Derivasi kunci (PBKDF2) dan enkripsi/dekripsi dijalankan di **Web Worker** untuk menjaga UI tetap responsif.
- Progres dan pembatalan ditangani melalui pesan worker/sinyal pembatalan.
- Pada lingkungan tanpa Worker, operasi dapat berjalan di thread utama (fallback).

## Model memori dan penyimpanan sementara

| Skenario | Perilaku | Implikasi |
| --- | --- | --- |
| **Dekripsi + OPFS tersedia** | Plaintext ditulis bertahap ke berkas sementara OPFS | Penggunaan RAM lebih terkendali; membutuhkan kuota penyimpanan asal (origin storage) |
| **Dekripsi tanpa OPFS** | Fallback sink memori (Blob/buffer) | RAM dapat sebanding ukuran hasil dekripsi |
| **Enkripsi (Web)** | Input dibaca per chunk, keluaran dirakit sebagai Blob | Puncak memori dapat meningkat pada berkas sangat besar (tergantung browser) |
| **Desktop** | I/O stream seekable | Pemanggil menulis ke output sementara dan mempublikasikan setelah sukses |

:::warning Kuota dan pembersihan
Dekripsi via OPFS dapat memerlukan ruang sementara tambahan (mis. saat unduhan/pembersihan tertunda). Pembersihan sementara bersifat upaya terbaik dan bukan jaminan *secure erase*. Jika kuota tidak cukup, gunakan berkas lebih kecil, kosongkan ruang/kuota situs, atau proses secara terpisah.
:::

## Dukungan browser

Diperlukan (atau sangat disarankan):
- **Web Crypto API** (`crypto.subtle`) pada konteks aman (HTTPS/localhost)
- **File/Blob/File.slice** untuk pembacaan berkas
- **Web Worker** untuk responsivitas
- **OPFS** (`navigator.storage.getDirectory`) opsional untuk dekripsi dengan jejak memori lebih baik
- **Service Worker + Cache Storage** untuk PWA/offline

Kompatibilitas diuji pada mesin modern utama (Chromium/Firefox/WebKit) melalui pengujian proyek; perilaku OPFS/kuota dapat berbeda antar browser dan profil.

## Batas format dan operasional

- Parameter di luar rentang (iterasi, chunk, flag, ukuran metadata/record) ditolak.
- Setiap DEK/berkas memiliki batas jumlah record sesuai kebijakan spesifikasi saat ini (`MAX_RECORDS`, *provisional*).
- Berkas `.aegis` yang rusak/tamper/terpotong/trailing ditolak (fail closed).
- v2 hanya didukung untuk **baca/dekripsi**; penulisan baru selalu v3.
- Nama berkas hasil dekripsi mengikuti metadata terenkripsi (jika ada) atau turunan nama kontainer; karakter berbahaya tidak diterima.

## Tips performa

- Gunakan browser desktop terbaru untuk berkas besar.
- Tutup tab/aplikasi berat lain saat memproses berkas berukuran besar.
- Proses berkas besar satu per satu untuk mengurangi tekanan memori/kuota.
- Pastikan ruang penyimpanan perangkat dan kuota origin browser mencukupi (terutama dekripsi besar via OPFS).
- Untuk perubahan kata sandi pada berkas besar, gunakan **rewrap** (lebih efisien daripada enkripsi ulang payload).

## Benchmark lokal (pengembangan)

Repositori Web menyediakan benchmark throughput (Playwright/Chromium) dari `apps/web`:

```bash
npm run build
npm run test:bench
```

Variasi ukuran (contoh):

```bash
BENCH_SIZE_MB=256 npm run test:bench
```

```powershell
$env:BENCH_SIZE_MB=256; npm run test:bench
```

Catatan:
- Hasil mencakup overhead KDF, pipeline browser, dan unduhan/penyimpanan uji; ini **bukan** throughput AES murni.
- Gunakan untuk perbandingan relatif antar perubahan pada mesin yang sama.
- Berkas uji sangat besar dapat dipengaruhi kuota browser/profil pengujian.

## Referensi

- [Arsitektur](/arsitektur)
- [Format .aegis v3](/format-file)
- [Pemecahan Masalah](/troubleshooting)
