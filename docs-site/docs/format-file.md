---
sidebar_position: 5
slug: /format-file
---

# Format File (.aegis v3)

Kontainer `.aegis` v3 memakai **envelope encryption**. Setiap berkas memiliki
Data Encryption Key (DEK) acak 256-bit yang dipakai untuk seluruh record, lalu
DEK tersebut dibungkus (*wrapped*) oleh Key Encryption Key (KEK) yang diturunkan
dari kata sandi dan keyfile opsional. Dengan cara ini, mengganti kata sandi
hanya menulis ulang header, bukan seluruh isi berkas.

Kontainer v2 lama tetap dapat **dibaca**, tetapi aplikasi hanya menulis v3.

## Header tetap (128 byte)

Semua bilangan bulat disimpan **big-endian**.

| Offset | Ukuran | Field | Nilai |
|--------|--------|-------|-------|
| 0 | 5 | Magic | `AEGIS` |
| 5 | 1 | Versi | `0x03` |
| 6 | 1 | ID KDF | `0x01` = PBKDF2-HMAC-SHA256 |
| 7 | 1 | Flag | bit0 keyfile, bit1 recovery slot, bit2 metadata nama (dicadangkan) |
| 8 | 4 | Iterasi PBKDF2 | uint32, 600.000–5.000.000 |
| 12 | 4 | Ukuran chunk | uint32, 65.536–16.777.216 byte |
| 16 | 32 | Salt | Acak per berkas |
| 48 | 16 | File ID | Acak per berkas |
| 64 | 4 | Prefix nonce | Acak per berkas |
| 68 | 12 | Nonce wrap | Acak per berkas |
| 80 | 32 | DEK terbungkus | Ciphertext AES-GCM |
| 112 | 16 | Tag wrap | Tag autentikasi 128-bit |

Bit flag yang tidak dikenal, bit cadangan yang terisi, nilai KDF/iterasi/chunk
di luar rentang, serta versi yang tidak didukung ditolak **sebelum** KDF
dijalankan.

## Pembungkusan DEK

KEK diturunkan dari `KeyMaterial` dengan PBKDF2 memakai salt dan jumlah iterasi
dari header. DEK dibungkus dengan AES-256-GCM dan **AAD 68 byte** (header byte
0–67), sehingga salt, iterasi, ukuran chunk, flag, file ID, dan prefix nonce
turut terautentikasi. Mengubah salah satu field tersebut membuat unwrap gagal
dan dilaporkan sebagai kata sandi/keyfile salah.

Jika keyfile dipakai, materi kunci menjadi:

```
KeyMaterial = Password_Bytes || SHA-256(Keyfile_Bytes)
```

## Record terenkripsi

Setiap record terdiri dari header 5 byte dan ciphertext beserta tag:

| Bagian | Ukuran | Keterangan |
|--------|--------|------------|
| Flag record | 1 byte | bit0 = record final |
| Panjang ciphertext | 4 byte | uint32, termasuk tag 16 byte |
| Ciphertext + tag | N byte | AES-256-GCM |

- **Nonce tidak disimpan.** Nonce 12 byte dihitung sebagai
  `prefix(4 byte) || index(8 byte, uint64 big-endian)`.
- **AAD 43 byte** mengikat magic, versi, ukuran chunk, file ID, prefix nonce,
  header record 5 byte, dan indeks record. Karena itu record tidak dapat
  dipindah, dipotong, atau dipalsukan tanpa gagal autentikasi.
- Record non-final harus berisi tepat satu chunk penuh
  (`ukuran chunk + 16` byte ciphertext). Record final boleh lebih pendek.
- Berkas kosong diwakili **satu record final** yang hanya berisi tag (tanpa
  plaintext).
- Setelah record final tidak boleh ada byte tambahan.

## Slot recovery (dicadangkan)

Bila flag bit1 aktif, slot 60 byte (`nonce 12 + DEK 32 + tag 16`) berada tepat
setelah header tetap. Versi ini belum menulis slot tersebut; pembaca sudah
menghitung offset record dengan benar agar kompatibel dengan fase berikutnya.

## Kompatibilitas v2 (hanya baca)

| Bagian | Ukuran | Keterangan |
|--------|--------|------------|
| Header | 38 byte | magic + versi `0x02` + salt 32 byte |
| Iterasi | tetap | 100.000, tidak disimpan di header |
| Record | bervariasi | panjang int32 little-endian, IV 12 byte, ciphertext + tag |
| AAD | tidak ada | — |

Kontainer v2 tidak memiliki AAD per record dan tidak mendukung rewrap. Aplikasi
menolak menulis v2 baru.

## Nama berkas

Kontainer tidak menyimpan nama berkas. Saat diunduh, kontainer dinamai
`original.ext.aegis`, sehingga nama dan ekstensi asli tetap terlihat. Ubah nama
kontainer jika nama berkas sensitif. Metadata nama terenkripsi dicadangkan untuk
fase berikutnya (flag bit2).

## Validasi ketat

<div className="callout callout-danger">
  <div className="callout-title">Parsing ketat</div>
  Magic, versi, ID KDF, flag, batas iterasi, batas chunk, panjang record, urutan
  indeks, keberadaan record final, dan byte sisa divalidasi. Output parsial
  dibuang jika autentikasi gagal di tengah proses.
</div>

## Sumber kode

Kode sumber aplikasi tersedia di GitHub: https://github.com/Bangkahdev/AegisCrypt-Web
