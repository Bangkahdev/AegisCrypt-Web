---
sidebar_position: 5
slug: /format-file
---

# Format File (.aegis v2)

Kontainer `.aegis` v2 dirancang untuk interoperabilitas dengan implementasi desktop AegisCrypt. Berikut adalah layout biner dari kontainer.

## Struktur biner

<div className="card">

| Bagian | Ukuran | Keterangan |
|--------|--------|------------|
| Magic bytes | 5 byte | Penanda identifikasi kontainer `.aegis` |
| Versi | 1 byte | `0x02` untuk versi 2 |
| Garam (salt) | 32 byte | Acak, dihasilkan per berkas untuk PBKDF2 |
| **Ukuran header** | **38 byte** | 5 magic + 1 versi + 32 garam |
| Plaintext per bagian | 1.048.576 byte (1 MiB) | Maksimum data plaintext sebelum enkripsi |
| IV per bagian | 12 byte | Acak per bagian untuk AES-GCM |
| Tag autentikasi | 128 bit | Ditambahkan oleh Web Crypto untuk integritas |
| Nama file output | `original.ext.aegis` | Nama asli dengan ekstensi `.aegis` ditambahkan |

</div>

## Bagian enkripsi

Setiap bagian plaintext 1 MiB dienkripsi secara terpisah dengan:
- Kunci AES-256 yang sama (diterapkan dari PBKDF2)
- IV yang unik dan acak per bagian
- Mode AES-GCM dengan tag autentikasi 128 bit

## Peraturan nama file

Kontainer tidak menyimpan metadata nama berkas asli. Saat diunduh, berkas diberi nama `original.ext.aegis`, yang mengungkap nama dan ekstensi asli. Ubah nama kontainer jika nama berkas bersifat sensitif.

<div className="callout callout-danger">
  <div className="callout-title">Parsing ketat</div>
  Magic bytes, versi, dan panjang bagian divalidasi sebelum dekripsi. Kontainer yang rusak atau dimodifikasi akan ditolak.
</div>

## Sumber kode

Kode sumber aplikasi tersedia di GitHub: https://github.com/Bangkahdev/AegisCrypt-Web
