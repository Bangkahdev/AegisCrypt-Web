---
sidebar_position: 7
slug: /keamanan
title: "Model Keamanan"
description: "Prinsip zero-knowledge, properti kriptografi, ancaman yang dimitigasi, keterbatasan, dan tanggung jawab pengguna."
---

# Model Keamanan

Dokumen ini merangkum model keamanan AegisCrypt untuk implementasi saat ini (Web/Desktop, format `.aegis` v3). Spesifikasi format dan threat model rinci tersedia di repositori.

:::warning Penting
AegisCrypt melindungi kerahasiaan dan integritas **kontainer berkas** dengan asumsi perangkat, browser/OS, dan kredensial pengguna aman. Aplikasi ini tidak dapat mencegah kompromi pada endpoint, malware, ekstensi berbahaya, atau akses fisik ke perangkat yang tidak terkunci.
:::

## Prinsip zero-knowledge (Fase 1)

- Enkripsi dan dekripsi dilakukan **secara lokal** di perangkat pengguna.
- Berkas plaintext/ciphertext, kata sandi, keyfile, kunci pemulihan, dan kunci turunan **tidak dikirim** ke server aplikasi.
- Server/distribusi statis hanya menyajikan aset aplikasi; tidak ada pemrosesan data pengguna di sisi server.
- Tidak ada mekanisme pemulihan kredensial sisi server.

## Properti kriptografi utama

| Area | Mekanisme |
| --- | --- |
| Cipher terautentikasi | AES-256-GCM (tag 128-bit) untuk payload, metadata nama, dan wrap DEK/slot recovery |
| Derivasi kunci | PBKDF2-HMAC-SHA256, salt 32 byte, iterasi 600.000-5.000.000 (tersimpan di header) |
| Materi kunci | `UTF8(password) \|\| SHA-256(keyfile bytes)` (keyfile opsional, byte-exact) |
| Envelope encryption | DEK acak per berkas dibungkus KEK; mendukung rewrap tanpa enkripsi ulang payload |
| Keunikan nonce | Nonce record diturunkan deterministik `prefix(4) \|\| index(8)` per DEK/berkas |
| Pengikatan konteks (AAD) | AAD mengikat header/wrap, record (indeks/header/fileId/chunk), metadata nama, dan domain recovery |
| Recovery | HKDF-SHA256 (`AEGISRCV` + `fileId`) untuk membuka slot recovery; slot dapat disalin saat rewrap |
| Validasi format | Magic/versi/KDF/flag/rentang/struktur/record final/trailing divalidasi; gagal autentikasi -> operasi dibatalkan |

## Ancaman yang ditangani (ringkasan)

| Ancaman | Mitigasi |
| --- | --- |
| Modifikasi ciphertext/header/metadata | AES-GCM + AAD; verifikasi gagal menolak keluaran |
| Pemotongan, penyisipan, pengurutan ulang, duplikasi, atau byte sisa | Indeks nonce/AAD, flag final, validasi panjang/struktur, penolakan trailing |
| Tebak kata sandi offline (terbatas) | PBKDF2 dengan iterasi tinggi dan salt acak per berkas; keyfile opsional |
| Salah kredensial/recovery | Unwrap/tag verification gagal (pesan kesalahan terkontrol) |
| Pemakaian lintas berkas/konteks | `fileId`, nonce prefix, dan domain AAD mengikat data ke kontainer |
| Parameter/struktur berbahaya (DoS parser) | Batas iterasi/chunk/ukuran metadata/record dan validasi sebelum/selama pemrosesan |

## Keterbatasan dan risiko residual

- **Perangkat terkompromi:** malware, keylogger, ekstensi berbahaya, atau debugger dapat membaca data/kunci saat diproses.
- **Memori/runtime:** penghapusan memori di JS/.NET tidak dijamin seketika oleh runtime/GC; aplikasi melakukan zeroisasi terbaik pada jalur yang dikontrol.
- **Output sementara:** berkas sementara (mis. OPFS/unduhan/temp) dibersihkan secara terbaik, tetapi bukan *secure erase* pada semua media/jurnal/snapshot.
- **Fallback memori (Web):** bila OPFS tidak tersedia, dekripsi dapat menggunakan fallback in-memory; enkripsi merakit keluaran sebagai Blob (jejak memori bergantung browser).
- **Metadata & kebocoran samping:** ukuran kontainer/chunk pattern, nama kontainer unduhan, dan metadata OS dapat mengungkap informasi.
- **Ketersediaan kredensial:** tanpa kata sandi/keyfile/kunci pemulihan yang valid, data tidak dapat dipulihkan.
- **Status assurance:** format v3 *frozen-candidate*; audit kriptografi independen dan tinjauan eksternal masih menjadi bagian rencana kesiapan.

## Tanggung jawab pengguna

- Gunakan kata sandi kuat dan unik; simpan keyfile/kunci pemulihan secara terpisah dan aman.
- Verifikasi hasil dekripsi sebelum menghapus sumber asli.
- Lindungi perangkat (kunci layar, pembaruan OS/browser, hindari perangkat tidak tepercaya).
- Pahami bahwa berbagi kunci pemulihan/kata sandi memberikan akses ke data.

## Pelaporan kerentanan

Jangan melaporkan kerentanan keamanan melalui issue publik. Ikuti instruksi di [SECURITY.md](https://github.com/Bangkahdev/AegisCrypt-Web/blob/main/SECURITY.md) di repositori.

## Bacaan lanjutan

- [Arsitektur](/arsitektur)
- [Format .aegis v3](/format-file)
- [Threat model (repo)](https://github.com/Bangkahdev/AegisCrypt-Web/blob/main/docs/specs/threat-model-v1.md)
- [Spesifikasi v3 (repo)](https://github.com/Bangkahdev/AegisCrypt-Web/blob/main/docs/specs/spec-aegis-v3.md)
