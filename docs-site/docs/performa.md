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
| **Pengujian berkas besar** | Hingga 10 GB di Chrome 120+ |

</div>

## Memori

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

AegisCrypt memerlukan browser modern yang mendukung:
- `crypto.subtle` (Web Crypto API)
- `File.slice` (pemotongan berkas)
- `Blob` (penyimpanan hasil output)

OPFS bersifat opsional dan hanya meningkatkan batas memori saat dekripsi.

## Kompatibilitas

Berkas `.aegis` v2 dari versi lama tetap dapat didekripsi dengan kredensial yang
sama (100.000 iterasi, tanpa AAD per record). Aplikasi tidak lagi menulis v2.
Untuk bermigrasi, dekripsi berkas lama lalu enkripsikan ulang.

## Sumber kode

Kode sumber aplikasi tersedia di GitHub: https://github.com/Bangkahdev/AegisCrypt-Web
