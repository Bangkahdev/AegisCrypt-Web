---
sidebar_position: 6
slug: /referensi-api
---

# Referensi API

Antarmuka kriptografi publik di `apps/web/src/services/cryptoService.ts` dan konstanta
kontainer di `apps/web/src/constants.ts`.

## Fungsi utama

<div className="card">

| Fungsi | Parameter | Hasil |
|--------|-----------|-------|
| `processFileEncrypt` | `(file, password, keyFileBuffer, signal, onProgress, options?)` | `Blob` kontainer `.aegis` v3 |
| `processFileDecrypt` | `(source, password, keyFileBuffer, signal, onProgress, options?)` | `Blob` berkas asli |
| `rewrapFile` | `(source, oldPassword, oldKeyFile, newPassword, newKeyFile, options?)` | `Blob` dengan header baru, payload utuh |
| `prepareKeyMaterial` | `(password, keyFileBuffer?)` | `Uint8Array` materi kunci |
| `deriveKey` | `(keyMaterial, salt, usage, iterations?)` | `CryptoKey` AES-256 |
| `createDefaultSink` | `()` | Sink OPFS, atau fallback memori |
| `createBlobSink` | `()` | Sink memori |
| `getEncryptedFilename` | `(originalName)` | `originalName` + `.aegis` |
| `getDecryptedFilename` | `(encryptedName)` | Nama asli tanpa `.aegis`, atau awalan `decrypted_` |

</div>

`source` pada dekripsi menerima `File`/`Blob` (dibaca per potongan, memori
terjaga) atau `ArrayBuffer`. Kata sandi dapat berupa `string` atau `Uint8Array`
UTF-8 (memungkinkan zeroisasi di UI).

`options` enkripsi:
- `iterations`, `chunkSize` — parameter kontainer.
- `filename` — bila diisi, nama disimpan terenkripsi (flag bit2); `null`/tidak
  diisi berarti tanpa metadata.
- `randomBytes` — RNG deterministik untuk uji vektor.

`options` dekripsi:
- `sink` — tujuan output khusus.
- `onFilename` — dipanggil dengan nama asli bila kontainer menyimpan metadata.

`options` rewrap:
- `iterations` — jumlah iterasi header baru (default: pertahankan nilai lama).
- `randomBytes` — untuk uji deterministik. Flag keyfile dan metadata nama
  dipertahankan; slot recovery dan blok metadata disalin apa adanya.

## Pesan kesalahan

`AegisError` memetakan kegagalan ke pesan spesifik: format, versi, KDF,
iterasi, ukuran chunk, flag, metadata nama rusak, berkas terpotong, record
final hilang, data sisa, struktur record, autentikasi gagal, kredensial salah,
slot recovery hilang/rusak, v2 rusak, dan pembatalan.

Lapisan kripto tetap melempar pesan Indonesia sebagai nilai stabil. UI
memetakannya ke kunci `errors.*` melalui `localizeErrorMessage` di
`apps/web/src/lib/errors.ts`, sehingga log mengikuti bahasa aktif (Inggris/Indonesia).
Kegagalan browser yang tidak dikenal (misalnya `DOMException`) diteruskan apa
adanya.

## Contoh: membungkus DEK (konseptual)

```typescript
const salt = crypto.getRandomValues(new Uint8Array(32));
const dek = crypto.getRandomValues(new Uint8Array(32));

const kek = await crypto.subtle.deriveKey(
  {
    name: "PBKDF2",
    hash: "SHA-256",
    salt,
    iterations: 600_000,
  },
  await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  ),
  { name: "AES-GCM", length: 256 },
  false,
  ["encrypt"],
);

const wrapped = await crypto.subtle.encrypt(
  {
    name: "AES-GCM",
    iv: wrapNonce, // 12 byte
    additionalData: headerBytes0to67, // 68 byte
  },
  kek,
  dek,
);
// 32 byte ciphertext + 16 byte tag disimpan di offset 80 dan 112
```

## Contoh: satu record (konseptual)

```typescript
const nonce = new Uint8Array(12);
nonce.set(prefix, 0);
new DataView(nonce.buffer).setBigUint64(4, BigInt(index), false);

const aad = buildRecordAad(chunkSize, fileId, prefix, recordHeader, index); // 43 byte

const ciphertext = await crypto.subtle.encrypt(
  { name: "AES-GCM", iv: nonce, additionalData: aad, tagLength: 128 },
  dekKey,
  plaintextChunk,
);
```

## Catatan implementasi

- Semua operasi berjalan di browser melalui `crypto.subtle`; tidak ada
  permintaan jaringan untuk data kriptografi.
- Enkripsi memotong berkas sesuai ukuran chunk di header (default 1 MiB) dan
  dapat menyertakan nama berkas terenkripsi (maksimum 1024 byte UTF-8).
- Dekripsi menulis plaintext ke Origin Private File System bila tersedia;
  penghapusan berkas sementara dijadwalkan (saat halaman ditutup atau setelah
  timeout). Jika tidak, hasil disimpan di memori.
- Progres dan kecepatan dihitung di sisi klien untuk tampilan `Operation Status`.

## Sumber kode

Kode sumber aplikasi tersedia di GitHub: https://github.com/Bangkahdev/AegisCrypt-Web
