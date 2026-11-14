# Threat Model AegisCrypt v1

**Versi:** 1.1 (draft untuk ditinjau)  
**Tanggal:** 2026-11-14  
**Cakupan:** Crypto Core v3 (format `.aegis`), implementasi Web dan Desktop (.NET 8) pada Fase 1  
**Dokumen terkait:** `docs/specs/spec-aegis-v3.md`, `SECURITY.md`, `docs/specs/production-readiness-plan-v1.0.md`

Dokumen ini mencatat asumsi, aset, aktor, batas kepercayaan, ancaman utama, dan mitigasi yang **sudah ada di kode** versus yang masih berupa rencana. Dokumen ini bukan jaminan keamanan; klaim keamanan mengikuti bukti (tes, vektor, audit).

---

## 1. Ringkasan Sistem

AegisCrypt mengenkripsi berkas di sisi klien (browser atau aplikasi desktop) menjadi kontainer `.aegis` v3. Kunci enkripsi konten (DEK) dibungkus oleh KEK yang diturunkan dari password pengguna (+ keyfile opsional) melalui PBKDF2-HMAC-SHA256. Setiap record payload diautentikasi dengan AES-256-GCM, nonce deterministik per indeks, dan AAD yang mengikat header/indeks/panjang. Slot recovery opsional membungkus DEK dengan kunci recovery 256-bit melalui HKDF.

Model produk: **offline-first, tanpa akun wajib untuk enkripsi/dekripsi**, dan lisensi tidak boleh menghalangi dekripsi berkas yang valid.

## 2. Aset

| Aset | Deskripsi | Dampak bila bocor/berubah |
|---|---|---|
| Plaintext berkas | Isi berkas pengguna sebelum enkripsi | Kerahasiaan penuh hilang |
| Password / keyfile / recovery key | Rahasia pembuka kunci | Kompromi seluruh berkas terkait |
| DEK | Kunci konten per berkas | Dekripsi seluruh berkas |
| Integritas kontainer | Header, record, metadata, slot recovery | Penerimaan data yang dimanipulasi (jika gagal) |
| Kunci penandatangan lisensi (fase lanjutan) | Menandatangani entitlement | Penyalahgunaan fitur Pro (bukan dekripsi) |
| Kode distribusi (web/desktop) | Integritas perangkat lunak | Backdoor/pencurian kunci |

## 3. Aktor

| Aktor | Kemampuan | Catatan |
|---|---|---|
| Pengguna sah | Memegang kredensial; dapat membuat/membuka berkas | Bisa menjadi sumber kebocoran jika perangkatnya terinfeksi |
| Penyerang pasif jaringan/penyimpanan | Melihat/menyimpan berkas `.aegis` | Tidak punya kredensial |
| Penyerang aktif atas berkas | Memodifikasi, memotong, menyisipkan, menukar record | Tidak punya kredensial |
| Penyedia hosting/penyimpanan | Mengakses kontainer tersimpan | Termasuk Cloudflare/CDN dan penyimpanan awan pengguna |
| Penyerang sisi klien | Malware, ekstensi berbahaya, XSS pada halaman | Di luar jaminan penuh; tetap dimitigasi sebagian |
| Pihak dalam (future backend) | Akses ke layanan akun/lisensi | Tidak boleh mendapat plaintext/kunci |

## 4. Batas Kepercayaan

1. **Perangkat pengguna** (browser/OS/aplikasi) dipercaya untuk integritas kode dan kerahasiaan memori saat runtime.
2. **Jaringan dan penyimpanan** tidak dipercaya: kontainer dianggap dapat dimodifikasi/diamati.
3. **Klien tidak memercayai server** untuk kerahasiaan: enkripsi/dekripsi terjadi lokal; server (fase lanjutan) hanya untuk akun/lisensi.
4. **Input berkas** tidak dipercaya: parser harus defensif terhadap kontainer jahat.
5. **RNG platform** (`crypto.getRandomValues`, `RandomNumberGenerator`) dipercaya sebagai CSPRNG.

## 5. Asumsi Keamanan

- AES-256-GCM, PBKDF2-HMAC-SHA256, HKDF-SHA256, SHA-256 dianggap aman sesuai penggunaan standar.
- Password pengguna memiliki entropi memadai; AegisCrypt tidak dapat memaksa kekuatan password.
- Perangkat tidak dikompromikan penuh (keylogger/malware dengan akses memori berada di luar cakupan).
- Waktu sistem tidak dipercaya untuk keamanan kriptografis (hanya untuk UI/lisensi offline di fase lanjutan).
- Distribusi kode (web/desktop) belum ditandatangani pada Fase 1; integritas distribusi adalah risiko terbuka.

## 6. Ancaman dan Mitigasi

### T1 — Penyerang tanpa kredensial membaca plaintext
**Ancaman:** pencurian kontainer dari perangkat/cloud/CDN.  
**Mitigasi (ada):** AES-256-GCM per record dengan DEK acak; KEK dari PBKDF2 (600k–5M iterasi); tidak ada plaintext yang ditulis server.  
**Residual:** kekuatan bergantung pada entropi password; password lemah dapat di-brute-force offline.

### T2 — Modifikasi ciphertext/header
**Ancaman:** mengubah byte untuk menggeser plaintext atau memalsukan isi.  
**Mitigasi (ada):** tag GCM 128-bit per record; AAD record mengikat magic, versi, chunkSize, fileId, noncePrefix, record header, dan indeks; header 68 byte diautentikasi saat unwrap DEK; metadata nama berkas memiliki AAD domain terpisah. Kegagalan → dekripsi dibatalkan, output parsial dibuang.

### T3 — Pemotongan (truncation) / record final hilang
**Ancaman:** memotong berkas agar sebagian data hilang tanpa terdeteksi.  
**Mitigasi (ada):** wajib ada record FINAL; byte setelah FINAL ditolak (`trailing`); record non-final wajib berukuran tepat `chunk_size + 16`; panjang/struktur tidak konsisten → error. Fuzz test mencakup setiap titik potong batas struktural.

### T4 — Penukaran/penyisipan record (reordering)
**Ancaman:** memindahkan record antarposisi atau dari berkas lain.  
**Mitigasi (ada):** indeks record masuk ke nonce dan AAD; `fileId` mengikat record ke berkas asal; `noncePrefix` per berkas. Record dari berkas lain atau posisi lain gagal autentikasi.  
**Catatan:** penghapusan record di tengah terdeteksi karena indeks/urutan tidak cocok; duplikasi record juga gagal.

### T5 — Pemalsuan metadata nama berkas
**Ancaman:** menyisipkan nama berkas berbahaya (path traversal) atau memalsukan nama.  
**Mitigasi (ada):** metadata dienkripsi+diautentikasi dengan DEK, AAD domain `AEGISFNM`, indeks nonce khusus; nama ditolak jika kosong, mengandung NUL, `/`, atau `\`, atau > 1024 byte; decode UTF-8 ketat.

### T6 — Serangan pada slot recovery
**Ancaman:** memalsukan/menukar slot recovery untuk mengambil alih DEK, atau memakai slot dari berkas lain.  
**Mitigasi (ada):** HKDF-SHA256 dengan info `AEGISRCV || fileId`; AAD slot mengikat magic, versi, domain, dan fileId; slot disalin verbatim saat rewrap (fileId tetap). Kunci recovery 256-bit, tidak disimpan di kontainer.

### T7 — Downgrade/penyalahgunaan versi
**Ancaman:** memaksa parser memakai jalur v2 (tanpa AAD) atau KDF/flag tak dikenal.  
**Mitigasi (ada):** versi wajib 3 untuk v3; KDF id selain `0x01` ditolak; bit flag tak dikenal ditolak; v2 hanya dibaca, tidak pernah ditulis.

### T8 — Kebocoran kunci melalui memori/string
**Ancaman:** password/DEK tertinggal di memori, log, atau crash dump.  
**Mitigasi (ada):** WebCrypto menangani kunci sebagai `CryptoKey` non-extractable untuk operasi; password dapat diberikan sebagai byte agar bisa di-nol-kan di UI; tidak ada logging kredensial; DEK tidak pernah ditulis ke disk.  
**Residual:** runtime JS/.NET tidak menjamin penghapusan memori seketika; string password immutable di JS.

### T9 — DoS melalui parameter/struktur jahat
**Ancaman:** chunk/iterasi sangat besar, panjang record palsu, banyak record, metadata raksasa.  
**Mitigasi (ada):** rentang iterasi dan chunk divalidasi sebelum kerja KDF; `ct_len` dibatasi `chunk_size + 16`; metadata ≤ 1024 byte; batas record `MAX_RECORDS = 2^32-2` (D1 provisional); pembacaan streaming per record, bukan seluruh berkas.

### T10 — Kunci/rahasia bocor melalui repositori atau build
**Ancaman:** kredensial ter-commit, dependensi berbahaya.  
**Mitigasi (ada):** pemindaian rahasia (gitleaks) dan SBOM di CI; `npm audit --audit-level=high`; Dependabot/alerting GitHub (perlu diaktifkan di setelan repo).  
**Residual:** secret scanning bukan jaminan; review manual tetap diperlukan.

### T11 — Kompromi distribusi aplikasi
**Ancaman:** penyerang mengganti aset web/aplikasi desktop.  
**Mitigasi (sebagian):** CSP ketat, SRI untuk beacon Cloudflare, HTTPS/HSTS; belum ada penandatanganan installer/artefak.  
**Residual (terbuka):** penandatanganan kode dan verifikasi rilis belum ada (Gate lanjutan).

### T12 — Serangan sisi kanal (timing/cache)
**Ancaman:** inferensi data melalui timing.  
**Mitigasi:** menggunakan implementasi kripto platform (WebCrypto/OS), bukan implementasi buatan sendiri.  
**Residual:** kanal sisi platform tidak dianalisis; di luar cakupan v1.

### T13 — Kehabisan kuota penyimpanan / DoS klien
**Ancaman:** berkas besar atau banyak operasi menghabiskan kuota OPFS/indexedDB atau memori, membuat aplikasi gagal atau tidak dapat menyimpan hasil.  
**Mitigasi (ada):** parameter dibatasi (chunk ≤ 16 MiB, iterasi ≤ 5 juta, metadata ≤ 1024 B); dekripsi streaming per record; kegagalan kuota dideteksi (`isStorageQuotaMessage`) dan ditampilkan sebagai pesan terlokalisasi; output parsial dibuang saat gagal.  
**Residual:** pengguna dapat memenuhi kuota peramban secara sengaja; batas ditentukan platform.

### T14 — Kebocoran nama berkas setelah dekripsi
**Ancaman:** nama berkas asli tersimpan dalam metadata terenkripsi, tetapi setelah dekripsi nama itu muncul di nama unduhan, riwayat berkas OS, atau clipboard.  
**Mitigasi (ada):** metadata nama bersifat opsional dan terenkripsi; tidak ada nama yang dikirim ke server; `assertFilename` menolak NUL dan pemisah path agar nama tidak dapat dipakai untuk traversal.  
**Residual:** setelah dekripsi, OS/unduhan menyimpan nama plaintext; pengguna yang membutuhkan nama tersembunyi harus mengenkripsi tanpa metadata nama.

### T15 — Ekstensi peramban/DOM berbahaya
**Ancaman:** ekstensi atau skrip pihak ketiga membaca input berkas, password, atau hasil dekripsi melalui DOM.  
**Mitigasi (ada):** CSP ketat tanpa skrip eksternal; kripto berjalan di Web Worker; tidak ada dependensi runtime eksternal; password dapat diberikan sebagai byte agar dapat dinolkan.  
**Residual:** ekstensi dengan izin penuh berada di luar kendali aplikasi (lihat §7).

## 7. Di Luar Cakupan

- Perangkat/OS yang sepenuhnya dikompromikan (malware dengan akses memori/input).
- Kekuatan password pengguna dan serangan brute-force offline terhadap password lemah.
- Keamanan backend akun/lisensi/pembayaran (belum ada; akan dimodelkan terpisah di Gate 2–3).
- Ancaman fisik (cold boot, DMA) dan side-channel tingkat perangkat keras.
- Kepatuhan hukum/regulasi (dibahas di Gate 4).

## 8. Risiko Terbuka (ringkas)

| ID | Risiko | Status |
|---|---|---|
| R1 | Batas pemakaian DEK/AES-GCM (D1) belum divalidasi kriptografer independen | Provisional di spec §7 |
| R2 | Password lemah dapat di-brute-force offline | Diterima; perlu panduan pengguna |
| R3 | Distribusi kode belum ditandatangani | Terbuka (Gate lanjutan) |
| R4 | Katalog error lintas implementasi (D5) | **Selesai** — `apps/web/tests/fixtures/error-catalog.json` + uji paritas |
| R5 | Penghapusan aman (`shred`) tidak menjamin pemadaman fisik di SSD/flash | Didokumentasikan; enkripsi tetap perlindungan utama |
| R6 | Belum ada audit kriptografi independen | Gate 4 |

## 9. Verifikasi

| Kontrol | Bukti |
|---|---|
| Vektor beku v3 & v2 lintas Web/Desktop | `apps/web/tests/fixtures/v3-vector.json`, `apps/web/tests/fixtures/v2-vector.json`, `apps/web/tests/unit/vectors.test.ts`, `AegisCryptoTests.cs` |
| Fuzz parser | `tests/fuzz.test.ts` (mutasi 1 byte, truncation, trailing, magic palsu) |
| Manipulasi/penukaran/truncation | `tests/formatV3.test.ts`, `tests/metadataRewrap.test.ts`, `tests/recoverySlot.test.ts` |
| Pembatalan & output parsial | Unit test web/desktop + CLI temp-file |
| Pemindaian rahasia & SBOM | `.github/workflows/ci.yml` |
| Katalog error stabil | `apps/web/tests/fixtures/error-catalog.json`, `apps/web/tests/unit/errorCatalog.test.ts`, `ErrorCatalogMatchesDesktopMessages` |
| Paritas v2 | `apps/web/tests/unit/legacyV2.test.ts` dan fakta `LegacyV2*` di Desktop |
| Header produksi | CSP/HSTS/nosniff/frame/referrer/Permissions-Policy/COOP di app dan docs (diverifikasi 2026-11-14) |
| Nama berkas aman | `assertFilename`/`AssertFilename` menolak NUL, `/`, `\` |

## 10. Tinjauan

Dokumen ini perlu ditinjau bersama pembekuan spesifikasi v3 (D1) dan sebelum audit eksternal. Perubahan pada format, model kunci, atau arsitektur distribusi wajib memperbarui dokumen ini.
