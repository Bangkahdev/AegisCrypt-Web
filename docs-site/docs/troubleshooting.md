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
| Versi kontainer tidak didukung | Versi lama atau tidak diketahui | Gunakan kontainer v2 |
| Kesalahan sandi atau keyfile | Sandi atau keyfile salah | Masukkan kredensial yang sama persis |
| File corrupt | Berkas terpotong atau dimodifikasi | Pulihkan dari cadangan yang baik |
| Dekripsi kehabisan memori | Seluruh kontainer dibuffer di RAM | Dekripsi satu berkas besar per kali |
| HTTPS gagal setelah deploy pertama | Sertifikat masih sedang diterbitkan | Tunggu beberapa menit dan coba lagi |

</div>

## Tips tambahan

- Pastikan keyfile yang digunakan saat dekripsi adalah **byte-for-byte identik** dengan yang digunakan saat enkripsi.
- Jika dekripsi gagal meskipun sandi benar, periksa apakah keyfile telah berubah atau kontainer telah dimodifikasi.
- Untuk berkas sangat besar, proses satu berkas pada satu waktu untuk menghindari kehabisan memori.

## Sumber kode

Kode sumber aplikasi tersedia di GitHub: https://github.com/Bangkahdev/AegisCrypt-Web
