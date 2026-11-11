---
sidebar_position: 7
slug: /keamanan
---

# Model Keamanan

AegisCrypt dirancang dengan prinsip **zero-knowledge**. Berikut adalah model ancaman dan jaminan keamanan yang diberikan.

## Zero-knowledge

- AegisCrypt tidak memiliki akses ke isi berkas, kata sandi, keyfile, atau kunci turunan.
- Semua data diproses di RAM browser melalui Web Crypto API.
- Kontainer diunduh langsung ke perangkat pengguna.
- Jaringan eksternal hanya untuk aset statis aplikasi (HTML, CSS, JavaScript, font).

## Model ancaman

<div className="card">

| Ancaman | Perlindungan |
|---------|-------------|
| Manipulasi ciphertext | Enkripsi terotentikasi AES-256-GCM mendeteksi perubahan satu bit |
| Serangan brute-force pada kata sandi | PBKDF2-HMAC-SHA256 dengan 600.000 iterasi (dapat dinaikkan hingga 5.000.000) |
| Dekripsi hanya dengan kata sandi | Keyfile sebagai faktor kedua (2FA opsional) |
| Record dipindah atau dipotong | AAD 43 byte per record mengikat indeks, file ID, dan header record |
| Kontainer rusak atau dimodifikasi | Parsing ketat magic bytes, versi, flag, batas iterasi/chunk, dan panjang record |

</div>

## Tanggung jawab pengguna

<div className="callout callout-danger">
  <div className="callout-title">Tanggung jawab pengguna</div>
  Simpan kata sandi dan keyfile dengan aman. Hilangnya keyfile berarti berkas tidak dapat didekripsi, karena tidak ada mekanisme pemulihan kunci di server. AegisCrypt tidak menyimpan cadangan kunci atau kata sandi.
</div>

## Apa yang tidak dilakukan AegisCrypt

- Tidak mengirim file, byte kata sandi, byte keyfile, atau kunci turunan ke server mana pun.
- Tidak menyimpan data pengguna di sisi server.
- Tidak memiliki fitur "lupa kata sandi" atau reset kunci.

## Sumber kode

Kode sumber aplikasi tersedia di GitHub: https://github.com/Bangkahdev/AegisCrypt-Web
