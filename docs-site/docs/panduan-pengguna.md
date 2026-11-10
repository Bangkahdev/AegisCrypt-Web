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

AegisCrypt mendukung pemrosesan banyak berkas dalam satu antrean. Anda dapat menyeret seluruh folder ke zona unggah, dan aplikasi akan memprosesnya satu per satu melalui mesin streaming 1 MiB per bagian.

## Peringatan keamanan

- File, kata sandi, dan keyfile **tidak pernah ditransmisikan** ke server.
- Setelah sesi berakhir, aplikasi tidak dapat membaca berkas Anda lagi.
- Simpan kata sandi dan keyfile dengan aman. Tidak ada opsi "lupa kata sandi".

## Sumber kode

Kode sumber aplikasi tersedia di GitHub: https://github.com/Bangkahdev/AegisCrypt-Web
