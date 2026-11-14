# Arsitektur AegisCrypt v1 (Fase 1)

**Versi:** 1.0  
**Tanggal:** 2026-11-14  
**Dokumen terkait:** `docs/specs/spec-aegis-v3.md` (format), `docs/specs/threat-model-v1.md` (ancaman), `docs/specs/production-readiness-plan-v1.0.md` (peta gate)

Dokumen ini menjelaskan bagaimana komponen Web, Desktop, dan dokumentasi bekerja bersama, di mana kunci berada, dan cara memverifikasi perubahan.

---

## 1. Prinsip

1. **Enkripsi di klien.** Plaintext, password, dan kunci tidak pernah dikirim ke server. Fase 1 sepenuhnya offline; server hanya menyajikan aset statis.
2. **Satu format, dua implementasi.** Web (TypeScript/WebCrypto) dan Desktop (.NET 8) wajib menghasilkan byte identik dan membaca berkas satu sama lain.
3. **Format adalah kontrak.** Perubahan byte memerlukan pembaruan `docs/specs/spec-aegis-v3.md`, fixture beku, dan kedua implementasi.
4. **Gagal tertutup.** Setiap kegagalan autentikasi membatalkan operasi dan membuang output parsial.

## 2. Peta Modul

### 2.1 Web (`apps/web/src/`)

| Modul | Tanggung jawab |
|---|---|
| `apps/web/src/constants.ts` | Offset header, batas parameter, `MAX_RECORDS`, konstanta v2 |
| `apps/web/src/services/cryptoService.ts` | Mesin format: parse header, turunkan KEK, unwrap DEK, enkripsi/dekripsi record, metadata nama, rewrap, pembacaan v2 |
| `apps/web/src/lib/recovery.ts` | Kunci recovery 256-bit, codec, slot 60 byte (HKDF) |
| `apps/web/src/services/cryptoWorker.ts` + `cryptoWorkerClient.ts` | Menjalankan kripto di Web Worker agar UI tetap responsif; protokol pesan di `cryptoWorkerProtocol.ts` |
| `apps/web/src/lib/errors.ts` | Peta pesan stabil → kunci i18n |
| `apps/web/src/lib/files.ts` | Baca/tulis berkas, sink streaming, deteksi kuota |
| `apps/web/src/components/*` | UI Neo-Brutalism: daftar berkas, dialog password/recovery/rewrap, log |
| `apps/web/src/i18n/*` | Kamus `en`/`id` |
| `apps/web/public/` | Aset statis: `_headers` (CSP/HSTS), `sw.js`, `manifest.webmanifest`, `.well-known/security.txt` |

Urutan enkripsi Web:

```
Berkas → cryptoWorkerClient → cryptoWorker → cryptoService
  derive KEK (PBKDF2) → wrap DEK → [metadata nama] → record per chunk → Blob .aegis
```

Urutan dekripsi Web:

```
Blob → cryptoService: cek magic/versi → [v2? jalur legacy]
  → parse header → unwrap DEK (atau slot recovery)
  → [metadata nama] → loop record: verifikasi GCM → tulis ke sink
  → final wajib → tolak trailing → hasilkan Blob plaintext
```

### 2.2 Desktop (`apps/desktop/src/`)

| Proyek | Tanggung jawab |
|---|---|
| `AegisCrypt.Core` | Padanan `cryptoService`: `AegisHeader`, `AegisCrypto`, `AegisConstants`, `AegisErrors`, `RecoveryKeyCodec`, `SecureDeleteService` |
| `AegisCrypt.Cli` | Perintah `encrypt`, `decrypt`, `rewrap`, `keygen`, `shred`; mendukung stdin/stdout dan file temp atomik |
| `AegisCrypt.App` | GUI Avalonia (MVVM), mode enkripsi/dekripsi, progres dan pembatalan |

Desktop memakai stream seekable: header dibaca, lalu record diproses per blok tanpa memuat seluruh berkas.

### 2.3 Dokumentasi dan distribusi

| Berkas | Peran |
|---|---|
| `apps/web/` | Aplikasi web (Vite + React), worker `aegiscrypt-web` |
| `apps/desktop/` | Solusi .NET 8: Core, CLI, App Avalonia |
| `docs/specs/`, `docs/guides/`, `docs/assets/` | Spesifikasi, panduan, dan tangkapan layar |
| `docs/site/` | Situs Docusaurus (worker `aegiscrypt-docs`) |
| `apps/web/cloudflare.config.ts` | Konfigurasi worker `aegiscrypt-web`, domain `aegiscrypt.bangkah.tech` |
| `.github/workflows/ci.yml` | Lint/typecheck, unit, E2E 3 browser, audit dependensi, secret scan, SBOM, build desktop, build produksi |
| `apps/web/tests/fixtures/*.json` | Vektor beku v3/v2 dan katalog error — sumber kebenaran lintas implementasi |

## 3. Alur Data Kriptografis

```mermaid
flowchart TD
    P[Password] --> KM[KeyMaterial = UTF8(password) || SHA256(keyfile)]
    K[Keyfile] --> KM
    KM -->|PBKDF2-HMAC-SHA256, salt, 600k-5M| KEK[KEK 32B]
    DEK[DEK acak 32B] -->|AES-256-GCM wrap| W[wrappedDEK + tag]
    KEK --> W
    W --> H[Header 128B]
    DEK --> REC[Record: AES-256-GCM<br/>nonce = prefix || index<br/>AAD = header+index]
    DEK --> FN[Metadata nama<br/>AAD AEGISFNM]
    RK[Recovery key 32B] -->|HKDF info AEGISRCV+fileId| RKEK
    DEK -->|AES-256-GCM| RS[Slot recovery 60B]
    RKEK --> RS
```

Batas kepercayaan, ancaman, dan risiko residual ada di `docs/specs/threat-model-v1.md`. Yang perlu diingat saat mengubah kode:

- Header (68 byte pertama) adalah AAD untuk unwrap DEK; mengubah satu bit membuat unwrap gagal (`credentials`).
- Indeks record masuk ke nonce **dan** AAD; penukaran/penghapusan record terdeteksi.
- Metadata nama berada di offset `128` (atau `188` dengan recovery), indeks nonce `2^64-1`.
- Rewrap hanya menulis ulang header (128 byte); ekor kontainer disalin apa adanya.

## 4. Ketersediaan Offline

- Service worker (`sw.js`) mem-precache aset yang tercantum di `precache-manifest.json` (dibuat saat build).
- `_headers` menetapkan CSP ketat tanpa inline script; `theme-init.js` dimuat sebagai berkas terpisah.
- Tidak ada permintaan jaringan setelah muat awal; aplikasi tetap berfungsi saat offline.

## 5. Model Memori dan Output Sementara

Klaim "streaming" hanya berlaku untuk pembacaan dan pemrosesan record, **bukan** jaminan memori konstan di semua jalur:

- **Enkripsi Web (`processFileEncrypt`)** membaca berkas per chunk, tetapi menampung seluruh record ciphertext di dalam `BlobPart[]` lalu membuat satu `Blob`. Browser dapat memindahkan bagian besar ke disk, namun itu bukan jaminan; peak memory dapat tumbuh sebanding ukuran keluaran.
- **Dekripsi Web** menulis plaintext ke *sink*. Bila OPFS tersedia (`navigator.storage.getDirectory`), sink berupa berkas sementara `.aegis-tmp-<uuid>` sehingga memori terbatas. Bila OPFS tidak tersedia, `createBlobSink()` menampung semua plaintext di memori; pada kondisi ini penggunaan memori tumbuh sebanding ukuran keluaran.
- **Rumusan yang akurat:** *Decryption processes records incrementally. Memory usage is bounded when OPFS is available; otherwise the application may use an in-memory fallback.*
- **Pembersihan output sementara (Web):** `sink.abort()` dipanggil pada setiap kegagalan (header, KDF, kredensial, tamper) dan pada pembatalan; setelah sukses, berkas OPFS dijadwalkan dihapus pada `pagehide` atau setelah 60 detik. Uji `apps/web/tests/unit/cryptoService.test.ts` memverifikasi `abort()` dipanggil saat kata sandi salah dan saat payload tamper.
- **Desktop (`AegisCrypto.Decrypt`)** menulis plaintext secara bertahap ke `Stream` keluaran pemanggil; tidak ada penampungan seluruh hasil di memori.
- **CLI Desktop** menulis ke berkas sementara `.aegiscrypt-<guid>.tmp` di direktori tujuan, lalu `File.Move(..., overwrite: true)` hanya setelah dekripsi/rewrap berhasil; berkas sementara dihapus pada kegagalan. Pemanggil API Desktop **wajib** mengikuti pola yang sama: tulis ke berkas/stream sementara dan publikasikan hasil hanya setelah operasi sukses.
- **Penghapusan bukan secure erasure.** Menghapus berkas sementara tidak menjamin pemadaman fisik salinan plaintext pada SSD, flash, filesystem copy-on-write, jurnal, atau snapshot. `SecureDeleteService` hanya menimpa isi berkas dan CLI mencetak peringatan bahwa overwrite tidak menjamin pemadaman pada media tersebut.

## 6. Cara Menjalankan dan Memverifikasi

```powershell
# Web (dari apps/web)
cd apps/web
npm run lint
npm run typecheck
npm run test:unit        # vitest
npm run test:e2e         # playwright (3 browser)
npm run build

# Desktop (SDK 8 lokal di .dotnet/)
& .\.dotnet\dotnet.exe test apps/desktop/AegisCrypt.sln --configuration Release -v q --nologo

# Deploy web (manual, dari apps/web setelah merge ke main)
cf deploy

# Deploy dokumentasi (manual, dari docs/site)
cd docs/site; npm run build; npx wrangler deploy
```

Menambah atau mengubah vektor beku:

1. Ubah konstanta/fixture hanya jika spec diperbarui lebih dulu.
2. Hasilkan kontainer dengan RNG deterministik (`makeRng`) dan simpan hex di `apps/web/tests/fixtures/`.
3. Pastikan `apps/web/tests/unit/vectors.test.ts` dan `AegisCryptoTests` sama-sama membacanya.
4. Perbarui `docs/specs/spec-aegis-v3.md` §10 dan riwayat dokumen.

## 7. Keputusan Terbuka

| Item | Status | Rujukan |
|---|---|---|
| Batas pemakaian DEK (D1) | Provisional `2^32-2` record | Spec §7, Issue #31 |
| Tinjauan threat model | Menunggu reviewer | Issue #34 |
| Penandatanganan distribusi | Belum ada | Threat model R3 |
| Backend akun/lisensi | Fase 2 | Plan Gate 2 |
