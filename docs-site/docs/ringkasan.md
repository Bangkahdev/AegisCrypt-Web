---
sidebar_position: 1
slug: /
---

# Ringkasan

AegisCrypt adalah suite enkripsi berkas **zero-knowledge** yang berjalan sepenuhnya di browser. Semua operasi kriptografi dilakukan secara lokal melalui [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API). File, kata sandi, dan kunci turunan **tidak pernah** dikirim, dicatat, atau disimpan di server eksternal.

<div className="hero">
  <h1>AegisCrypt Docs</h1>
  <p className="lead">
    Referensi teknis lengkap untuk klien enkripsi berkas berbasis browser: mesin AES-256-GCM, format kontainer .aegis v2, API kriptografi, model keamanan, dan deployment Cloudflare.
  </p>
  <div className="hero__buttons">
    <a
      href="https://aegiscrypt.bangkah.tech"
      target="_blank"
      rel="noopener noreferrer"
      className="btn btn-primary"
    >
      Buka Aplikasi
    </a>
    <a href="https://github.com/Bangkahdev/AegisCrypt-Web" target="_blank" rel="noopener noreferrer" className="btn btn-outline">
      Kode Sumber di GitHub
    </a>
  </div>
</div>

## Apa yang membuat AegisCrypt berbeda

<div className="card">

| Fitur | Detail |
|-------|--------|
| **Enkripsi** | AES-256-GCM terotentikasi — satu bit yang berubah akan menyebabkan dekripsi gagal |
| **Derivasi kunci** | PBKDF2-HMAC-SHA256, 100.000 iterasi, garam 32 byte per berkas |
| **Faktor kedua (2FA)** | Keyfile opsional sebagai materi kunci tambahan |
| **Streaming** | Berkas dipotong dalam bagian 1 MiB, cocok untuk berkas berukuran gigabyte |
| **Tanpa backend** | Tidak ada unggah file, tidak ada sistem akun, tidak ada server |

</div>

## Situs yang tersedia

| Situs | URL | Keterangan |
|-------|-----|------------|
| **Aplikasi** | https://aegiscrypt.bangkah.tech | Enkripsi dan dekripsi berkas di browser |
| **Dokumentasi** | https://docs.aegiscrypt.bangkah.tech | Referensi teknis (halaman ini) |
| **Kode sumber** | https://github.com/Bangkahdev/AegisCrypt-Web | Repositori GitHub publik |

## Bagaimana cara menggunakan dokumentasi ini

Gunakan sidebar di sebelah kiri untuk menavigasi antara topik. Setiap halaman menjelaskan satu aspek AegisCrypt secara detail, mulai dari cara memulai hingga format biner kontainer .aegis v2.

Jika Anda ingin langsung mencoba, [buka aplikasi](https://aegiscrypt.bangkah.tech) dan ikuti [Mulai Cepat](/mulai-cepat).
