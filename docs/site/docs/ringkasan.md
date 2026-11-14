---
sidebar_position: 1
slug: /
---

# Ringkasan

AegisCrypt adalah suite enkripsi berkas **zero-knowledge** yang berjalan sepenuhnya di browser. Semua operasi kriptografi dilakukan secara lokal melalui [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API). File, kata sandi, dan kunci turunan **tidak pernah** dikirim, dicatat, atau disimpan di server eksternal.

<div className="hero">
  <h1>Dokumentasi AegisCrypt</h1>
  <p className="lead">
    Referensi teknis untuk klien enkripsi berkas berbasis browser: mesin AES-256-GCM, format kontainer .aegis v3, API kriptografi, model keamanan, dan deployment Cloudflare.
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
| **Enkripsi** | AES-256-GCM terotentikasi — satu bit yang berubah menyebabkan dekripsi gagal |
| **Envelope encryption** | DEK acak per berkas, dibungkus KEK dari kata sandi + keyfile opsional |
| **Rewrap** | Ganti kata sandi/keyfile tanpa mengenkripsi ulang payload |
| **Metadata nama** | Nama asli disimpan terenkripsi di kontainer (flag bit2) |
| **Auto-lock** | Sesi terkunci setelah 10 menit idle; kredensial di memori di-zeroize |
| **Derivasi kunci** | PBKDF2-HMAC-SHA256, 600.000 iterasi (tersimpan di header, hingga 5.000.000), garam 32 byte per berkas |
| **Faktor kedua** | Keyfile opsional sebagai materi kunci tambahan |
| **Streaming** | Berkas dipotong per chunk (default 1 MiB; 64 KiB–16 MiB), cocok untuk berkas besar |
| **Tanpa backend** | Tidak ada unggah file, tidak ada sistem akun, tidak ada server |

</div>

## Situs yang tersedia

| Situs | URL | Keterangan |
|-------|-----|------------|
| **Aplikasi** | https://aegiscrypt.bangkah.tech | Enkripsi dan dekripsi berkas di browser |
| **Dokumentasi** | https://docs.aegiscrypt.bangkah.tech | Referensi teknis (halaman ini) |
| **Kode sumber** | https://github.com/Bangkahdev/AegisCrypt-Web | Repositori GitHub publik |

## Cara menggunakan dokumentasi

Gunakan sidebar di sebelah kiri untuk menavigasi antar topik. Setiap halaman menjelaskan satu aspek AegisCrypt secara detail, mulai dari cara memulai hingga format biner kontainer `.aegis` v3.

Jika ingin langsung mencoba, [buka aplikasi](https://aegiscrypt.bangkah.tech) dan ikuti [Mulai Cepat](/mulai-cepat).
