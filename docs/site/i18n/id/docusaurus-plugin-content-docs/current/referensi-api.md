---
sidebar_position: 6
slug: /referensi-api
title: "Referensi API Web"
description: "Referensi fungsi dan konstanta kriptografi publik pada implementasi Web AegisCrypt."
---

# Referensi API Web

Referensi ini merangkum antarmuka kriptografi utama pada `apps/web/src/services/cryptoService.ts`, `apps/web/src/constants.ts`, dan utilitas terkait. Ini ditujukan untuk pengembang yang membaca atau mengintegrasikan kode Web di monorepo.

:::info
Permukaan API ini adalah API internal modul TypeScript (bukan SDK paket npm publik yang distabilkan). Perilaku normatif kontainer ditentukan oleh [spesifikasi v3](/format-file).
:::

## Modul utama

| Modul | Isi |
| --- | --- |
| `apps/web/src/services/cryptoService.ts` | Enkripsi, dekripsi, rewrap, derivasi kunci, sink, helper nama berkas, `AegisError` |
| `apps/web/src/constants.ts` | Konstanta format v3/v2, batas parameter, offset header, domain AAD |
| `apps/web/src/lib/recovery.ts` | Pembuatan/codec kunci recovery dan utilitas slot |
| `apps/web/src/lib/errors.ts` | Pemetaan pesan error ke kunci i18n UI |

## Tipe dan opsi penting

### Sumber & kata sandi

- **`password`**: `string | Uint8Array` (UTF-8). Bentuk byte memungkinkan zeroisasi di UI.
- **`keyFileBuffer`**: `ArrayBuffer | null | undefined`.
- **Sumber dekripsi/rewrap (`source`)**: `File | Blob | ArrayBuffer` (pembacaan streaming didukung untuk `Blob/File`).

### Opsi enkripsi

| Opsi | Tipe | Keterangan |
| --- | --- | --- |
| `iterations` | `number` | Iterasi PBKDF2 (600.000-5.000.000) |
| `chunkSize` | `number` | Ukuran chunk plaintext (64 KiB-16 MiB) |
| `filename` | `string \| null` | Nama UTF-8 untuk metadata terenkripsi (flag bit2); `null`/kosong menonaktifkan |
| `recoveryKey` | `Uint8Array` | Menyertakan slot recovery (32 byte) |
| `randomBytes` | `(n) => Uint8Array` | RNG injeksi untuk uji deterministik |

### Opsi dekripsi

| Opsi | Tipe | Keterangan |
| --- | --- | --- |
| `sink` | `DecryptSink` | Tujuan keluaran plaintext |
| `recoveryKey` | `Uint8Array` | Buka DEK via slot recovery |
| `onFilename` | `(name: string) => void` | Callback nama berkas dari metadata terenkripsi |

### Opsi rewrap

| Opsi | Tipe | Keterangan |
| --- | --- | --- |
| `iterations` | `number` | Iterasi baru (default mempertahankan nilai lama) |
| `randomBytes` | `(n) => Uint8Array` | RNG injeksi untuk uji deterministik |

## Fungsi

| Fungsi | Tanda tangan (ringkas) | Hasil / perilaku |
| --- | --- | --- |
| `prepareKeyMaterial` | `(password, keyFileBuffer?) => Promise<Uint8Array>` | `UTF8(password) \|\| SHA-256(keyfile)` atau password saja |
| `deriveKey` | `(keyMaterial, salt, usage, iterations?) => Promise<CryptoKey>` | Kunci AES-GCM via PBKDF2-HMAC-SHA256 |
| `processFileEncrypt` | `(file, password, keyFileBuffer?, signal?, onProgress?, options?) => Promise<Blob>` | Kontainer `.aegis` v3; mendukung pembatalan/progres |
| `processFileDecrypt` | `(source, password, keyFileBuffer?, signal?, onProgress?, options?) => Promise<Blob>` | Plaintext terautentikasi; dukung v3 dan legacy v2 (baca) |
| `rewrapFile` | `(source, oldPassword, oldKeyFile?, newPassword, newKeyFile?, options?) => Promise<Blob>` | Header baru, payload/metadata/slot (sesuai aturan) dipertahankan |
| `createDefaultSink` | `() => Promise<DecryptSink>` | OPFS jika tersedia, fallback sink memori |
| `createBlobSink` | `() => DecryptSink` | Sink memori (Blob) |
| `getEncryptedFilename` | `(originalName) => string` | Menambahkan ekstensi `.aegis` |
| `getDecryptedFilename` | `(encryptedName) => string` | Melepas `.aegis` atau memberi nama fallback |

> Catatan: `onProgress` menerima nilai progres byte (implementasi dapat melaporkan byte sumber yang diproses/posisi baca; lihat `cryptoService.ts`/worker untuk detail pemanggilan).

## Sink dekripsi

`DecryptSink` menyediakan antarmuka penulisan bertahap (`write`), finalisasi (`close` -> `Blob`/hasil), dan pembatalan/pembersihan (`abort`). Gunakan `createDefaultSink()` untuk memilih OPFS bila tersedia.

## Kesalahan (`AegisError`)

Mesin kripto melempar pesan/kesalahan terstruktur untuk kondisi seperti:

- format/versi/KDF/flag/iterasi/chunk size tidak valid
- metadata nama rusak/tidak sah
- kontainer terpotong, record final hilang, trailing data, struktur record tidak valid
- autentikasi gagal/tamper, kredensial salah
- slot recovery hilang atau kunci recovery salah
- kontainer legacy v2 rusak
- operasi dibatalkan

UI memetakan pesan ini ke teks terlokalisasi melalui `apps/web/src/lib/errors.ts`.

## Konstanta penting (`constants.ts`)

| Konstanta | Nilai / makna |
| --- | --- |
| Magic / versi | `AEGIS`, v3 tulis, v2 baca |
| Header | 128 byte, AAD wrap 68 byte |
| KDF | PBKDF2-SHA256 (`0x01`), iterasi 600.000-5.000.000, salt 32 byte |
| Chunk | default 1 MiB, rentang 64 KiB-16 MiB |
| Record | header 5 byte, tag 16 byte, AAD 43 byte, flag final |
| Recovery | slot 60 byte, domain `AEGISRCV`, AAD 30 byte |
| Filename metadata | domain `AEGISFNM`, AAD 36 byte, indeks nonce khusus `2^64-1`, nama maks 1024 byte |
| Batas record | `MAX_RECORDS` (provisional, lihat spesifikasi) |

## Contoh penggunaan (konseptual)

```ts
import { processFileEncrypt, processFileDecrypt } from "@/services/cryptoService";

const container = await processFileEncrypt(file, password, keyFileBuffer, abortSignal, onProgress, {
  iterations: 600_000,
  filename: file.name,
});

const plaintext = await processFileDecrypt(container, password, keyFileBuffer, abortSignal, onProgress, {
  onFilename: (name) => console.log(name),
});
```

## Referensi

- [Format .aegis v3](/format-file)
- [Arsitektur](/arsitektur)
- [Model Keamanan](/keamanan)
