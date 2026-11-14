---
sidebar_position: 11
slug: /faq
title: "FAQ"
description: "Pertanyaan umum tentang privasi, kredensial, kunci pemulihan, kompatibilitas, offline, dan keterbatasan AegisCrypt."
---

# FAQ

## Privasi dan pengiriman data

### Apakah AegisCrypt mengunggah berkas atau kata sandi saya?
Tidak. Operasi kriptografi inti berjalan di klien (browser/perangkat). Berkas, kata sandi, keyfile, kunci pemulihan, dan kunci turunan tidak dikirim ke server aplikasi.

### Apakah AegisCrypt menyimpan cadangan kunci?
Tidak. AegisCrypt tidak menyimpan kata sandi, keyfile, atau kunci pemulihan untuk Anda. Simpan kredensial dan cadangan secara mandiri.

## Kredensial dan pemulihan

### Apa bedanya kata sandi, keyfile, dan kunci pemulihan?
- **Kata sandi:** rahasia utama yang dimasukkan pengguna.
- **Keyfile (opsional):** faktor tambahan; hash SHA-256 dari byte keyfile digabung ke materi kunci.
- **Kunci pemulihan (opsional):** kunci 256-bit untuk membuka slot recovery pada berkas yang memang memiliki slot tersebut.

### Bisakah berkas dipulihkan jika kata sandi/keyfile hilang?
Hanya jika Anda memiliki **kunci pemulihan yang valid** dan berkas tersebut dienkripsi dengan **slot recovery**. Tanpa kredensial yang sesuai, berkas tidak dapat dipulihkan.

### Apakah kunci pemulihan bisa menggantikan kata sandi untuk semua hal?
Tidak. Sesi recovery ditujukan untuk pemulihan/dekripsi berkas yang memiliki slot recovery. Sesi ini tidak digunakan untuk mengenkripsi berkas baru atau mengganti kata sandi.

### Apakah mengganti kata sandi (rewrap) membatalkan kunci pemulihan?
Tidak. Slot recovery disalin saat rewrap dan tetap terikat ke berkas (melalui `fileId`), sehingga kunci pemulihan yang sama tetap berlaku.

## Fitur dan kompatibilitas

### Apakah nama berkas dienkripsi?
Nama asli dapat disimpan sebagai **metadata terenkripsi** di dalam kontainer v3 (flag bit2). Namun, nama kontainer yang diunduh biasanya masih mencerminkan nama asli (mis. `dokumen.pdf.aegis`), jadi ubah nama kontainer jika nama file itu sendiri sensitif.

### Bisakah saya mengganti kata sandi tanpa mengenkripsi ulang seluruh berkas?
Ya. Gunakan **rewrap**: DEK dibuka dengan kredensial lama lalu dibungkus ulang dengan kredensial baru, sehingga payload tidak perlu dienkripsi ulang.

### Apakah berkas v2 lama masih bisa dibuka?
Ya, implementasi saat ini dapat membaca/dekripsi kontainer v2 legacy. Penulisan kontainer baru menggunakan format v3.

### Apakah AegisCrypt Web kompatibel dengan Desktop?
Targetnya ya: Web dan Desktop berbagi format `.aegis` v3 dan vektor uji untuk paritas. Selalu verifikasi dengan uji round-trip untuk data penting.

## Offline, PWA, dan performa

### Apakah bisa digunakan offline?
Ya, setelah aset aplikasi berhasil dimuat dan di-cache oleh service worker. Fitur kriptografi berjalan lokal tanpa jaringan.

### Apakah berkas saya disimpan di cache PWA?
Tidak. Cache PWA ditujukan untuk app shell/aset statis, bukan berkas pengguna, kata sandi, atau plaintext.

### Mengapa proses berkas besar bisa lambat atau gagal?
Faktor umum: KDF (iterasi tinggi), ukuran berkas, performa perangkat, ketersediaan OPFS, dan kuota penyimpanan browser. Lihat [Performa & Batasan](/performa) dan [Pemecahan Masalah](/troubleshooting).

## Kesalahan dan keamanan

### Mengapa dekripsi gagal padahal saya merasa kata sandinya benar?
Penyebab umum: kata sandi/keyfile tidak identik, berkas terpotong/tamper, kontainer bukan v3/v2 valid, slot recovery tidak ada/salah kunci, atau parameter/konteks tidak sesuai. AegisCrypt menolak output jika autentikasi/integritas gagal.

### Apakah AegisCrypt aman jika perangkat saya terinfeksi malware?
Tidak ada aplikasi enkripsi yang dapat sepenuhnya melindungi data pada perangkat/OS/browser yang telah terkompromi. Amankan endpoint terlebih dahulu.

### Di mana saya melaporkan kerentanan?
Gunakan proses di [SECURITY.md](https://github.com/Bangkahdev/AegisCrypt-Web/blob/main/SECURITY.md). Jangan membuka issue publik untuk masalah keamanan.

## Referensi

- [Mulai Cepat](/mulai-cepat)
- [Panduan Pengguna](/panduan-pengguna)
- [Model Keamanan](/keamanan)
- [Format .aegis v3](/format-file)
