---
sidebar_position: 6
slug: /referensi-api
---

# Referensi API

Antarmuka kriptografi publik yang digunakan oleh aplikasi AegisCrypt.

## Fungsi utama

<div className="card">

| Fungsi | Parameter | Hasil |
|--------|-----------|-------|
| `processFileEncrypt` | `(file, password, keyFileBuffer, signal, onProgress)` | Blob kontainer `.aegis` terenkripsi |
| `processFileDecrypt` | `(buffer, password, keyFileBuffer, signal, onProgress)` | Blob berkas asli terdekripsi |
| `getEncryptedFilename` | `(originalName)` | `originalName` + `.aegis` |
| `getDecryptedFilename` | `(encryptedName)` | Nama asli tanpa `.aegis`, atau awalan `decrypted_` |

</div>

## Contoh derivasi kunci (konseptual)

```typescript
const key = await crypto.subtle.deriveKey(
  {
    name: "PBKDF2",
    hash: "SHA-256",
    salt: salt, // 32 byte acak
    iterations: 100_000,
  },
  baseKey, // dari kata sandi (+ SHA-256(keyfile) jika ada)
  { name: "AES-GCM", length: 256 },
  false,
  ["encrypt", "decrypt"],
);
```

## Contoh enkripsi bagian (konseptual)

```typescript
// Berkas dipotong menjadi bagian 1 MiB
const chunk = file.slice(0, 1_048_576);
const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 byte

const encrypted = await crypto.subtle.encrypt(
  { name: "AES-GCM", iv: iv },
  key,
  await chunk.arrayBuffer(),
);

// Output: IV + ciphertext + tag autentikasi (128 bit)
```

## Catatan implementasi

- Semua operasi berjalan di browser melalui `crypto.subtle`.
- Tidak ada permintaan jaringan untuk data kriptografi.
- Progres dan kecepatan dihitung di sisi klien untuk tampilan `Operation Status`.

## Sumber kode

Kode sumber aplikasi tersedia di GitHub: https://github.com/Bangkahdev/AegisCrypt-Web
