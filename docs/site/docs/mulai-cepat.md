---
sidebar_position: 2
slug: /mulai-cepat
title: "Mulai Cepat"
description: "Langkah cepat mengenkripsi dan mendekripsi berkas dengan AegisCrypt di browser."
---

# Mulai Cepat

AegisCrypt berjalan sebagai aplikasi web statis. Anda tidak perlu menginstal dependensi atau membuat akun untuk menggunakan fitur enkripsi inti.

## Prasyarat

- Browser modern dengan dukungan `crypto.subtle`, `File`, `Blob`, dan (disarankan) Web Worker.
- Koneksi internet untuk memuat aplikasi pertama kali. Setelah aset tersimpan, operasi kriptografi dapat berjalan secara lokal/offline.

## 1. Buka aplikasi

Buka [aegiscrypt.bangkah.tech](https://aegiscrypt.bangkah.tech).

<div className="screenshot-frame">
  <img src="/screenshots/login.png" alt="Layar masuk AegisCrypt" />
</div>
<div className="screenshot-caption">Layar awal: pilih mode kredensial, masukkan kata sandi, dan opsional keyfile atau kunci pemulihan.</div>

## 2. Mulai sesi

1. Masukkan **kata sandi** yang kuat.
2. (Opsional) Aktifkan **keyfile** dan pilih berkas apa pun sebagai faktor tambahan. Keyfile yang sama persis diperlukan saat dekripsi.
3. Klik **Mulai sesi** / **Start Session**.

:::warning Simpan kredensial dengan aman
Tanpa kata sandi dan keyfile yang benar (atau kunci pemulihan yang valid untuk berkas yang memiliki slot recovery), berkas terenkripsi tidak dapat dipulihkan. AegisCrypt tidak menyediakan reset kata sandi sisi server.
:::

## 3. Enkripsi berkas

1. Tambahkan berkas atau folder ke antrean (seret/lepas atau pilih dari dialog berkas).
2. Klik **Encrypt**.
3. Pantau progres dan status operasi.
4. Unduh berkas hasil dengan ekstensi `.aegis` (nama kontainer umumnya `nama-asli.ext.aegis`).

<div className="screenshot-frame">
  <img src="/screenshots/dashboard.png" alt="Dasbor pemrosesan AegisCrypt" />
</div>
<div className="screenshot-caption">Dasbor: antrean berkas, aksi enkripsi/dekripsi, progres, dan log.</div>

## 4. Dekripsi berkas

1. Mulai sesi dengan **kata sandi dan keyfile yang sama** seperti saat enkripsi.
2. Tambahkan berkas `.aegis`.
3. Klik **Decrypt**.
4. Unduh berkas hasil. Jika kontainer menyimpan metadata nama terenkripsi, nama asli dipulihkan dari metadata.

## 5. Opsi lanjutan (opsional)

| Fitur | Kapan digunakan | Catatan |
| --- | --- | --- |
| **Keyfile** | Menambah faktor kedua di luar kata sandi | Materi kunci memakai hash SHA-256 dari byte keyfile. |
| **Kunci pemulihan** | Cadangan akses bila kata sandi/keyfile hilang | Harus dibuat dan disimpan sebelum/selama enkripsi berkas terkait; hanya berlaku untuk berkas yang memiliki slot recovery. |
| **Rewrap** | Mengganti kata sandi/keyfile | Menulis ulang header tanpa mengenkripsi ulang payload. |
| **PWA/offline** | Pemakaian berulang atau tanpa jaringan | Install dari browser; cache hanya menyimpan aset aplikasi, bukan berkas pengguna. |

## Langkah berikutnya

- Pelajari alur lengkap di [Panduan Pengguna](/panduan-pengguna).
- Pahami jaminan dan batasan di [Model Keamanan](/keamanan).
- Lihat struktur kontainer di [Format .aegis v3](/format-file).
- Jika terjadi kendala, buka [Pemecahan Masalah](/troubleshooting).
