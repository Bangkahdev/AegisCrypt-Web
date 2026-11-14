---
sidebar_position: 3
slug: /panduan-pengguna
title: "Panduan Pengguna"
description: "Panduan lengkap penggunaan AegisCrypt: sesi, enkripsi/dekripsi, keyfile, kunci pemulihan, rewrap, offline, dan praktik aman."
---

# Panduan Pengguna

Halaman ini menjelaskan alur penggunaan AegisCrypt di aplikasi web, termasuk fitur keamanan tambahan dan batasan operasional.

## Memulai sesi

AegisCrypt memerlukan kredensial untuk menurunkan kunci enkripsi selama sesi aktif.

1. Buka aplikasi dan pilih mode masuk: **Password** atau **Recovery key** (untuk pemulihan/dekripsi berkas yang memiliki slot recovery).
2. Masukkan kredensial:
   - **Password:** kata sandi, opsional dengan keyfile.
   - **Recovery key:** kunci 32 byte (format heksadesimal) untuk berkas yang menyertakan slot recovery.
3. Mulai sesi. Kredensial dipakai untuk operasi kriptografi di klien.

:::info Keyfile
Keyfile adalah berkas apa pun yang byte-nya di-hash (SHA-256) dan digabungkan ke materi kunci. Perubahan satu byte pada keyfile akan menghasilkan kunci berbeda. Gunakan salinan yang stabil dan simpan cadangannya.
:::

## Mengenkripsi berkas

1. Pastikan sesi aktif dengan kata sandi (dan keyfile bila digunakan).
2. Tambahkan berkas atau folder ke **Processing Queue**.
3. Jalankan **Encrypt**.
4. Setelah selesai, unduh keluaran `.aegis`.

**Catatan perilaku:**
- Enkripsi memproses data per chunk (default 1 MiB; sesuai parameter kontainer).
- Nama berkas asli dapat disimpan sebagai metadata terenkripsi di dalam kontainer (sesuai implementasi saat ini), sementara nama kontainer unduhan tetap mengandung nama asli (`nama.ext.aegis`). Ganti nama kontainer jika nama file itu sendiri sensitif.
- Operasi berat dijalankan di Web Worker agar UI tetap responsif.

## Mendekripsi berkas

1. Mulai sesi dengan kredensial yang sesuai:
   - Kata sandi + keyfile yang sama, atau
   - Kunci pemulihan (hanya untuk berkas yang memiliki slot recovery).
2. Tambahkan berkas `.aegis`.
3. Jalankan **Decrypt**.
4. Simpan berkas hasil.

Jika autentikasi atau integritas gagal, dekripsi dibatalkan dan hasil parsial tidak dipublikasikan.

## Pemrosesan banyak berkas / folder

- Anda dapat menambahkan beberapa berkas sekaligus atau menjatuhkan folder (jika browser mendukung) untuk diproses dalam antrean.
- Proses berjalan per berkas; pantau status, progres, dan log.
- Untuk berkas sangat besar atau perangkat dengan memori terbatas, proses satu per satu untuk mengurangi tekanan memori/penyimpanan.

## Kunci pemulihan (Recovery key)

Kunci pemulihan adalah kunci 256-bit terpisah yang dapat membuka **DEK** berkas melalui slot recovery.

### Membuat dan menyimpan
1. Masuk dengan kata sandi.
2. Buka menu/dialog **Recovery key**.
3. Buat kunci, lalu salin atau unduh ke penyimpanan aman offline.

### Kapan berlaku
- Berkas yang dienkripsi saat/ketika slot recovery disertakan akan memiliki flag recovery.
- Berkas lama tanpa slot recovery **tidak** dapat dibuka dengan kunci pemulihan.

### Batasan sesi recovery
- Sesi berbasis kunci pemulihan ditujukan untuk **dekripsi/pemulihan**.
- Tidak digunakan untuk mengenkripsi berkas baru atau mengganti kata sandi.

:::warning
AegisCrypt tidak menyimpan kunci pemulihan. Jika kunci hilang dan kata sandi/keyfile juga tidak tersedia, data tidak dapat dipulihkan.
:::

## Mengganti kata sandi / keyfile (Rewrap)

**Rewrap** membungkus ulang DEK dengan kredensial baru tanpa mengenkripsi ulang payload.

1. Tambahkan berkas `.aegis` yang valid.
2. Buka **Change password** / rewrap.
3. Masukkan kredensial lama (untuk membuka DEK) dan kredensial baru.
4. (Opsional) Sesuaikan iterasi PBKDF2 dalam rentang yang didukung.
5. Unduh berkas hasil rewrap dan simpan sebagai salinan baru.

Rewrap memerlukan kredensial lama yang benar. Slot recovery (bila ada) disalin apa adanya dan tetap terikat ke `fileId`, sehingga kunci pemulihan yang sama tetap berlaku untuk berkas tersebut.

## Kunci sesi, auto-lock, dan pembersihan

- Sesi dapat dikunci manual atau otomatis setelah periode tidak aktif (sesuai pengaturan aplikasi).
- Saat sesi dikunci/berakhir, aplikasi membersihkan antrean dan berupaya men-zeroisasi material sensitif di sisi UI (mis. buffer kata sandi/keyfile yang dikelola sebagai byte).
- Tutup tab/peramban pada perangkat bersama untuk mengurangi risiko paparan.

## Bahasa antarmuka

Aplikasi mendukung bahasa Inggris dan Indonesia. Pilihan bahasa dapat diganti dari header dan disimpan untuk kunjungan berikutnya (bila penyimpanan browser tersedia).

## Mode offline dan instalasi PWA

- **Instalasi:** gunakan opsi *Install* dari browser yang mendukung PWA.
- **Offline:** setelah kunjungan pertama berhasil, service worker dapat menyajikan app shell dari cache.
- **Pembaruan:** muat ulang saat online untuk mengambil versi baru.
- **Privasi cache:** service worker tidak menyimpan berkas pengguna, kata sandi, keyfile, atau plaintext.

## Praktik yang disarankan

- Gunakan kata sandi panjang/unik dan simpan di pengelola kata sandi tepercaya.
- Simpan keyfile dan kunci pemulihan di lokasi terpisah dan aman (offline/terenkripsi).
- Verifikasi dekripsi berkas penting sebelum menghapus sumber asli.
- Cadangkan berkas `.aegis` dan kredensial secara terpisah.
- Perbarui browser untuk dukungan Web Crypto/OPFS dan perbaikan keamanan.

## Terkait

- [Model Keamanan](/keamanan)
- [Format .aegis v3](/format-file)
- [Pemecahan Masalah](/troubleshooting)
- [FAQ](/faq)
