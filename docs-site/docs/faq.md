---
sidebar_position: 11
slug: /faq
---

# FAQ

## Apakah AegisCrypt mengirimkan berkas ke server?

Tidak. Aplikasi adalah bundel statis; semua kriptografi dilakukan di browser melalui Web Crypto API. File, kata sandi, dan keyfile tidak pernah dikirim ke server eksternal.

## Apakah saya bisa memulihkan berkas tanpa keyfile?

Tidak, kecuali berkas tersebut memiliki slot recovery. Jika keyfile digunakan, materi kunci mencakup `SHA-256(keyfile)`; tanpa byte yang sama persis, PBKDF2 menurunkan kunci berbeda dan dekripsi GCM gagal. Bila Anda mengaktifkan kunci recovery sebelum enkripsi, kunci 256-bit itu dapat membuka DEK secara mandiri.

## Apakah kunci recovery menggantikan kata sandi?

Tidak. Kunci recovery adalah kunci independen yang hanya dapat mendekripsi berkas yang memang membawa slot recovery. Aktifkan lewat tombol **Recovery key** di header, simpan kuncinya offline, dan gunakan tab **Recovery key** di layar masuk untuk memulihkan. Sesi recovery tidak dapat mengenkripsi atau mengganti kata sandi, dan AegisCrypt tidak menyimpan kunci tersebut.

## Apakah antarmuka tersedia dalam bahasa Indonesia?

Ya. Tombol bahasa di header mengganti seluruh antarmuka antara Inggris dan Indonesia, dan pilihan tersebut disimpan untuk kunjungan berikutnya. Secara bawaan aplikasi mengikuti bahasa browser.

## Apakah aplikasi bisa dipakai offline?

Ya. Setelah kunjungan pertama, service worker menyimpan app shell sehingga AegisCrypt dapat dibuka tanpa jaringan, dan seluruh enkripsi/dekripsi tetap berjalan lokal. Service worker tidak menyimpan berkas, kata sandi, atau keyfile Anda.

## Apakah antarmuka macet saat memproses berkas besar?

Tidak. PBKDF2 dan enkripsi/dekripsi berjalan di Web Worker terpisah, sehingga progres, tombol Cancel, dan navigasi tetap responsif. Pada lingkungan tanpa dukungan Worker, operasi dijalankan di thread utama.

## Apakah nama berkas dienkripsi?

Ya, secara default. Nama asli disimpan sebagai metadata terenkripsi di dalam kontainer (flag bit2) dan dipakai kembali saat dekripsi. Nama kontainer yang diunduh tetap `original.ext.aegis`, jadi ganti nama kontainer jika nama berkas itu sendiri sensitif.

## Bisakah saya mengganti kata sandi tanpa enkripsi ulang?

Ya. Tombol **Change password** melakukan rewrap: DEK dibuka dengan kredensial lama lalu dibungkus ulang dengan kata sandi/keyfile baru. Hanya header yang ditulis ulang; record payload dan metadata nama tidak berubah.

## Apakah berkas besar didukung?

Ya. Enkripsi memotong berkas per chunk (default 1 MiB, dapat disesuaikan di header) dan menyimpan output sebagai bagian Blob. Pengujian telah dilakukan hingga 10 GB di Chrome 120+. Dekripsi menulis plaintext ke OPFS bila tersedia, sehingga memori tidak perlu menampung seluruh berkas.

## Mengapa dekripsi gagal dengan sandi yang benar?

Keyfile mungkin berbeda, kontainer dimodifikasi, atau berkas terpotong. GCM autentikasi menolak ketiga hal tersebut. Periksa sumber hash keyfile dan pulihkan kontainer dari cadangan.

## Apakah format kompatibel dengan versi desktop?

Aplikasi menulis kontainer v3 (envelope encryption, AAD per record). Kontainer v2 dari versi web lama tetap dapat didekripsi. Untuk pertukaran lintas platform, selalu jalankan uji round-trip dengan berkas yang tidak penting.

## Sumber kode

Kode sumber aplikasi tersedia di GitHub: https://github.com/Bangkahdev/AegisCrypt-Web

