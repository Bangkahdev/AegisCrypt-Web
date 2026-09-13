# Panduan Pengguna & Dokumentasi Use Case AegisCrypt-Web

> **English:** This document is also available in an English version.[English Use Case Guide.](use_case_id.md).

## 1. Ringkasan

AegisCrypt-Web adalah suite enkripsi berbasis klien (*client-side*) dengan arsitektur *zero-knowledge* yang dirancang untuk memberikan keamanan file tingkat militer langsung di dalam browser web. Memanfaatkan Web Crypto API, seluruh operasi kriptografi berjalan secara lokal di dalam RAM perangkat pengguna, memastikan bahwa data mentah, kata sandi, dan kunci tidak pernah dikirimkan ke server eksternal mana pun.

---

## 2. Skenario Use Case

### Use Case 1: Enkripsi File (Kerahasiaan & Integritas Data)

* **Aktor:** Pengguna Akhir (*End User*)
* **Tujuan:** Mengamankan file atau folder sensitif secara lokal sebelum disimpan ke penyedia cloud publik atau dikirim melalui jaringan yang tidak aman.
* **Prasyarat:** Pengguna memiliki akses ke browser web modern dan *master password* yang kuat (dengan opsi tambahan file kunci fisik).
* **Alur Kerja:**
1. **Inisialisasi Sesi:** Pengguna memasukkan kata sandi yang aman dan secara opsional mengunggah *keyfile* sekunder yang ditentukan (foto, dokumen, atau file biner) untuk menerapkan autentikasi dua faktor (2FA).
2. **Pemasukan File:** Pengguna menarik dan melepaskan (*drag & drop*) file target ke dalam antrean pemrosesan aplikasi.
3. **Eksekusi:** Saat pemicu enkripsi diaktifkan, sistem melakukan *streaming* file dalam blok-blok optimal berukuran 1MB, dan menghasilkan file kontainer `.aegis` melalui unduhan otomatis browser.



### Use Case 2: Dekripsi File (Pemulihan Data)

* **Aktor:** Pengguna Akhir (*End User*)
* **Tujuan:** Mengembalikan file `.aegis` yang sebelumnya terenkripsi ke bentuk aslinya.
* **Prasyarat:** Memiliki kata sandi utama dan/atau *keyfile* yang **persis sama** dengan yang digunakan saat proses enkripsi awal.
* **Alur Kerja:**
1. **Autentikasi:** Pengguna masuk menggunakan kredensial yang tepat (kata sandi + *keyfile*) yang terikat dengan file target.
2. **Pemasukan File:** Pengguna mengunggah file kontainer `.aegis` ke antarmuka dekripsi.
3. **Eksekusi:** Sistem memvalidasi header format file, menurunkan kunci dekripsi, dan memproses blok-blok terotentikasi untuk memulihkan file asli.



---

## 3. Di Balik Layar: Arsitektur Kriptografi

Ketika pengguna memicu suatu operasi, browser menjalankan protokol kriptografi berikut di latar belakang:

* **Derivasi Kunci (PBKDF2):**
Kata sandi pengguna (dan hash SHA-256 dari *keyfile* opsional) diproses melalui **PBKDF2** dengan **100.000 iterasi** yang dikombinasikan dengan *salt* acak sepanjang 32-byte yang aman secara kriptografis. Ini efektif mencegah serangan *brute-force* dan *rainbow table*.
* **Enkripsi Terotentikasi (AES-256-GCM):**
Data diamankan menggunakan **AES-256-GCM** (*Galois/Counter Mode*). Tidak seperti mode CBC standar, GCM menyediakan autentikasi bawaan. Jika file dirusak—atau jika kredensial yang dimasukkan salah—proses dekripsi akan langsung gagal seketika, memberikan perlindungan terhadap korupsi data dan manipulasi.
* **Arsitektur Streaming Chunk (v2):**
Untuk menangani file berukuran multi-gigabyte tanpa menghabiskan memori browser, data dipecah menjadi *chunk* berukuran 1MB. Setiap *chunk* dienkripsi menggunakan **Initialization Vector (IV)** unik berukuran 12-byte yang dibangkitkan secara acak, mencegah analisis pola dan kerentanan penggunaan ulang IV.

---

## 4. Panduan Langkah demi Langkah untuk Pengguna

### Cara Mengenkripsi File

1. Buka antarmuka AegisCrypt-Web di browser Anda.
2. Masukkan kata sandi master yang kuat ke dalam kolom sandi.
3. *(Opsional)* Aktifkan tombol toggle **Use Keyfile (2FA)** dan pilih file verifikasi fisik.
4. Klik **Start Session** untuk masuk ke dasbor utama.
5. Tarik dan letakkan (*drag & drop*) file atau folder Anda ke dalam zona unggah yang aman.
6. Klik ikon gembok untuk memulai pemrosesan.
7. Setujui dialog unduhan browser saat file kontainer `.aegis` selesai dihasilkan.

### Cara Mendekripsi File

1. Buka aplikasi dan autentikasikan diri menggunakan **kata sandi dan *keyfile* yang persis sama** dengan yang digunakan saat enkripsi.
2. Tarik dan letakkan file `.aegis` Anda ke dalam area zona dasbor.
3. Klik ikon buka kunci untuk memproses kontainer tersebut.
4. Ambil file asli Anda yang telah dipulihkan dan diunduh secara otomatis oleh browser.

---