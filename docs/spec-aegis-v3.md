# Spesifikasi Format `.aegis` v3 (Draft Pembekuan)

**Status:** FROZEN-CANDIDATE v1.0 — D2/D3/D4 ditetapkan; D1 provisional menunggu tinjauan kriptografis eksternal
**Versi dokumen:** 1.0  
**Tanggal:** 2026-11-13  
**Sumber kebenaran implementasi saat ini:** `src/constants.ts`, `src/services/cryptoService.ts`, `src/lib/recovery.ts`, `desktop/src/AegisCrypt.Core/*`, `tests/fixtures/v3-vector.json`

Dokumen ini mendefinisikan format kontainer `.aegis` v3 sebagai kontrak interoperabilitas antara implementasi Web dan Desktop (.NET 8). Perubahan yang memengaruhi byte di kabel/berkas atau derivasi kunci **tidak boleh** dilakukan tanpa memperbarui dokumen ini, test vector, dan kedua implementasi.

> **Catatan kriptografi:** keputusan yang menyangkut batas keamanan (khususnya batas pemakaian per-DEK AES-GCM dan jumlah record maksimum) **wajib divalidasi secara kriptografis** sebelum status dokumen diubah menjadi “beku”.

---

## 1. Ruang Lingkup dan Tujuan

- **Tujuan:** mengenkripsi berkas secara terautentikasi (AES-256-GCM) dengan envelope encryption, mendukung streaming, deteksi manipulasi/pemotongan/penyisipan, rewrap kredensial tanpa mengenkripsi ulang payload, dan slot recovery opsional.
- **Non-tujuan:** kerahasiaan nama berkas/ukuran terhadap pengamat yang memiliki akses ke kontainer (kecuali nama berkas dienkripsi di metadata opsional; ukuran tetap dapat diinferensikan), perlindungan pada perangkat/OS yang terkompromi penuh.
- **Lisensi/dekripsi:** format dan data terautentikasi harus dapat didekripsi dengan kredensial/kunci yang benar tanpa ketergantungan lisensi, akun, atau jaringan (prinsip produk).

## 2. Konvensi

- Semua integer multi-byte **big-endian** kecuali dinyatakan lain.
- Offset/ukuran dalam byte. `||` = konkatenasi byte.
- `UTF8(x)` = pengodean UTF-8 dari string `x` (tanpa BOM). `SHA256(x)` = hash SHA-256 32 byte.
- `u8/u16/u32/u64` = integer tak bertanda 8/16/32/64-bit.
- Nilai “harus”/“wajib”/“ditolak” bersifat normatif untuk parser/penulis yang patuh.

## 3. Primitif Kriptografi

| Fungsi | Primitif | Parameter |
|---|---|---|
| Enkripsi payload/metadata/wrap | AES-256-GCM | kunci 256-bit, nonce 96-bit, tag 128-bit |
| KDF (KEK dari material) | PBKDF2-HMAC-SHA256 | salt 32 byte, iterasi disimpan di header, keluaran 32 byte |
| KEK recovery | HKDF-SHA256 | salt kosong, info terikat `fileId`, keluaran 32 byte |
| Hash keyfile | SHA-256 | atas byte mentah keyfile |

**KDF ID:** `0x01` = PBKDF2-HMAC-SHA256. Nilai lain dicadangkan dan **harus ditolak** oleh implementasi saat ini.

## 4. Key Material, KEK, dan DEK

### 4.1 Key Material (password + keyfile opsional)

Key material adalah byte yang menjadi masukan PBKDF2:

```
KeyMaterial = PasswordBytes || KeyFilePart
KeyFilePart = SHA256(KeyFileBytes)   jika keyfile diberikan
            = (kosong)               jika tidak
PasswordBytes = UTF8(password)
```

- **Password (D2 — DITETAPKAN):** byte yang dipakai adalah **UTF-8 persis** dari string yang dimasukkan pengguna (`TextEncoder`/`Encoding.UTF8`), **tanpa normalisasi Unicode** (tidak ada NFC/NFD/NFKC/NFKD). Dua password yang tampak sama tetapi berbeda urutan codepoint menghasilkan KEK berbeda; ini disengaja agar deterministik lintas platform. Mengubah kebijakan normalisasi di masa depan **wajib** menaikkan versi format.
- **Keyfile (D2 — DITETAPKAN):** `SHA256` dihitung atas **seluruh byte mentah** berkas (bukan nama/path/metadata), lalu ditempelkan **setelah** `PasswordBytes` tanpa pemisah (panjang hash tetap 32 byte). Urutan ini tidak boleh diubah; membalik urutan mengubah semua kunci.
- **Flag header bit0 (`FLAG_KEYFILE`)** menandai bahwa keyfile digunakan; parser memvalidasi flag yang dikenal, namun kebenaran kredensial tetap ditentukan oleh keberhasilan unwrap/autentikasi.

### 4.2 KEK dan pembungkusan DEK

- **DEK:** 32 byte acak (CSPRNG) per berkas; mengenkripsi seluruh record payload dan metadata nama berkas.
- **KEK:** `PBKDF2-HMAC-SHA256(KeyMaterial, salt, iterations, 32)`.
- **Wrap DEK:** `AES-256-GCM(KEK, wrapNonce, plaintext=DEK, AAD=HeaderAAD[0..67], tag=128)`. Hasil (ciphertext 32 byte + tag 16 byte) disimpan di header.

### 4.3 Recovery Key dan slot (opsional)

- **Recovery key:** 32 byte acak, direpresentasikan ke pengguna sebagai heksadesimal huruf besar dalam grup 8 karakter (pemisah `-`/spasi diabaikan saat parse). **Tidak pernah disimpan** di kontainer.
- **Recovery KEK:** `HKDF-SHA256(ikm=RecoveryKey, salt="" (0 byte), info="AEGISRCV"||fileId, L=32)` diimpor sebagai kunci AES-256.
- **Recovery slot (60 byte):** `recoveryNonce(12) || wrappedDEK(32) || tag(16)` pada offset 128 bila `FLAG_RECOVERY` diset.
- **AAD recovery (30 byte):** `magic(5) || version(1) || "AEGISRCV"(8) || fileId(16)`. Sengaja **tidak** mengikat salt/iterasi/wrap utama agar slot dapat disalin verbatim saat rewrap password.
- **Rewrap:** menulis ulang header utama; menyalin tail mulai offset 128 (termasuk slot recovery dan metadata nama berkas serta payload) tanpa perubahan — sehingga `fileId` dan domain AAD recovery tetap konsisten.

## 5. Tata Letak Kontainer v3

```
[ Header tetap 128 B ]
[ Recovery slot 60 B ]        (hanya jika FLAG_RECOVERY)
[ Filename metadata var ]     (hanya jika FLAG_FILENAME_METADATA)
[ Record 0 ][ Record 1 ] ... [ Record N (final) ]
```

`metadataOffset` (awal blok metadata/record setelah header tetap) = `128 + (FLAG_RECOVERY ? 60 : 0)`.

### 5.1 Header tetap (128 byte, big-endian)

| Offset | Ukuran | Field | Keterangan |
|---:|---:|---|---|
| 0 | 5 | magic | ASCII `AEGIS` = `41 45 47 49 53` |
| 5 | 1 | version | `0x03` |
| 6 | 1 | kdf_id | `0x01` = PBKDF2-HMAC-SHA256 |
| 7 | 1 | flags | bit0 keyfile, bit1 recovery, bit2 filename; bit lain **ditolak** |
| 8 | 4 | iterations | u32 PBKDF2 |
| 12 | 4 | chunk_size | u32 ukuran plaintext per record non-final |
| 16 | 32 | salt | salt KDF |
| 48 | 16 | file_id | pengikat unik per berkas (AAD/nonce domain/HKDF info) |
| 64 | 4 | nonce_prefix | awalan nonce per berkas |
| 68 | 12 | wrap_nonce | nonce unwrap DEK utama |
| 80 | 32 | wrapped_dek | ciphertext DEK (tanpa tag) |
| 112 | 16 | wrap_tag | tag GCM unwrap DEK |

- **Header AAD (68 byte):** byte `0..67` diautentikasi saat unwrap DEK (mencakup magic, version, kdf_id, flags, iterations, chunk_size, salt, file_id, nonce_prefix).
- **Validasi parser (sebelum kerja KDF):** magic benar, panjang ≥ 128, `version == 3`, `kdf_id` didukung, tidak ada flag tak dikenal, `iterations` dan `chunk_size` dalam rentang yang diizinkan.

### 5.2 Metadata nama berkas terenkripsi (opsional, `FLAG_FILENAME_METADATA`)

Letak: langsung setelah `metadataOffset`. Hanya satu blok.

| Field | Ukuran | Keterangan |
|---|---:|---|
| ct_len | 2 | u16 BE, panjang `ciphertext || tag` |
| sealed | ct_len | AES-256-GCM(DEK) atas nama berkas UTF-8 |

- **Nonce metadata:** `nonce_prefix(4) || 0xFFFFFFFFFFFFFFFF (u64 BE)` (indeks khusus, tidak dipakai record).
- **AAD metadata (36 byte):** `magic(5)||version(1)||file_id(16)||nonce_prefix(4)||"AEGISFNM"(8)||ct_len(2)`.
- **Batas/kebijakan nama:** plaintext UTF-8 valid, panjang 1..1024 byte; **ditolak** jika kosong, mengandung NUL (`\u0000`), `/`, atau `\`.
- **Validasi:** `ct_len >= 16` (tag) dan `ct_len <= 1024 + 16`; blok tidak boleh terpotong; kegagalan autentikasi/decode/kebijakan → error format/metadata/tamper sesuai implementasi.

### 5.3 Record payload

```
RecordHeader (5 B): flags(1) || ct_len(4, u32 BE)
Payload:            ciphertext || tag(16)   (panjang = ct_len)
Nonce (tidak disimpan): nonce_prefix(4) || index(8, u64 BE), index mulai 0 bertambah per record
```

- **Record flags:** bit0 = `FINAL`. Bit lain **ditolak**.
- **`ct_len`:** mencakup tag (≥ 16). Untuk record **non-final** wajib `ct_len == chunk_size + 16`. Untuk record **final** wajib `16 <= ct_len <= chunk_size + 16`.
- **AAD record (43 byte):** `magic(5)||version(1)||chunk_size(4,u32)||file_id(16)||nonce_prefix(4)||RecordHeader(5)||index(8,u64)`.
- **Berkas kosong:** tepat satu record final dengan plaintext 0 byte (`ct_len == 16`).
- **Aturan urutan/kelengkapan:**
  - Record dibaca berurutan dari awal blok record.
  - Harus ada tepat satu terminasi: record dengan flag FINAL; setelah FINAL **tidak boleh ada byte tersisa** (`trailing` ditolak).
  - Jika stream berakhir tanpa FINAL → `missingFinal` ditolak.
  - Header/ukuran/panjang yang tidak konsisten atau terpotong → `record`/`truncated` ditolak.
  - Kegagalan verifikasi GCM → `tampered` (atau kredensial salah pada unwrap).

## 6. Parameter yang Diizinkan (D3 ditetapkan)

| Parameter | Rentang/Aturan saat ini | Status |
|---|---|---|
| `iterations` (PBKDF2) | integer, **600.000 - 5.000.000** (inklusif) | **D3 — DITETAPKAN (beku)** |
| `chunk_size` (plaintext/record non-final) | integer, **65.536 B (64 KiB) - 16.777.216 B (16 MiB)** (inklusif) | **D3 — DITETAPKAN (beku)**; parser menolak record melebihi `chunk_size + 16` |
| `salt` | 32 byte (CSPRNG) | Beku (sesuai implementasi) |
| `file_id` | 16 byte (CSPRNG) | Beku |
| `nonce_prefix` | 4 byte (CSPRNG) | Beku |
| `wrap_nonce` / nonce record / nonce recovery | 12 byte (CSPRNG untuk nilai acak) | Beku |
| KDF | `0x01` PBKDF2-HMAC-SHA256 | Beku untuk v3; ekstensi via id baru |
| Tag GCM | 128-bit | Beku |

## 7. Batas Pemakaian DEK / Record (D1 PROVISIONAL — VALIDASI KRIPTOGRAFIS)

**Keputusan provisional:** satu berkas/DEK maksimum **`MAX_RECORDS = 2^32 - 2 = 4.294.967.294` record** (indeks `0 .. 2^32-3`), dan indeks `2^64-1` tetap dicadangkan untuk metadata nama berkas. Penulis **tidak boleh** membuat record melebihi batas; parser **harus menolak** (`record` error) bila menemukan indeks di luar batas.

**Dasar:** NIST SP 800-38D §8.3 membatasi jumlah invokasi fungsi authenticated encryption per kunci untuk IV 96-bit dengan konstruksi deterministik hingga `2^32`. Karena setiap record adalah satu invokasi dengan IV deterministik unik (`nonce_prefix || index`), jumlah record dibatasi `2^32` dengan margin 2 (metadata + cadangan). Batas ini **bukan** diturunkan dari kapasitas indeks 64-bit.

**Ukuran per invokasi:** `chunk_size ≤ 16 MiB`. Nilai ini jauh di bawah batas panjang plaintext per invokasi GCM (SP 800-38D §5.2.1.1: ≤ `2^39 - 256` bit ≈ 68,7 GB untuk IV 96-bit). Dengan demikian total plaintext per berkas dibatasi `MAX_RECORDS × chunk_size` (maksimum teoretis ≈ 64 PiB), tetapi secara praktis dibatasi ukuran berkas/penyimpanan platform.

**Perilaku normatif saat terlampaui:**
- Penulis: menolak mengenkripsi record ke-`2^32-1` dan seterusnya (error terkontrol; tidak ada keluaran parsial).
- Parser: menolak kontainer yang memuat record dengan indeks ≥ `MAX_RECORDS` (`AegisError.record` di Web; `AegisErrors.Record` di Desktop).

**Status:** provisional. Angka ini **wajib ditinjau kriptografer independen** (batas invokasi/tag, margin forgery, kebijakan rotasi DEK) sebelum status dokumen menjadi FROZEN v2.0. Jika tinjauan menurunkan batas, perubahan bersifat *parsing lebih ketat* dan tidak merusak berkas yang sudah valid di bawah batas baru.

## 7.1 Batas ukuran praktis (non-normatif)
- Ukuran berkas yang dapat diproses dibatasi memori/platform (Web: Blob/OPFS; Desktop: stream seekable), bukan oleh format.
- Rekomendasi implementasi: tampilkan peringatan bila berkas mendekati batas praktis platform, tanpa mengubah byte format.

## 8. Kompatibilitas dan Versi Lama

### 8.1 v3 (ditulis)
- Implementasi **hanya menulis** v3.
- v3 ditandai `version == 0x03`, header 128 byte, envelope + AAD + record terautentikasi.

### 8.2 v2 (dibaca/legacy, tidak ditulis)

Untuk interoperabilitas baca mundur, parser dapat mendekripsi v2:

- **Header:** 38 byte = `magic(5) || version(0x02) || salt(32)`.
- **KDF:** PBKDF2-HMAC-SHA256, **100.000** iterasi (tetap, tidak disimpan), keluaran 32 byte.
- **Key material:** konstruksi sama (`UTF8(password) || SHA256(keyfile)` bila ada) — mengikuti keputusan D2 (byte-exact, tanpa normalisasi).
- **Record:** berulang sampai EOF: `chunkLen(4, int32 **little-endian**) || iv(12) || ciphertext+tag(chunkLen - 12)`, AES-256-GCM tanpa AAD.
- **Tanpa:** envelope DEK/KEK terpisah, fileId, nonce terikat indeks, AAD, metadata nama berkas terenkripsi, slot recovery, rewrap v3.
- **Status test vector v2 (D4 - SELESAI):** `tests/fixtures/v2-vector.json` (2 record, password+keyfile, encoder independen) dibaca oleh tes Web (`tests/vectors.test.ts`) dan Desktop (`AegisCryptoTests.DecryptsFrozenLegacyV2Vector`).

### 8.3 Penolakan
- Magic tidak cocok / versi tidak didukung / KDF tidak didukung / flag tak dikenal / parameter di luar rentang / struktur rusak-terpotong-trailing-tamper → ditolak dengan error terkontrol (katalog pesan distabilkan di implementasi).

### 8.4 Matriks paritas perilaku v2 (Web = Desktop)

| Kondisi | Error kanonis | Web | Desktop |
|---|---|---|---|
| Magic salah (byte 0-4) | `Format file tidak valid (.aegis tidak dikenali).` | `AegisError.format` | `AegisErrors.Format` |
| Versi selain 2/3 (mis. byte 5 = 1) | `Versi file tidak didukung (v1). Perbarui aplikasi.` | `AegisError.version(1)` | `AegisErrors.Version(1)` |
| Header < 38 byte | `Berkas terpotong atau tidak lengkap.` | `truncated` | `Truncated` |
| Kontainer kosong (header saja) | — (hasil kosong) | kosong | kosong, `LegacyV2 = true` |
| `chunkLen` ≤ 0 | `Berkas corrupt: struktur v2 tidak valid.` | `legacyCorrupt` | `LegacyCorrupt` |
| `chunkLen` > sisa data | `Berkas corrupt: struktur v2 tidak valid.` | `legacyCorrupt` | `LegacyCorrupt` |
| Prefiks panjang terpotong | `Berkas corrupt: struktur v2 tidak valid.` | `legacyCorrupt` | `LegacyCorrupt` |
| Byte setelah record terakhir | `Berkas corrupt: struktur v2 tidak valid.` | `legacyCorrupt` | `LegacyCorrupt` |
| Tag GCM rusak / password salah | `Kata sandi atau keyfile salah.` | `credentials` | `Credentials` |
| Recovery key pada v2 | `Berkas ini tidak memiliki slot recovery.` | `recoveryMissing` | `RecoveryMissing` |

Matriks ini ditegakkan oleh `tests/legacyV2.test.ts` dan `desktop/tests/AegisCrypt.Core.Tests/AegisCryptoTests.cs` (fakta `LegacyV2*`).

## 9. Penanganan Error dan Ketahanan Parser

- Validasi struktural (magic, versi, KDF, flag, rentang, panjang, kelengkapan, final/trailing) dilakukan **sebelum** atau **tanpa** menerima output plaintext yang tidak terautentikasi.
- Setiap kegagalan verifikasi GCM (unwrap, metadata, record) **membatalkan** dekripsi; sink/output parsial harus dibuang (abort) dan keluaran akhir tidak dipublikasikan.
- Parser harus menolak: kontainer terpotong, kelebihan byte setelah record final, record non-final dengan ukuran tidak sesuai `chunk_size`, `ct_len` di luar batas, flag/bit tak dikenal, metadata di luar kebijakan.

## 10. Interoperabilitas dan Test Vector

- **v3 beku (kanonis):** `tests/fixtures/v3-vector.json` (plaintext, password, keyfile, iterasi 600000, chunk 65536, rngSeed 1) — **dikonsumsi oleh tes Web (`tests/vectors.test.ts`) dan Desktop (`AegisCryptoTests.cs`)**; hasil enkripsi harus identik byte-per-byte dan dapat didekripsi silang.
- **v2 beku (kanonis):** `tests/fixtures/v2-vector.json` — dikonsumsi Web dan Desktop; perubahan pada pembacaan v2 memecahkannya.
- **Kebutuhan lanjutan:** vektor kasus batas/negatif tambahan sesuai pembekuan parameter (lihat Issue Fase 1).
- RNG deterministik untuk vektor: byte `(counter*31 + 7) & 0xFF` dari seed (lihat helper tes).

## 11. Daftar Keputusan Pembekuan (Checklist)

- [x] **D1 — Batas DEK/record:** **provisional** — maksimum `2^32-2` record per berkas/DEK (lihat §7); menunggu validasi kriptografis independen.
- [x] **D2 — KeyMaterial/encoding:** ditetapkan — UTF-8 byte-exact tanpa normalisasi; keyfile = SHA-256(byte mentah) ditempel setelah password tanpa pemisah.
- [x] **D3 — Parameter header final:** ditetapkan — iterasi 600.000–5.000.000; chunk 65.536–16.777.216 byte.
- [x] **D4 — Kompatibilitas v2:** selesai — fixture v2 beku bersama, dibaca Web + Desktop.
- [ ] **D5 — Katalog error normatif:** petakan kondisi → kelas error secara stabil lintas implementasi.
- [ ] **Tinjauan kriptografis eksternal** atas D1 sebelum status “FROZEN”.

## 12. Riwayat Dokumen

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | 2026-11-13 | D2 (UTF-8 byte-exact, keyfile SHA-256 suffix), D3 (rentang iterasi/chunk final), D4 (fixture v2 beku bersama) ditetapkan. D1 provisional (`2^32-2` record/DEK) menunggu tinjauan kriptografis. |
