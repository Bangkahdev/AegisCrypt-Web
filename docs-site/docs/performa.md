---
sidebar_position: 8
slug: /performa
---

# Performa & Batasan

Detail spesifikasi teknis dan batasan penggunaan AegisCrypt.

## Spesifikasi teknis

<div className="card">

| Aspek | Detail |
|-------|--------|
| **Cipher** | AES-256-GCM, kunci 256-bit |
| **KDF** | PBKDF2 / HMAC-SHA-256 |
| **Iterasi** | 600.000 default, rentang 600.000–5.000.000 (disimpan di header) |
| **Salt** | 32 byte acak per berkas |
| **Nonce record** | 12 byte, diturunkan dari prefix + indeks (tidak disimpan) |
| **Tag autentikasi** | 128 bit per record |
| **Ukuran chunk** | Default 1 MiB; rentang 64 KiB–16 MiB |
| **Versi kontainer** | `0x03` (v2 lama hanya dibaca) |
| **Ukuran header** | 128 byte (header tetap, tanpa slot recovery) |
| **Overhead per record** | 5 byte header + 16 byte tag |
| **Overhead metadata nama** | 2 byte panjang + nama UTF-8 + 16 byte tag (maksimum nama 1024 byte) |
| **Pengujian berkas besar** | Hingga 10 GB di Chrome 120+ |

</div>

## Memori

<div className="callout">
  <div className="callout-title">Thread UI tetap responsif</div>
  PBKDF2 (600.000+ iterasi) dan enkripsi/dekripsi berjalan di Web Worker.
  Antarmuka, tombol Cancel, dan animasi progres tetap merespons selama operasi
  berjalan. Worker dihentikan setelah setiap pekerjaan selesai.
</div>

<div className="callout">
  <div className="callout-title">Enkripsi dan dekripsi streaming</div>
  Enkripsi membaca berkas per chunk dan menyusun output sebagai bagian Blob.
  Dekripsi menulis plaintext ke <strong>Origin Private File System</strong> bila
  tersedia, lalu menjadwalkan penghapusan berkas sementara (saat halaman ditutup
  atau setelah timeout). Bila OPFS tidak tersedia, hasil disimpan di memori
  sehingga konsumsi RAM mengikuti ukuran berkas. Untuk berkas sangat besar,
  dekripsi satu berkas per kali.
</div>

## Dukungan browser

AegisCrypt diuji otomatis pada Chromium, Firefox, dan WebKit (Safari).
Aplikasi memerlukan browser modern yang mendukung:
- `crypto.subtle` (Web Crypto API)
- `File.slice` (pemotongan berkas)
- `Blob` (penyimpanan hasil output)

OPFS bersifat opsional dan hanya meningkatkan batas memori saat dekripsi.

## Offline dan instalasi

Aplikasi dapat dipasang sebagai PWA dan dibuka tanpa koneksi setelah kunjungan
pertama. Service worker hanya menyimpan app shell; berkas yang diproses tetap
berada di memori perangkat dan tidak pernah di-cache.

## Kompatibilitas

Berkas `.aegis` v2 dari versi lama tetap dapat didekripsi dengan kredensial yang
sama (100.000 iterasi, tanpa AAD per record). Aplikasi tidak lagi menulis v2.
Untuk bermigrasi, dekripsi berkas lama lalu enkripsikan ulang.

## Benchmark lokal

`npm run test:bench` menjalankan uji throughput 16 MiB di Chromium melalui Playwright: enkripsi, unduhan, dekripsi, lalu verifikasi nama berkas. Angka mencakup PBKDF2 600.000 iterasi dan unduhan browser, sehingga bukan murni throughput AES.

```bash
npm run build
npm run test:bench
```

Ukuran bawaan adalah 16 MiB. Untuk berkas besar, atur lewat variabel lingkungan `BENCH_SIZE_MB` (payload ditulis ke disk dan diverifikasi dengan SHA-256, jadi memori tetap terbatas):

```bash
BENCH_SIZE_MB=256 npm run test:bench
```

```powershell
$env:BENCH_SIZE_MB=256; npm run test:bench
```

Contoh keluaran pada mesin pengembangan: sekitar 20-23 MB/s untuk enkripsi dan dekripsi 16 MiB. Hasil bergantung pada CPU, browser, dan media penyimpanan; gunakan sebagai pembanding antar perubahan, bukan patokan absolut. Unduhan besar juga menambah overhead protokol Playwright, sehingga angka pada 256 MiB atau lebih akan lebih rendah.

Dekripsi memakai OPFS untuk menampung hasil sementara. Puncak pemakaian ruang kira-kira **dua kali ukuran berkas** (berkas sementara + unduhan) selama jendela pembersihan 60 detik, sehingga berkas 1 GiB membutuhkan kuota/ruang kosong sekitar 2 GiB. Bila kuota browser habis, aplikasi menampilkan pesan penyimpanan tidak cukup (bukan galat mentah browser). Uji pengembangan: 768 MiB lolos; 1 GiB kena kuota pada profil browser sementara Playwright. Untuk berkas sangat besar, pastikan ruang disk mencukupi atau proses satu berkas per sesi.

## Sumber kode

Kode sumber aplikasi tersedia di GitHub: https://github.com/Bangkahdev/AegisCrypt-Web




