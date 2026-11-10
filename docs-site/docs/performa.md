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
| **KDF** | PBKDF2 / HMAC-SHA-256, 100.000 iterasi |
| **Garam** | 32 byte acak per berkas |
| **IV** | 12 byte acak per bagian |
| **Tag autentikasi** | 128 bit |
| **Plaintext per bagian** | 1 MiB (1.048.576 byte) |
| **Versi kontainer** | `0x02` |
| **Ukuran header** | 38 byte (5 magic + 1 versi + 32 garam) |
| **Pengujian berkas besar** | Hingga 10 GB di Chrome 120+ |

</div>

## Batasan penggunaan

<div className="callout">
  <div className="callout-title">Batasan memori saat dekripsi</div>
  Dekripsi membuffer seluruh kontainer dan semua bagian plaintext di memori. Untuk berkas sangat besar, sebaiknya dekripsi satu per satu dan tutup tab browser lain untuk mengurangi penggunaan RAM.
</div>

## Dukungan browser

AegisCrypt memerlukan browser modern yang mendukung:
- `crypto.subtle` (Web Crypto API)
- `File.slice` (pemotongan berkas)
- `Blob` (penyimpanan hasil output)

## Sumber kode

Kode sumber aplikasi tersedia di GitHub: https://github.com/Bangkahdev/AegisCrypt-Web
