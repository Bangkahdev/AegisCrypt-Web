---
sidebar_position: 4
slug: /arsitektur
title: "Arsitektur"
description: "Arsitektur klien AegisCrypt, alur data kriptografi, Web Worker, penyimpanan sementara, dan model offline."
---

# Arsitektur

AegisCrypt Fase 1 adalah aplikasi kriptografi **client-side**. Aplikasi web disajikan sebagai aset statis, sementara seluruh operasi enkripsi/dekripsi dijalankan di perangkat pengguna.

## Gambaran komponen

| Komponen | Teknologi / Lokasi | Peran |
| --- | --- | --- |
| UI | React 19, Vite (`apps/web/src`) | Input kredensial, antrean berkas, progres, log, dialog |
| Mesin kripto Web | `apps/web/src/services/cryptoService.ts` | Parse/tulis header v3, KDF, wrap/unwrap DEK, record, metadata, rewrap, baca v2 |
| Worker | `cryptoWorker.ts` / `cryptoWorkerClient.ts` | Menjalankan operasi berat di luar thread UI |
| I/O berkas | `apps/web/src/lib/files.ts` | Baca sumber, sink keluaran, deteksi kuota/dukungan |
| PWA | `apps/web/public/sw.js`, manifest | Cache app shell untuk muat offline |
| Desktop | `apps/desktop/src/AegisCrypt.*` (.NET 8) | Implementasi Core/CLI/App dengan paritas format |
| Distribusi | Cloudflare Workers (aset statis) | Menyajikan aplikasi dan dokumentasi |

## Alur enkripsi (Web, ringkas)

1. Pengguna menyediakan kata sandi dan opsional keyfile.
2. `KeyMaterial = UTF8(password) || SHA-256(keyfile bytes)` (keyfile opsional) disiapkan.
3. KEK diturunkan dengan PBKDF2-HMAC-SHA256 (salt acak, iterasi dari parameter/header).
4. DEK acak 256-bit dibungkus (AES-256-GCM) dengan AAD header.
5. Metadata nama (opsional) dan payload dienkripsi per record dengan DEK; nonce/AAD mengikat konteks berkas dan indeks.
6. Kontainer `.aegis` v3 dihasilkan dan diunduh ke perangkat pengguna.

## Alur dekripsi (Web, ringkas)

1. Parser memvalidasi magic, versi, KDF, flag, dan rentang parameter.
2. DEK dibuka via kredensial (KEK) atau slot recovery (bila dipilih dan tersedia).
3. Metadata nama (jika ada) didekripsi dan divalidasi.
4. Record diproses berurutan; setiap tag GCM diverifikasi, record final wajib, dan byte sisa setelah final ditolak.
5. Plaintext ditulis ke sink keluaran; pada kegagalan, output parsial dibatalkan/dibuang.

## Envelope encryption & rewrap

- **DEK per berkas:** mengenkripsi payload/metadata.
- **KEK dari kredensial:** membungkus DEK (disimpan di header).
- **Rewrap:** mengganti pembungkusan DEK (dan parameter header terkait) tanpa mengenkripsi ulang payload; data setelah header disalin.

## Web Worker dan responsivitas

- Operasi KDF dan enkripsi/dekripsi dijalankan di worker (dengan fallback ke thread utama bila worker tidak tersedia).
- UI menerima pembaruan progres dan dapat membatalkan operasi.
- Worker dihentikan setelah operasi selesai.

## Penyimpanan sementara dan model memori

Perilaku memori bergantung pada jenis operasi dan ketersediaan API browser:

| Operasi / kondisi | Perilaku |
| --- | --- |
| **Dekripsi dengan OPFS** | Plaintext ditulis bertahap ke berkas sementara OPFS; penggunaan memori dapat dibatasi (tidak menampung seluruh hasil di RAM). |
| **Dekripsi tanpa OPFS** | Fallback dapat menampung hasil di memori (Blob/buffer), sehingga penggunaan memori dapat sebanding ukuran keluaran. |
| **Enkripsi (Web)** | Berkas dibaca per chunk, namun keluaran kontainer dirakit sebagai Blob; puncak memori dapat bergantung implementasi browser/ukuran berkas. |
| **Desktop** | Pemrosesan berbasis stream; pemanggil bertanggung jawab menulis ke keluaran sementara dan mempublikasikan hanya setelah sukses. |

Pembersihan berkas sementara adalah upaya terbaik; ini **bukan** jaminan penghapusan aman (*secure erase*) pada SSD/jurnal/snapshot.

## Offline dan batas kepercayaan

- **Offline:** setelah aset dimuat/ter-cache, kriptografi tidak memerlukan jaringan.
- **Cache:** service worker menyimpan aset statis aplikasi, bukan data pengguna.
- **Batas kepercayaan:** kerahasiaan bergantung pada integritas browser/OS/perangkat. Ancaman dan residual dibahas di [Model Keamanan](/keamanan).

## Paritas Web dan Desktop

- Kontrak byte format didefinisikan oleh spesifikasi `.aegis` v3 dan fixture/vektor uji.
- Implementasi Web dan Desktop diuji untuk membaca/menulis kontainer yang kompatibel dan menangani error secara konsisten.
- Perubahan format wajib disertai pembaruan spesifikasi, vektor uji, dan kedua implementasi.

## Referensi

- [Model Keamanan](/keamanan)
- [Format .aegis v3](/format-file)
- [Performa & Batasan](/performa)
- [Spesifikasi v3 (repo)](https://github.com/Bangkahdev/AegisCrypt-Web/blob/main/docs/specs/spec-aegis-v3.md)
