---
sidebar_position: 1
slug: /
title: "Ringkasan"
description: "Pengantar AegisCrypt, model zero-knowledge, kemampuan utama, dan peta dokumentasi."
---

<div className="doc-hero">
  <div className="doc-hero__eyebrow">Dokumentasi Resmi</div>
  <h1>AegisCrypt Documentation</h1>
  <p className="lead">
    AegisCrypt adalah alat enkripsi berkas berbasis browser dengan prinsip <strong>zero-knowledge</strong>.
    Enkripsi, dekripsi, dan pengelolaan kunci berjalan secara lokal di perangkat pengguna melalui Web Crypto API.
    Berkas, kata sandi, keyfile, dan kunci tidak dikirim ke server.
  </p>
  <div className="doc-hero__actions">
    <a className="btn-doc btn-doc--primary" href="/mulai-cepat">Mulai Cepat</a>
    <a className="btn-doc" href="https://aegiscrypt.bangkah.tech" target="_blank" rel="noopener noreferrer">Buka Aplikasi</a>
    <a className="btn-doc" href="https://github.com/Bangkahdev/AegisCrypt-Web" target="_blank" rel="noopener noreferrer">Repositori GitHub</a>
  </div>
</div>

## Mulai dari sini

<div className="doc-grid">
  <a className="doc-card" href="/mulai-cepat">
    <div className="doc-card__label">Pengantar</div>
    <h3>Mulai Cepat</h3>
    <p>Buka aplikasi, mulai sesi, lalu enkripsi dan dekripsi berkas pertama Anda dalam beberapa langkah.</p>
  </a>
  <a className="doc-card" href="/panduan-pengguna">
    <div className="doc-card__label">Panduan</div>
    <h3>Panduan Pengguna</h3>
    <p>Alur lengkap: keyfile, kunci pemulihan, ganti kata sandi (rewrap), pemrosesan banyak berkas, dan mode offline.</p>
  </a>
  <a className="doc-card" href="/arsitektur">
    <div className="doc-card__label">Konsep</div>
    <h3>Arsitektur & Keamanan</h3>
    <p>Bagaimana data diproses di klien, batas kepercayaan, Web Worker, penyimpanan sementara, dan model ancaman.</p>
  </a>
  <a className="doc-card" href="/format-file">
    <div className="doc-card__label">Referensi</div>
    <h3>Format .aegis v3</h3>
    <p>Spesifikasi kontainer: header, envelope DEK/KEK, record terautentikasi, metadata nama, dan slot recovery.</p>
  </a>
</div>

## Kemampuan utama

| Kemampuan | Keterangan |
| --- | --- |
| **Enkripsi terautentikasi** | AES-256-GCM untuk payload, metadata nama berkas, dan pembungkusan DEK. Manipulasi terdeteksi dan operasi gagal aman. |
| **Envelope encryption** | Setiap berkas memakai DEK acak 256-bit yang dibungkus KEK turunan kata sandi/keyfile, sehingga kredensial dapat diganti tanpa mengenkripsi ulang payload. |
| **Kata sandi + keyfile** | Materi kunci: `UTF8(password) \|\| SHA-256(byte keyfile)` (keyfile opsional). |
| **Kunci pemulihan** | Slot recovery opsional (256-bit, disimpan offline oleh pengguna) untuk membuka berkas yang memiliki slot. |
| **Rewrap kredensial** | Ganti kata sandi/keyfile/iterasi dengan menulis ulang header; payload tetap utuh. |
| **Streaming & responsif** | Pemrosesan per chunk/record di Web Worker; dekripsi dapat memakai OPFS bila tersedia. |
| **Offline / PWA** | Aset aplikasi dapat di-cache untuk penggunaan offline; berkas pengguna tidak pernah disimpan di cache. |
| **Paritas Web & Desktop** | Format `.aegis` v3 dan vektor uji digunakan lintas implementasi Web dan .NET 8. |

## Properti keamanan (ringkas)

- **Lokal di perangkat:** kriptografi dijalankan di browser; tidak ada unggah berkas atau pengelolaan kunci di server.
- **KDF:** PBKDF2-HMAC-SHA256, default 600.000 iterasi (rentang 600.000-5.000.000, tersimpan di header).
- **Integritas:** AAD mengikat header, indeks record, metadata nama, dan domain recovery; kontainer terpotong/diubah ditolak.
- **Kontrol sesi:** kunci sesi ada di memori selama sesi aktif; aplikasi menyediakan kunci/auto-lock dan pembersihan terbaik pada UI.

:::warning Batasan penting
AegisCrypt tidak dapat melindungi data pada perangkat/OS/browser yang telah terkompromi. Kehilangan kata sandi, keyfile, dan kunci pemulihan dapat menyebabkan berkas tidak dapat dibuka. Penghapusan berkas sementara bukan jaminan *secure erase* pada semua media penyimpanan. Format v3 berada pada status *frozen-candidate* dan belum diaudit kriptografi secara independen.
:::

## Situs & sumber

| Sumber | Alamat | Keterangan |
| --- | --- | --- |
| Aplikasi web | [aegiscrypt.bangkah.tech](https://aegiscrypt.bangkah.tech) | Enkripsi/dekripsi berkas di browser |
| Dokumentasi | [docs.aegiscrypt.bangkah.tech](https://docs.aegiscrypt.bangkah.tech) | Situs ini |
| Kode sumber | [GitHub](https://github.com/Bangkahdev/AegisCrypt-Web) | Monorepo Web, Desktop, dan dokumentasi |

## Peta dokumentasi

<div className="doc-grid doc-grid-3">
  <a className="doc-card" href="/mulai-cepat"><h3>Mulai Cepat</h3><p>Langkah pertama menggunakan aplikasi.</p></a>
  <a className="doc-card" href="/panduan-pengguna"><h3>Panduan Pengguna</h3><p>Fitur dan alur penggunaan sehari-hari.</p></a>
  <a className="doc-card" href="/keamanan"><h3>Model Keamanan</h3><p>Ancaman, mitigasi, dan tanggung jawab pengguna.</p></a>
  <a className="doc-card" href="/format-file"><h3>Format .aegis v3</h3><p>Struktur biner dan aturan validasi.</p></a>
  <a className="doc-card" href="/referensi-api"><h3>Referensi API</h3><p>API kriptografi Web (`cryptoService`).</p></a>
  <a className="doc-card" href="/troubleshooting"><h3>Pemecahan Masalah</h3><p>Gejala umum dan cara mengatasinya.</p></a>
</div>
