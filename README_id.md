# AegisCrypt Web

> **English Version:** You can read the English README [here](README.md).

**Suite Enkripsi Berbasis Klien Profesional**

AegisCrypt Web adalah alat enkripsi berbasis browser dengan standar militer. Dirancang dengan prinsip **Zero-Knowledge**, yang berarti file dan kata sandi Anda diproses sepenuhnya di dalam RAM browser melalui Web Crypto API dan tidak pernah dikirimkan ke server eksternal mana pun.

---

## Fitur Utama

* **AES-256-GCM**: Enkripsi terotentikasi yang dapat mendeteksi manipulasi data.
* **Autentikasi Dua Faktor (2FA)**: Menggabungkan `Password` + `Keyfile` (misalnya foto, dokumen) untuk keamanan tingkat lanjut.
* **Streaming Engine (v2)**: Mengenkripsi file berukuran gigabyte tanpa membuat browser *crash* (penggunaan RAM yang sangat efisien).
* **Cyberpunk Glass UI**: Antarmuka modern yang sepenuhnya responsif dengan animasi waktu nyata (*real-time*).
* **Telemetri Waktu Nyata**: Memantau kecepatan enkripsi (MB/s) dan estimasi waktu selesai (ETA).
* **Pemrosesan Batch**: Tarik dan letakkan (*drag & drop*) seluruh folder ke dalam antrean pemrosesan.

---

## Tangkapan Layar & Demo

### 1. Dasbor Utama

Pusat kendali utama untuk memantau antrean, memeriksa kecepatan, dan mengelola sesi aktif.

### 2. Layar Masuk & Sesi (2FA)

Titik masuk yang aman. Membutuhkan kata sandi dan file kunci opsional untuk menurunkan kunci enkripsi master.

### 3. Antrean Pemrosesan

Mengelola file Anda sebelum melakukan proses enkripsi.

---

## Arsitektur Keamanan

AegisCrypt mengikuti standar kriptografi yang ketat untuk memastikan integritas dan kerahasiaan data.

### 1. Algoritma Utama

* **Sandi (Cipher):** AES-256-GCM (Galois/Counter Mode).
* **Mengapa GCM?:** Berbeda dengan mode CBC, GCM menyediakan **Authenticated Encryption**. Sistem ini memastikan bahwa jika sebuah file dirusak (bahkan hanya satu bit yang diubah), proses dekripsi akan langsung gagal alih-alih menghasilkan data korup.

### 2. Derivasi Kunci (PBKDF2)

* **Fungsi:** `PBKDF2` dengan `HMAC-SHA-256`.
* **Iterasi:** 100.000 (melebihi rekomendasi NIST untuk *password hashing*).
* **Salt:** 32-byte *Cryptographically Secure Random Salt* yang dihasilkan per file.
* **Tujuan:** Melindungi sistem dari serangan *Brute-Force* dan *Rainbow Table*.

### 3. Logika Keyfile (2FA)

* **Logika:** `KeyMaterial = Password_Bytes + SHA256(Keyfile_Bytes)`
* **Tujuan:** Memastikan bahwa meskipun seorang penyerang berhasil menebak kata sandi Anda, mereka tetap tidak dapat mendekripsi file tanpa file fisik yang persis sama yang digunakan sebagai kunci.

### 4. Streaming Encryption (v2)

* File dipecah ke dalam **Chunk berukuran 1MB**.
* Setiap *chunk* memiliki **Initialization Vector (IV) yang unik**.
* Hal ini mencegah analisis pola pada file berukuran besar serta melindungi dari kerentanan penggunaan ulang IV.

---

## Memulai

### Prasyarat

* Node.js (v18+)
* npm atau yarn

### Cara Instalasi

```bash
# 1. Kloning repositori
git clone https://github.com/Bangkah/AegisCrypt-Web.git

# 2. Masuk ke direktori
cd AegisCrypt-Web

# 3. Instal Dependensi
npm install

# 4. Jalankan Server Pengembangan
npm start

```

Aplikasi akan berjalan di `http://localhost:5173` (bawaan Vite).

---

## Panduan Pengguna

### Alur Enkripsi

1. **Masuk (Login):** Masukkan kata sandi yang kuat. (Opsional) Tarik file acak (gambar, lagu, dokumen) ke area Keyfile.
2. **Tambah File:** Tarik file atau folder ke zona unggah kaca (*glass drop zone*).
3. **Enkripsi:** Klik **Tombol Gembok Biru**.
4. **Tunggu:** Pantau bilah kemajuan. File besar diproses melalui mekanisme *streaming*.
5. **Unduh:** Browser akan secara otomatis mengunduh file berformat `.aegis`.

### Alur Dekripsi

1. **Masuk (Login):** **HARUS** menggunakan kata sandi dan Keyfile yang persis sama seperti saat proses enkripsi.
2. **Tambah File:** Tarik file `.aegis` ke dalam zona unggah.
3. **Dekripsi:** Klik **Tombol Buka Gembok Gelap**.
4. **Hasil:** File asli Anda berhasil dipulihkan.

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

## Spesifikasi Format File (.aegis v2)

Tata letak biner untuk interoperabilitas dengan versi Desktop:

| Offset Byte | Panjang | Konten | Nilai |
| --- | --- | --- | --- |
| 0 | 5 | Magic | `AEGIS` |
| 5 | 1 | Versi | `0x02` |
| 6 | 32 | Salt | Random Bytes |
| 38 | 4 | Panjang Chunk 1 | Int32 LE |
| 42 | 12 | IV Chunk 1 | Random Bytes |
| 54 | N | Ciphertext | Data Terenkripsi |
| ... | ... | ... | Berulang untuk Chunk 2... |

---

## FAQ & Pemecahan Masalah

**T: Saya kehilangan kata sandi/keyfile saya. Apakah data saya bisa dipulihkan?**

> **Tidak.** AegisCrypt menggunakan prinsip *zero-knowledge* dan tidak memiliki pintu belakang (*backdoor*). Jika kredensial hilang, data secara matematis tidak dapat dipulihkan.

**T: Mengapa browser meminta izin untuk mengunduh banyak file sekaligus?**

> Saat memproses *batch*, aplikasi memicu unduhan untuk setiap file. Browser sering kali memblokir unduhan otomatis ganda. Silakan klik "Allow" saat diminta.

**T: Berapa batas ukuran file maksimum?**

> Telah diuji hingga **10GB** pada Chrome 120+. Batasannya bergantung pada implementasi Blob browser. Untuk file berukuran 100GB+, gunakan versi AegisCrypt Desktop (C#).