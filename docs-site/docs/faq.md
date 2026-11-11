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

Ya. Enkripsi memotong berkas per chunk (default 1 MiB, dapat disesuaikan di header) dan menyimpan output sebagai bagian Blob. Pengujian telah dilakukan hingga 10 GB di Chrome 120+. Dekripsi menulis plaintext ke OPFS bila tersedia, sehingga memori tidak perlu menampung seluruh berkas.

## Mengapa dekripsi gagal dengan sandi yang benar?

Keyfile mungkin berbeda, kontainer dimodifikasi, atau berkas terpotong. GCM autentikasi menolak ketiga hal tersebut. Periksa sumber hash keyfile dan pulihkan kontainer dari cadangan.

## Apakah format kompatibel dengan versi desktop?

Aplikasi menulis kontainer v3 (envelope encryption, AAD per record). Kontainer v2 dari versi web lama tetap dapat didekripsi. Untuk pertukaran lintas platform, selalu jalankan uji round-trip dengan berkas yang tidak penting.

## Sumber kode

Kode sumber aplikasi tersedia di GitHub: https://github.com/Bangkahdev/AegisCrypt-Web
