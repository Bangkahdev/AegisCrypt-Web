# AegisCrypt Web

> **English Version:** bisa dilihat [disini](README.md).

![AegisCrypt Banner](https://via.placeholder.com/1200x400/0f172a/3b82f6?text=AegisCrypt+Web+Keamanan)

**Suite Enkripsi Berbasis Klien Profesional**

**Live:** [Aplikasi](https://aegiscrypt.bangkah.tech) · [Dokumentasi](https://docs.aegiscrypt.bangkah.tech)

AegisCrypt Web adalah alat enkripsi berbasis browser dengan standar militer. Dirancang dengan prinsip **Zero-Knowledge**, yang berarti file dan kata sandi Anda diproses sepenuhnya di dalam RAM browser melalui Web Crypto API dan tidak pernah dikirimkan ke server eksternal mana pun.

---

## Fitur Utama

* **AES-256-GCM**: Enkripsi terotentikasi yang dapat mendeteksi manipulasi data.
* **Autentikasi Dua Faktor (2FA)**: Menggabungkan `Kata Sandi` + `Keyfile` (misalnya foto, dokumen) untuk keamanan tingkat lanjut.
* **Streaming Engine (v2)**: Mengenkripsi file berukuran gigabyte tanpa membuat browser *crash* (penggunaan RAM yang sangat efisien).
* **Neo-Brutalism UI**: Antarmuka modern, tegas, dan sepenuhnya responsif dengan kontras tinggi.
* **Telemetri Waktu Nyata**: Memantau kecepatan enkripsi (MB/s) dan estimasi waktu selesai (ETA).
* **Pemrosesan Batch**: Seret dan lepaskan (*drag & drop*) seluruh folder ke dalam antrean pemrosesan.

---



## Arsitektur Keamanan

AegisCrypt mengikuti standar kriptografi yang ketat untuk memastikan integritas dan kerahasiaan data.

### 1. Algoritma Utama

* **Sandi (Cipher):** AES-256-GCM (Galois/Counter Mode).
* **Mengapa GCM?:** Berbeda dengan mode CBC, GCM menyediakan **Authenticated Enkripsi**. Sistem ini memastikan bahwa jika sebuah file dirusak (bahkan hanya satu bit yang diubah), proses dekripsi akan langsung gagal alih-alih menghasilkan data korup.

### 2. Derivasi Kunci (PBKDF2)

* **Fungsi:** `PBKDF2` dengan `HMAC-SHA-256`.
* **Iterasi:** 100.000 (melebihi rekomendasi NIST untuk *password hashing*).
* **Garam (Salt):** 32-byte *Cryptographically Secure Random Salt* yang dihasilkan per file.
* **Tujuan:** Melindungi sistem dari serangan *Brute-Force* dan *Rainbow Table*.

### 3. Logika Keyfile (2FA)

* **Logika:** `KeyMaterial = Password_Bytes + SHA256(Keyfile_Bytes)`
* **Tujuan:** Memastikan bahwa meskipun seorang penyerang berhasil menebak kata sandi Anda, mereka tetap tidak dapat mendekripsi file tanpa file fisik yang persis sama yang digunakan sebagai kunci.

### 4. Streaming Enkripsi (v2)

* File dipecah ke dalam **Chunk berukuran 1MB**.
* Setiap *chunk* memiliki **Initialization Vector (IV) yang unik**.
* Hal ini mencegah analisis pola pada file berukuran besar serta melindungi dari kerentanan penggunaan ulang IV.

---

## Panduan Pengguna

Buka aplikasi langsung dan ikuti panduan di dokumentasi:

[Buka Aplikasi](https://aegiscrypt.bangkah.tech) ・ [Buka Dokumentasi](https://docs.aegiscrypt.bangkah.tech)

--- 

## Struktur Project

```
aegiscrypt-web/
├── public/
│   └── favicon.svg            # Aset statis disajikan apa adanya
├── src/
│   ├── components/
│   │   ├── ui/                # tombol, kartu, input, badge, progres
│   │   ├── FileList.tsx       # UI Antrean File
│   │   ├── LogBox.tsx         # Log Operasi
│   │   ├── LoginScreen.tsx    # Entri Autentikasi
│   │   └── PasswordInput.tsx  # Indikator Kekuatan Sandi
│   ├── services/
│   │   └── cryptoService.ts   # Mesin Inti Kriptografi (AES-GCM)
│   ├── App.tsx                # Kontroler Utama
│   ├── main.tsx               # Titik Masuk React
│   ├── constants.ts           # Konfigurasi & Magic Bytes
│   ├── index.css              # Tema Token Tailwind v4
│   └── types.ts               # Antarmuka TypeScript
├── tests/
│   ├── cryptoService.test.ts  # Suite Ujian Vitest
│   └── setup.ts               # Polyfills
├── docs/
│   └── screenshots/           # Tangkapan layar (sumber dokumentasi)
├── docs-site/                 # Situs dokumentasi (Docusaurus, statis)
├── cloudflare.config.ts       # Konfigurasi Deployment Cloudflare Worker
├── playwright.config.ts
├── vite.config.ts             # Konfigurasi Build
├── package.json
└── index.html                 # HTML & Gaya Entri
```

---

## Deployment

Kedua situs (aplikasi dan dokumentasi) di-deploy sebagai Cloudflare Workers dengan aset statis. Aplikasi memakai [`cf` CLI](https://developers.cloudflare.com/cf/); dokumentasi (Docusaurus) memakai [Wrangler](https://developers.cloudflare.com/workers/wrangler/).

| Situs | URL | Worker |
|---|---|---|
| Aplikasi | https://aegiscrypt.bangkah.tech | `aegiscrypt-web` |
| Dokumentasi | https://docs.aegiscrypt.bangkah.tech | `aegiscrypt-docs` |

```bash
# Deploy aplikasi
npm run build
npm run deploy            # atau: cf deploy --message "rilis"

# Deploy dokumentasi
cd docs-site
npm install
npm run build
npm run deploy            # wrangler deploy

# Validasi tanpa mengunggah
cf deploy --dry-run
cd docs-site; npx wrangler deploy --dry-run
```

Domain kustom dideklarasikan dalam `cloudflare.config.ts` (aplikasi) dan `docs-site/wrangler.jsonc` (dokumentasi). Cloudflare membuat catatan DNS dan sertifikat pada saat deploy.

---

## Spesifikasi Format File (.aegis v2)

Tata letak biner untuk interoperabilitas dengan versi Desktop:

| Offset Byte | Panjang | Konten | Nilai |
|---|---|---|---|
| 0 | 5 | Magic | `AEGIS` |
| 5 | 1 | Versi | `0x02` |
| 6 | 32 | Garam | Random Bytes |
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

> Telah diuji hingga **10GB** pada Chrome 120+. Batasannya bergantung pada implementasi Blob browser. Untuk file berukuran 100GB+, versi AegisCrypt Desktop (C#) sudah direncanakan tapi belum diimplementasikan — lihat `desktop/README.md`.

**T: Apakah nama file dienkripsi?**

> Tidak. Container tidak menyimpan metadata nama berkas, tetapi berkas yang diunduh dinamai `original.ext.aegis`, yang mengungkap nama dan ekstensi asli. Ubah nama container jika nama file sensitif.

**T: Apakah AegisCrypt mengirimkan sesuatu ke server?**

> Tidak ada konten file, byte kata sandi, byte keyfile, atau kunci turunan yang dikirim. Aplikasi adalah bundel statis; satu-satunya permintaan jaringan adalah untuk aset aplikasi dan stylesheet Google Fonts. Kripto tetap bekerja setelah halaman dimuat bahkan jika jaringan putus.

---

## Lisensi

[MIT](LICENSE)
