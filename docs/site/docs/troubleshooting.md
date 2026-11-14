---
sidebar_position: 10
slug: /troubleshooting
title: "Pemecahan Masalah"
description: "Solusi untuk masalah umum saat menggunakan AegisCrypt: kredensial, format, integritas, memori/kuota, dan pembaruan aplikasi."
---

# Pemecahan Masalah

Gunakan halaman ini untuk mendiagnosis masalah umum. Jika kegagalan melibatkan kemungkinan kerentanan keamanan, ikuti [kebijakan pelaporan keamanan](https://github.com/Bangkahdev/AegisCrypt-Web/blob/main/SECURITY.md).

## Masalah umum

| Gejala | Penyebab umum | Tindakan |
| --- | --- | --- |
| "Format file tidak valid" / tidak dikenali | Berkas bukan kontainer `.aegis` yang valid atau rusak parah | Pastikan berkas yang dipilih benar dan tidak terpotong saat transfer |
| "Versi file tidak didukung" | Kontainer dibuat oleh versi/format yang tidak didukung | Gunakan aplikasi versi terbaru; v2 lama masih dapat dibaca, format masa depan butuh aplikasi yang sesuai |
| "Kata sandi atau keyfile salah" | Kredensial tidak cocok, keyfile berbeda, atau header/unwrap gagal autentikasi | Verifikasi kata sandi, pastikan keyfile byte-identik; coba salinan keyfile asli |
| "Berkas ini tidak memiliki slot recovery" | Berkas tidak menyertakan recovery slot | Dekripsi dengan kata sandi/keyfile asli; slot recovery hanya ada jika diaktifkan saat enkripsi |
| "Kunci recovery salah atau slot rusak" | Kunci recovery keliru atau slot termodifikasi | Periksa kembali kunci (format/karakter), gunakan cadangan kunci yang benar |
| "Metadata nama berkas rusak..." | Blok metadata terenkripsi tidak valid/tamper | Pulihkan dari cadangan kontainer yang utuh |
| "Berkas terpotong atau tidak lengkap" | Unduhan/salinan tidak lengkap | Salin ulang berkas `.aegis` dari sumber utuh |
| "Record final tidak ditemukan" / "Terdapat data setelah record final" / "Struktur record tidak valid" | Kontainer terpotong, dimodifikasi, atau disusun tidak valid | Jangan gunakan hasil; pulihkan dari cadangan tepercaya |
| "Autentikasi berkas gagal; data dimanipulasi..." | Tag GCM gagal (tamper/kredensial konteks salah) | Verifikasi kredensial; jika tetap gagal, anggap berkas rusak/tamper dan pakai cadangan |
| Penyimpanan/kuota tidak cukup | OPFS/penyimpanan origin penuh saat dekripsi/operasi | Kosongkan ruang/kuota situs, tutup tab lain, proses berkas lebih kecil atau satu per satu |
| Aplikasi tampak versi lama setelah update | Service worker menyajikan app shell cache | Muat ulang saat online; jika perlu, bersihkan data situs untuk domain terkait lalu buka kembali |
| Tidak bisa dibuka offline | Cache app shell belum terbentuk atau dibersihkan | Buka sekali saat online dan tunggu pemuatan selesai; pastikan SW/PWA tidak diblokir |
| UI lambat/macet | Perangkat terbatas, berkas sangat besar, atau fallback non-worker | Gunakan browser terbaru, proses bertahap, tutup aplikasi lain; cek apakah Worker/OPFS tersedia |

## Pemeriksaan cepat

1. **Kredensial:** ulangi dengan kata sandi yang sama persis (termasuk kapitalisasi/spasi) dan keyfile yang identik.
2. **Integritas berkas:** bandingkan ukuran/hash kontainer dengan salinan asli/cadangan.
3. **Ruang penyimpanan:** pastikan disk dan kuota penyimpanan browser cukup.
4. **Versi aplikasi:** muat ulang untuk memastikan bukan masalah cache lama.
5. **Isolasi:** coba berkas kecil lain untuk membedakan masalah kredensial/berkas vs lingkungan browser.

## Kapan harus berhenti

- Jika berkas penting terindikasi rusak/tamper, hentikan percobaan penimpaan dan gunakan cadangan.
- Jika perangkat diduga terkompromi, jangan memasukkan kredensial sensitif; amankan perangkat terlebih dahulu.
- Jika kehilangan kata sandi, keyfile, dan kunci recovery, data terenkripsi tidak dapat dipulihkan oleh desain.

## Informasi yang berguna saat melapor bug (non-keamanan)

Sertakan (tanpa membagikan data sensitif/plaintext/kredensial):
- versi/commit aplikasi, browser dan OS
- langkah reproduksi
- pesan galat yang ditampilkan
- ukuran berkas (perkiraan) dan apakah OPFS/offline aktif
- apakah masalah terjadi pada berkas lain

Laporkan di [GitHub Issues](https://github.com/Bangkahdev/AegisCrypt-Web/issues) untuk bug non-keamanan.
