# AegisCrypt Web

> **English Version:** You can read the English README [here](README.md).

**Suite Enkripsi Berbasis Klien Profesional**

**Live:** [Aplikasi](https://aegiscrypt.bangkah.tech) · [Dokumentasi](https://docs.aegiscrypt.bangkah.tech)

AegisCrypt Web adalah alat enkripsi berbasis browser dengan standar militer. Dirancang dengan prinsip **Zero-Knowledge**, yang berarti file dan kata sandi Anda diproses sepenuhnya di dalam RAM browser melalui Web Crypto API dan tidak pernah dikirimkan ke server eksternal mana pun.

---

## Fitur Utama

* **AES-256-GCM**: Enkripsi terotentikasi yang dapat mendeteksi manipulasi data.
* **Autentikasi Dua Faktor (2FA)**: Menggabungkan `Password` + `Keyfile` (misalnya foto, dokumen) untuk keamanan tingkat lanjut.
* **Streaming Engine (v3)**: Enkripsi envelope per file dengan header 128 byte, record terautentikasi, dan pemrosesan per chunk — cocok untuk file berukuran gigabyte tanpa membuat browser *crash*.
* **Nama file terenkripsi**: Nama asli disimpan sebagai metadata terenkripsi di container (flag bit2) dan dipulihkan saat dekripsi.
* **Ganti kata sandi (rewrap)**: Bungkus ulang kunci file dengan kata sandi/keyfile baru tanpa mengenkripsi ulang payload.
* **Auto-lock & zeroisasi**: Sesi terkunci setelah 10 menit idle; byte kata sandi dan buffer keyfile dihapus dari memori saat lock/logout.
* **Neo-Brutalism UI**: Antarmuka modern, tegas, dan sepenuhnya responsif dengan kontras tinggi.
* **Telemetri Waktu Nyata**: Memantau kecepatan enkripsi (MB/s) dan estimasi waktu selesai (ETA).
* **Pemrosesan Batch**: Tarik dan letakkan (*drag & drop*) seluruh folder ke dalam antrean pemrosesan.

---

## Arsitektur Keamanan

AegisCrypt mengikuti standar kriptografi yang ketat untuk memastikan integritas dan kerahasiaan data.

### 1. Algoritma Utama

* **Sandi (Cipher):** AES-256-GCM (Galois/Counter Mode).
* **Mengapa GCM?:** Berbeda dengan mode CBC, GCM menyediakan **Authenticated Encryption**. Sistem ini memastikan bahwa jika sebuah file dirusak (bahkan hanya satu bit yang diubah), proses dekripsi akan langsung gagal alih-alih menghasilkan data korup.

### 2. Derivasi Kunci (PBKDF2)

* **Fungsi:** `PBKDF2` dengan `HMAC-SHA-256`.
* **Iterasi:** 600.000 (disimpan di header; rentang 600.000–5.000.000, dapat dinaikkan sesuai kebutuhan).
* **Salt:** 32-byte *Cryptographically Secure Random Salt* yang dihasilkan per file.
* **Tujuan:** Melindungi sistem dari serangan *Brute-Force* dan *Rainbow Table*.

### 3. Logika Keyfile (2FA)

* **Logika:** `KeyMaterial = Password_Bytes + SHA256(Keyfile_Bytes)`
* **Tujuan:** Memastikan bahwa meskipun seorang penyerang berhasil menebak kata sandi Anda, mereka tetap tidak dapat mendekripsi file tanpa file fisik yang persis sama yang digunakan sebagai kunci.

### 4. Streaming & Envelope Encryption (v3)

* Setiap file memakai **DEK acak 256-bit** yang dibungkus oleh KEK hasil PBKDF2 (envelope encryption), sehingga rewrap tidak perlu menulis ulang payload.
* File dipecah ke dalam **chunk** (default 1 MiB; 64 KiB–16 MiB) yang dicatat di header.
* Setiap record memakai **nonce turunan** `prefix(4) || index(8)` — nonce tidak disimpan di kontainer.
* **AAD 43 byte** per record mengikat magic, versi, ukuran chunk, file ID, prefix, header record, dan indeks sehingga record tidak dapat dipindah atau dipotong.

---

## Panduan Pengguna

Buka aplikasi langsung dan ikuti panduan di dokumentasi:

[Buka Aplikasi](https://aegiscrypt.bangkah.tech) ・ [Buka Dokumentasi](https://docs.aegiscrypt.bangkah.tech)

--- 

## Struktur Project

```
aegiscrypt-web/
├── src/
│   ├── components/
│   │   ├── FileList.tsx       # UI Antrean File
│   │   ├── LogBox.tsx         # Log Operasi
│   │   ├── LoginScreen.tsx    # Entri Autentikasi
│   │   └── PasswordInput.tsx  # Indikator Kekuatan Sandi
│   ├── services/
│   │   └── cryptoService.ts   # Mesin Inti Kriptografi (AES-GCM)
│   ├── App.tsx                # Kontroler Utama
│   ├── constants.ts           # Konfigurasi & Magic Bytes
│   └── types.ts               # Antarmuka TypeScript
├── tests/
│   ├── cryptoService.test.ts  # Suite Pengujian Vitest
│   └── setup.ts               # Polyfills
├── index.html                 # HTML & Gaya Entri
└── vite.config.ts             # Konfigurasi Build

```

---

## Spesifikasi Format File (.aegis v3)

Header tetap 128 byte, big-endian. Kontainer v2 lama tetap dapat dibaca.

| Offset Byte | Panjang | Konten | Nilai |
| --- | --- | --- | --- |
| 0 | 5 | Magic | `AEGIS` |
| 5 | 1 | Versi | `0x03` |
| 6 | 1 | ID KDF | `0x01` (PBKDF2-HMAC-SHA256) |
| 7 | 1 | Flag | bit0 keyfile, bit1 recovery slot, bit2 metadata nama terenkripsi |
| 8 | 4 | Iterasi PBKDF2 | uint32, 600.000–5.000.000 |
| 12 | 4 | Ukuran chunk | uint32, 65.536–16.777.216 |
| 16 | 32 | Salt | Random bytes |
| 48 | 16 | File ID | Random bytes |
| 64 | 4 | Prefix nonce | Random bytes |
| 68 | 12 | Nonce wrap | Random bytes |
| 80 | 32 | DEK terbungkus | Ciphertext AES-GCM |
| 112 | 16 | Tag wrap | 128-bit |

Setiap record: header 5 byte (`flag final` + panjang ciphertext uint32) lalu ciphertext + tag. Nonce = `prefix || index`; AAD 43 byte. Bila flag bit2 aktif, blok metadata nama terenkripsi (2 byte panjang + ciphertext + tag, nonce indeks `2^64-1`, AAD 36 byte) berada setelah header. Detail lengkap ada di dokumentasi.

---

## FAQ & Pemecahan Masalah

**T: Saya kehilangan kata sandi/keyfile saya. Apakah data saya bisa dipulihkan?**

> **Tidak.** AegisCrypt menggunakan prinsip *zero-knowledge* dan tidak memiliki pintu belakang (*backdoor*). Jika kredensial hilang, data secara matematis tidak dapat dipulihkan.

**T: Mengapa browser meminta izin untuk mengunduh banyak file sekaligus?**

> Saat memproses *batch*, aplikasi memicu unduhan untuk setiap file. Browser sering kali memblokir unduhan otomatis ganda. Silakan klik "Allow" saat diminta.

**T: Berapa batas ukuran file maksimum?**

> Telah diuji hingga **10GB** pada Chrome 120+. Batasannya bergantung pada implementasi Blob browser. Untuk file berukuran 100GB+, versi AegisCrypt Desktop (C#) sudah direncanakan tapi belum diimplementasikan — lihat `desktop/README.md`.

---

## Lisensi

[Apache-2.0](LICENSE)