---
sidebar_position: 3
slug: /panduan-pengguna
---

# Panduan Pengguna

Panduan ini menjelaskan alur enkripsi dan dekripsi langkah demi langkah, termasuk penggunaan keyfile sebagai faktor kedua.

## Enkripsi berkas

<div className="card">

1. **Mulai sesi** — Masukkan kata sandi dan (opsional) keyfile, lalu klik `Start Session`.
2. **Tambah berkas** — Seret berkas atau folder ke zona `Processing Queue`, atau klik `Click to browse`.
3. **Enkripsi** — Klik tombol **Encrypt** (gembok tertutup).
4. **Pantau progres** — Lihat kecepatan (MB/s), ETA, dan status di `Operation Status`.
5. **Unduh hasil** — Browser akan mengunduh kontainer `original.ext.aegis` setelah proses selesai.

</div>

## Dekripsi berkas

<div className="card">

1. **Mulai sesi** — Gunakan kata sandi dan keyfile yang **sama persis** dengan saat enkripsi.
2. **Tambah berkas** — Seret berkas `.aegis` ke zona unggah.
3. **Dekripsi** — Klik tombol **Decrypt** (gembok terbuka).
4. **Hasil** — Berkas asli berhasil dipulihkan dan siap diunduh.

</div>

## Menggunakan keyfile (2FA)

Keyfile berfungsi sebagai faktor kedua. Materi kunci yang digunakan adalah:

```
KeyMaterial = Password_Bytes + SHA-256(Keyfile_Bytes)
```

Artinya:
- Tanpa keyfile: kunci hanya berasal dari kata sandi.
- Dengan keyfile: kunci berasal dari gabungan kata sandi dan hash SHA-256 dari isi keyfile.

Keyfile dapat berupa berkas apa pun — gambar, audio, dokumen, atau berkas acak. Simpan keyfile dengan aman. Hilangnya keyfile berarti berkas tidak dapat didekripsi.

## Pemrosesan batch (banyak berkas)

AegisCrypt mendukung pemrosesan banyak berkas dalam satu antrean. Anda dapat menyeret seluruh folder ke zona unggah atau memakai tombol **Add a folder**; aplikasi menelusuri isi folder secara rekursif dan memprosesnya satu per satu melalui mesin streaming per chunk (default 1 MiB).

## Mengganti kata sandi (rewrap)

<div className="card">

1. Tambahkan berkas `.aegis` ke antrean.
2. Klik **Change password** di header.
3. Masukkan kata sandi baru dua kali; opsional tambahkan keyfile baru dan pilih jumlah iterasi PBKDF2 (600k, 1M, atau 2M).
4. Klik **Re-wrap files**. Setiap kontainer diunduh ulang dengan header baru; payload tidak dienkripsi ulang.

</div>

Rewrap hanya sah jika kata sandi/keyfile lama masih diketahui. Simpan hasil unduhan dan gunakan kata sandi baru untuk dekripsi berikutnya.

## Auto-lock dan zeroisasi

Sesi terkunci otomatis setelah 10 menit tanpa aktivitas, atau segera lewat tombol **Lock**. Saat terkunci/logout, byte kata sandi dan buffer keyfile di memori diisi nol dan antrean dibersihkan. Proses yang sedang berjalan menunda auto-lock hingga selesai.

## Memasang aplikasi dan mode offline

AegisCrypt dapat dipasang sebagai aplikasi (PWA):

1. Buka situs di Chrome atau Edge, lalu pilih ikon **Install** di bilah alamat.
2. Setelah kunjungan pertama, service worker menyimpan app shell sehingga halaman tetap terbuka tanpa jaringan.
3. Enkripsi dan dekripsi tetap berjalan penuh secara offline karena semua kriptografi lokal.

Berkas pengguna, kata sandi, dan keyfile tidak pernah disimpan di cache. Untuk memperbarui versi aplikasi setelah deploy baru, muat ulang halaman saat online.

## Peringatan keamanan

- File, kata sandi, dan keyfile **tidak pernah ditransmisikan** ke server.
- Setelah sesi berakhir, aplikasi tidak dapat membaca berkas Anda lagi.
- Simpan kata sandi dan keyfile dengan aman. Tidak ada opsi "lupa kata sandi".

## Sumber kode

Kode sumber aplikasi tersedia di GitHub: https://github.com/Bangkahdev/AegisCrypt-Web
