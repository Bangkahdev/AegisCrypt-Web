---
sidebar_position: 11
slug: /faq
---

# FAQ

## Apakah AegisCrypt mengirimkan berkas ke server?

Tidak. Aplikasi adalah bundel statis; semua kriptografi dilakukan di browser melalui Web Crypto API. File, kata sandi, dan keyfile tidak pernah dikirim ke server eksternal.

## Apakah saya bisa memulihkan berkas tanpa keyfile?

Tidak. Jika keyfile digunakan, materi kunci mencakup `SHA-256(keyfile)`. Tanpa byte yang sama persis, PBKDF2 menurunkan kunci berbeda dan dekripsi GCM gagal.

## Apakah nama berkas dienkripsi?

Tidak. Kontainer tidak menyimpan metadata nama berkas, tetapi nama unduhan mengungkap nama dan ekstensi asli (`original.ext.aegis`). Ubah nama kontainer jika nama berkas sensitif.

## Apakah berkas besar didukung?

Ya. Enkripsi stream bagian 1 MiB dan menyimpan output sebagai bagian Blob. Pengujian telah dilakukan hingga 10 GB di Chrome 120+. Dekripsi adalah langkah yang terbatas karena membuffer seluruh kontainer dan semua bagian plaintext.

## Mengapa dekripsi gagal dengan sandi yang benar?

Keyfile mungkin berbeda, kontainer dimodifikasi, atau berkas terpotong. GCM autentikasi menolak ketiga hal tersebut. Periksa sumber hash keyfile dan pulihkan kontainer dari cadangan.

## Apakah format kompatibel dengan versi desktop?

Layout bagian v2 dimaksudkan untuk cocok dengan implementasi desktop AegisCrypt. Selalu jalankan uji round-trip dengan berkas yang tidak penting sebelum mengandalkan pertukaran lintas platform.

## Sumber kode

Kode sumber aplikasi tersedia di GitHub: https://github.com/Bangkahdev/AegisCrypt-Web
