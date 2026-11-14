---
sidebar_position: 5
slug: /format-file
title: "Format Berkas .aegis v3"
description: "Referensi struktur kontainer .aegis v3: header, envelope encryption, record, metadata nama, slot recovery, dan kompatibilitas v2."
---

# Format Berkas `.aegis` v3

Kontainer `.aegis` v3 menggunakan **envelope encryption**: payload dienkripsi dengan **DEK** acak per berkas, dan DEK dibungkus oleh **KEK** yang diturunkan dari kredensial pengguna. Format ini mendukung autentikasi integritas, pemrosesan per record, metadata nama terenkripsi, slot recovery opsional, dan rewrap kredensial.

:::info Status & sumber kebenaran
Dokumen ini adalah ringkasan referensi untuk pengguna/pengembang. Sumber normatif implementasi adalah [spesifikasi v3](https://github.com/Bangkahdev/AegisCrypt-Web/blob/main/docs/specs/spec-aegis-v3.md), konstanta kode, dan vektor uji beku di repositori. Status saat ini: *frozen-candidate* (D1/batas pemakaian DEK bersifat provisional).
:::

## Konvensi

- Integer multi-byte: **big-endian** (kecuali format legacy v2 yang dinyatakan eksplisit).
- Ukuran/offset dalam byte.
- `UTF8(x)` tanpa BOM; `SHA256(x)` = 32 byte.

## Primitif dan parameter

| Fungsi | Detail |
| --- | --- |
| Cipher terautentikasi | AES-256-GCM, nonce 96-bit, tag 128-bit |
| KDF kredensial | PBKDF2-HMAC-SHA256 (`kdf_id=0x01`), salt 32 byte, iterasi 600.000-5.000.000, output 32 byte |
| KDF recovery | HKDF-SHA256, salt kosong, info `"AEGISRCV" \|\| fileId`, output 32 byte |
| Hash keyfile | SHA-256 atas byte mentah keyfile |
| `chunk_size` | 64 KiB - 16 MiB (default 1 MiB) |

**Key material:** `PasswordBytes || KeyFilePart`, dengan `PasswordBytes = UTF8(password)` (tanpa normalisasi Unicode) dan `KeyFilePart = SHA256(keyfile bytes)` bila keyfile digunakan.

## Tata letak kontainer

```text
[ Header tetap 128 B ]
[ Recovery slot 60 B ]        (jika FLAG_RECOVERY)
[ Metadata nama variabel ]    (jika FLAG_FILENAME_METADATA)
[ Record 0 ][ Record 1 ] ...  [ Record N (final) ]
```

`metadataOffset = 128 + (recovery ? 60 : 0)`.

## Header tetap (128 byte)

| Offset | Ukuran | Field | Keterangan |
| ---: | ---: | --- | --- |
| 0 | 5 | `magic` | ASCII `AEGIS` (`41 45 47 49 53`) |
| 5 | 1 | `version` | `0x03` |
| 6 | 1 | `kdf_id` | `0x01` = PBKDF2-HMAC-SHA256 |
| 7 | 1 | `flags` | bit0 keyfile, bit1 recovery, bit2 filename metadata; bit lain ditolak |
| 8 | 4 | `iterations` | u32 BE |
| 12 | 4 | `chunk_size` | u32 BE |
| 16 | 32 | `salt` | salt KDF |
| 48 | 16 | `file_id` | pengikat unik per berkas |
| 64 | 4 | `nonce_prefix` | awalan nonce per berkas |
| 68 | 12 | `wrap_nonce` | nonce pembungkusan DEK |
| 80 | 32 | `wrapped_dek` | ciphertext DEK (32 byte) |
| 112 | 16 | `wrap_tag` | tag GCM wrap (16 byte) |

**AAD unwrap DEK (68 byte):** byte header `0..67` (mencakup magic, versi, kdf, flags, iterasi, chunk size, salt, file id, nonce prefix). Perubahan field terautentikasi menyebabkan unwrap gagal.

## Metadata nama berkas (opsional)

Jika `FLAG_FILENAME_METADATA` aktif, blok metadata berada setelah header/slot recovery:

| Field | Ukuran | Keterangan |
| --- | ---: | --- |
| `ct_len` | 2 | u16 BE, panjang ciphertext + tag |
| `sealed` | `ct_len` | AES-256-GCM(DEK) atas nama UTF-8 |

- **Nonce:** `nonce_prefix(4) || 0xFFFFFFFFFFFFFFFF` (indeks khusus, tidak dipakai record payload).
- **AAD (36 byte):** `magic(5) || version(1) || file_id(16) || nonce_prefix(4) || "AEGISFNM"(8) || ct_len(2)`.
- **Kebijakan:** nama UTF-8 valid, 1-1024 byte, tanpa NUL/`/`/`\`.
- Kontainer tanpa flag ini tetap valid; nama hasil dekripsi diturunkan dari nama kontainer.

## Record payload

Setiap record: header 5 byte + `ct_len` byte data terenkripsi.

| Bagian | Ukuran | Keterangan |
| --- | ---: | --- |
| `flags` | 1 | bit0 = FINAL; bit lain ditolak |
| `ct_len` | 4 | u32 BE, mencakup ciphertext + tag (>= 16) |
| `sealed` | `ct_len` | ciphertext + tag AES-256-GCM |

- **Nonce (tidak disimpan):** `nonce_prefix(4) || index(8, u64 BE)`, indeks mulai 0 dan naik per record.
- **AAD (43 byte):** `magic(5) || version(1) || chunk_size(4) || file_id(16) || nonce_prefix(4) || recordHeader(5) || index(8)`.
- **Record non-final:** harus tepat `chunk_size + 16` byte data terenkripsi.
- **Record final:** `16 \<= ct_len \<= chunk_size + 16`.
- **Berkas kosong:** satu record final dengan plaintext 0 byte (`ct_len == 16`).
- **Kelengkapan:** harus ada tepat satu record final; tidak boleh ada byte setelah record final; stream tanpa final ditolak.

## Slot recovery (opsional)

Jika `FLAG_RECOVERY` aktif, slot 60 byte berada pada offset 128:

| Bagian | Ukuran | Keterangan |
| --- | ---: | --- |
| `nonce` | 12 | nonce wrap recovery |
| `wrapped_dek` | 32 | DEK terenkripsi |
| `tag` | 16 | tag GCM |

- **Recovery KEK:** `HKDF-SHA256(ikm=recoveryKey, salt=kosong, info="AEGISRCV"||fileId, L=32)`.
- **AAD (30 byte):** `magic(5) || version(1) || "AEGISRCV"(8) || fileId(16)`.
- AAD/info tidak mengikat salt/iterasi/wrap utama, sehingga slot dapat disalin saat rewrap dan kunci recovery tetap berlaku untuk berkas yang sama.
- Kunci recovery (32 byte) dibuat acak, ditampilkan ke pengguna, dan **tidak disimpan** di kontainer/aplikasi.

## Batas pemakaian DEK (provisional)

Spesifikasi saat ini menetapkan batas konservatif jumlah record per DEK/berkas (`MAX_RECORDS` provisional) untuk menjaga margin keamanan dan kompatibilitas; keputusan normatif final menunggu tinjauan kriptografi eksternal. Lihat [spec v3 §7](https://github.com/Bangkahdev/AegisCrypt-Web/blob/main/docs/specs/spec-aegis-v3.md).

## Kompatibilitas v2 (baca saja)

| Aspek | v2 (legacy) |
| --- | --- |
| Status | Dapat didekripsi, **tidak ditulis** |
| Header | 38 byte: `magic(5) + version(0x02) + salt(32)` |
| KDF | PBKDF2-HMAC-SHA256, 100.000 iterasi (tetap) |
| Record | `chunkLen(4, int32 LE) + iv(12) + ciphertext+tag` |
| AAD / envelope / recovery / metadata nama | Tidak ada |

## Validasi dan kegagalan

Parser menolak kontainer dengan magic/versi/KDF/flag/parameter di luar batas, struktur terpotong, panjang record tidak valid, urutan/final tidak sah, trailing data, metadata tidak valid, atau kegagalan autentikasi GCM. Pada kegagalan, dekripsi tidak boleh menghasilkan plaintext terautentikasi parsial.

## Referensi

- [Spesifikasi v3 (normatif)](https://github.com/Bangkahdev/AegisCrypt-Web/blob/main/docs/specs/spec-aegis-v3.md)
- [Model Keamanan](/keamanan)
- [Referensi API Web](/referensi-api)
