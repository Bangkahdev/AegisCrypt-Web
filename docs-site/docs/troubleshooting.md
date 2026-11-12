---
sidebar_position: 10
slug: /troubleshooting
---

# Pemecahan Masalah

Tabel berikut mencantumkan gejala umum, penyebab, dan perbaikannya.

<div className="card">

| Gejala | Penyebab | Perbaikan |
|--------|----------|-----------|
| Format file tidak valid | Berkas bukan `.aegis` asli | Pilih berkas `.aegis` yang benar |
| Versi kontainer tidak didukung | Versi lebih baru atau tidak diketahui | Gunakan versi AegisCrypt terbaru atau v2 lama yang didukung |
| Metadata nama rusak | Blok nama termodifikasi atau panjang tidak valid | Pulihkan kontainer dari cadangan; dekripsi tanpa metadata tidak dimungkinkan |
| Sesi terkunci otomatis | Tidak ada aktivitas selama 10 menit | Masuk kembali dengan kata sandi/keyfile yang sama |
| Kesalahan sandi atau keyfile | Sandi atau keyfile salah | Masukkan kredensial yang sama persis |
| File corrupt | Berkas terpotong atau dimodifikasi | Pulihkan dari cadangan yang baik |
| Dekripsi kehabisan memori | Seluruh kontainer dibuffer di RAM | Dekripsi satu berkas besar per kali |
| HTTPS gagal setelah deploy pertama | Sertifikat masih sedang diterbitkan | Tunggu beberapa menit dan coba lagi |
| Aplikasi masih menampilkan versi lama | Service worker menyajikan app shell dari cache | Muat ulang saat online; jika tetap, hapus data situs di pengaturan browser |
| Halaman tidak terbuka saat offline | Kunjungan pertama belum menyelesaikan cache app shell | Buka sekali saat online, lalu coba lagi |

</div>

## Tips tambahan

- Pastikan keyfile yang digunakan saat dekripsi adalah **byte-for-byte identik** dengan yang digunakan saat enkripsi.
- Jika dekripsi gagal meskipun sandi benar, periksa apakah keyfile telah berubah atau kontainer telah dimodifikasi.
- Untuk berkas sangat besar, proses satu berkas pada satu waktu untuk menghindari kehabisan memori.
- Jika tombol Install PWA tidak muncul, pastikan situs diakses lewat HTTPS dan bukan mode penyamaran.

## Sumber kode

Kode sumber aplikasi tersedia di GitHub: https://github.com/Bangkahdev/AegisCrypt-Web
