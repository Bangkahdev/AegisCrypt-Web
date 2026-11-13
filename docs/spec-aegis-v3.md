# Spesifikasi Format `.aegis` v3 (Draft Pembekuan)

**Status:** DRAFT — untuk ditinjau sebelum dibekukan (Freeze Candidate)  
**Versi dokumen:** 0.1  
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

- **Password:** saat ini diambil sebagai byte UTF-8 dari string/password yang diberikan (`TextEncoder`/`Encoding.UTF8`). **Keputusan terbuka (perlu dibekukan):** apakah dilakukan normalisasi Unicode (mis. NFC) sebelum pengodean; saat ini implementasi **tidak** menormalisasi secara eksplisit — interoperabilitas bergantung pada byte UTF-8 yang sama.
- **Keyfile:** hash SHA-256 dihitung atas **seluruh konten byte mentah** keyfile (bukan path/nama). Tidak ada pemisah eksplisit antara `PasswordBytes` dan `KeyFilePart` selain panjang hash yang tetap (32 byte) ketika hadir.
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

## 6. Parameter yang Diizinkan (kandidat beku)

| Parameter | Rentang/Aturan saat ini | Status |
|---|---|---|
| `iterations` (PBKDF2) | integer, **600.000 – 5.000.000** (inklusif) | Kandidat beku — perlu konfirmasi final |
| `chunk_size` (plaintext/record non-final) | integer, **65.536 B (64 KiB) – 16.777.216 B (16 MiB)** (inklusif) | Kandidat beku — implikasi memori/DoS perlu dicatat |
| `salt` | 32 byte (CSPRNG) | Beku (sesuai implementasi) |
| `file_id` | 16 byte (CSPRNG) | Beku |
| `nonce_prefix` | 4 byte (CSPRNG) | Beku |
| `wrap_nonce` / nonce record / nonce recovery | 12 byte (CSPRNG untuk nilai acak) | Beku |
| KDF | `0x01` PBKDF2-HMAC-SHA256 | Beku untuk v3; ekstensi via id baru |
| Tag GCM | 128-bit | Beku |

## 7. Batas Pemakaian DEK / Record (KEPUTUSAN TERBUKA — VALIDASI KRIPTOGRAFIS)

**Belum dibekukan.** Implementasi saat ini **tidak** memberlakukan batas jumlah record maksimum eksplisit selain kapasitas tipe/ukuran; indeks nonce adalah u64 dan indeks `2^64-1` dicadangkan untuk metadata nama berkas.

Yang harus ditetapkan dan divalidasi sebelum beku:

1. **Batas jumlah record per DEK (dan ukuran total efektif).** Nonce per record unik per berkas karena `nonce_prefix` acak + indeks counter, sehingga risiko tumbukan nonce acak tidak sama dengan skema nonce acak murni; namun batas aman AES-GCM ditentukan oleh batas data/invokasi dan probabilitas keberhasilan pemalsuan tag (mis. ketentuan NIST SP 800-38D untuk ukuran data per kunci/invokasi dan panjang tag). Batas **tidak boleh** diturunkan hanya dari rentang indeks 64-bit.
2. **Batas ukuran plaintext per invokasi GCM.** Dibatasi secara praktis oleh `chunk_size` (≤ 16 MiB) — perlu dinyatakan eksplisit selaras dengan batas primitif.
3. **Perilaku normatif saat terlampaui:** parser/penulis **harus menolak** pembuatan/enkapsulasi yang melewati batas (error terdefinisi) — jenis error dan ambang final ditentukan setelah validasi.
4. **Rekomendasi awal (bukan keputusan):** evaluasi pembatasan konservatif (mis. membatasi total record/byte per berkas/DEK) agar margin keamanan autentikasi terjaga; angka final ditunda hingga tinjauan kriptografis.

## 8. Kompatibilitas dan Versi Lama

### 8.1 v3 (ditulis)
- Implementasi **hanya menulis** v3.
- v3 ditandai `version == 0x03`, header 128 byte, envelope + AAD + record terautentikasi.

### 8.2 v2 (dibaca/legacy, tidak ditulis)

Untuk interoperabilitas baca mundur, parser dapat mendekripsi v2:

- **Header:** 38 byte = `magic(5) || version(0x02) || salt(32)`.
- **KDF:** PBKDF2-HMAC-SHA256, **100.000** iterasi (tetap, tidak disimpan), keluaran 32 byte.
- **Key material:** konstruksi sama (`UTF8(password) || SHA256(keyfile)` bila ada) — *perlu diperlakukan konsisten dengan keputusan encoding v3*.
- **Record:** berulang sampai EOF: `chunkLen(4, int32 **little-endian**) || iv(12) || ciphertext+tag(chunkLen - 12)`, AES-256-GCM tanpa AAD.
- **Tanpa:** envelope DEK/KEK terpisah, fileId, nonce terikat indeks, AAD, metadata nama berkas terenkripsi, slot recovery, rewrap v3.
- **Status test vector v2:** **belum ada fixture beku lintas-implementasi** (aksi lanjut Gate/Fase 1).

### 8.3 Penolakan
- Magic tidak cocok / versi tidak didukung / KDF tidak didukung / flag tak dikenal / parameter di luar rentang / struktur rusak-terpotong-trailing-tamper → ditolak dengan error terkontrol (katalog pesan distabilkan di implementasi).

## 9. Penanganan Error dan Ketahanan Parser

- Validasi struktural (magic, versi, KDF, flag, rentang, panjang, kelengkapan, final/trailing) dilakukan **sebelum** atau **tanpa** menerima output plaintext yang tidak terautentikasi.
- Setiap kegagalan verifikasi GCM (unwrap, metadata, record) **membatalkan** dekripsi; sink/output parsial harus dibuang (abort) dan keluaran akhir tidak dipublikasikan.
- Parser harus menolak: kontainer terpotong, kelebihan byte setelah record final, record non-final dengan ukuran tidak sesuai `chunk_size`, `ct_len` di luar batas, flag/bit tak dikenal, metadata di luar kebijakan.

## 10. Interoperabilitas dan Test Vector

- **v3 beku (kanonis):** `tests/fixtures/v3-vector.json` (plaintext, password, keyfile, iterasi 600000, chunk 65536, rngSeed 1) — **dikonsumsi oleh tes Web (`tests/vectors.test.ts`) dan Desktop (`AegisCryptoTests.cs`)**; hasil enkripsi harus identik byte-per-byte dan dapat didekripsi silang.
- **Kebutuhan:** menambah fixture beku v2 bersama (aksi terencana) dan vektor kasus batas/negatif sesuai pembekuan parameter.
- RNG deterministik untuk vektor: byte `(counter*31 + 7) & 0xFF` dari seed (lihat helper tes).

## 11. Daftar Keputusan Pembekuan (Checklist)

- [ ] **D1 — Batas DEK/record:** tetapkan jumlah record &/atau total byte per DEK, batas invokasi aman AES-GCM-256/tag-128, dan error normatif; **validasi kriptografis**.
- [ ] **D2 — KeyMaterial/encoding:** tetapkan normalisasi Unicode password (atau nyatakan byte-exact UTF-8 tanpa normalisasi), konfirmasi definisi hash keyfile & non-pemisah; dampak ke vektor/interop.
- [ ] **D3 — Parameter header final:** konfirmasi rentang `iterations` dan `chunk_size` sebagai batas beku (dan kebijakan kompatibilitas ke depan).
- [ ] **D4 — Kompatibilitas v2:** terbitkan test vector v2 beku lintas Web/Desktop.
- [ ] **D5 — Katalog error normatif:** petakan kondisi → kelas error secara stabil lintas implementasi.
- [ ] **Tinjauan kriptografis eksternal** atas D1–D4 sebelum status “FROZEN”.

## 12. Riwayat Dokumen

| Versi | Tanggal | Perubahan |
|---|---|---|
| 0.1 | 2026-11-13 | Draft awal dari implementasi & test vector v3 saat ini; keputusan batas DEK/record dan normalisasi password ditandai terbuka. |
