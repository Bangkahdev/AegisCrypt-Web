# Desain Teknis Backend Fase 2 dan 3 — AegisCrypt

Versi 1.1 · 14 November 2026
Status: rencana (belum diimplementasikan)
Dokumen acuan: SRS AegisCrypt v1.3 dan `docs/specs/production-readiness-plan-v1.0.md`
Menggantikan: versi 1.0 (lihat Bagian 0 untuk daftar koreksi)

## 0. Perubahan dari Versi 1.0

| # | Koreksi | Alasan |
|---|---|---|
| 1 | Algoritma tanda tangan dipilih **ES256 (ECDSA P-256)**, bukan "Ed25519 atau ES256" | Didukung merata oleh KMS, Web Crypto di browser, dan .NET; klien web dan desktop harus memverifikasi dengan hasil identik |
| 2 | Kunci penerbit **tidak boleh** berada di Wrangler Secrets pada produksi; wajib KMS/HSM sebelum peluncuran berbayar | Akses ke secret berarti dapat memalsukan semua lisensi (NFR-LIC-01) |
| 3 | Ditambahkan **hirarki kunci**: root key offline, kunci penerbit, dan *keyset* bertanda tangan dengan nomor versi | FR-LIC-10; mencegah penerimaan kunci publik palsu dan serangan rollback |
| 4 | `jti` tidak lagi dinyatakan "mencegah replay di klien" | Klien offline tidak punya daftar `jti`; `jti` hanya untuk pencabutan, audit, dan penelusuran di server |
| 5 | Akun **Free tidak menerima entitlement** dan tidak perlu aktivasi perangkat | SRS FR-LIC-04: Crypto Core tidak memerlukan entitlement; Guest dan Free memakai fungsi dasar tanpa lisensi |
| 6 | `/auth/register` mengembalikan respons seragam, bukan `user_id` | Mencegah enumerasi akun |
| 7 | Token verifikasi email dan token sesi disimpan sebagai **hash**; rahasia TOTP **wajib** terenkripsi | Kebocoran basis data tidak boleh langsung memberi akses |
| 8 | Pembatasan laju memakai Durable Objects atau fitur rate limiting Workers, bukan D1/KV | D1 lambat untuk jalur panas; KV tidak konsisten seketika |
| 9 | Ditambahkan tabel `sessions`, `audit_log`, dan endpoint penghapusan serta ekspor akun | FR-ACC-07, NFR-PRV-03 |
| 10 | Ditambahkan algoritma verifikasi klien, aturan format tanda tangan, pemisahan lingkungan, runbook kunci, dan urutan milestone | Desain 1.0 tidak menjelaskan ini |
| 11 | Perbaikan redaksi (beberapa kata rusak pada versi 1.0) | Dokumen akan dibaca auditor |

## 1. Tujuan dan Cakupan

Backend menyediakan layanan online yang **tidak pernah menyentuh plaintext, password enkripsi, keyfile, kunci turunan, atau berkas pengguna**. Backend hanya mengurus:

- Akun dan autentikasi (FR-ACC-01..04, 07, 08)
- Aktivasi perangkat untuk pengguna berlangganan (FR-ACC-05, 06)
- Penerbitan entitlement lisensi offline bertanda tangan (FR-LIC-01..13)
- Langganan, pembayaran, dan perpanjangan (FR-SUB-01..06)
- Publikasi keyset kunci verifikasi penerbit (FR-LIC-10)

Prinsip yang tidak boleh dilanggar (SRS 2.6): lisensi tidak pernah menghalangi dekripsi; kegagalan backend tidak boleh memengaruhi enkripsi, dekripsi, maupun fitur Free.

Keputusan bisnis (OD-02 isi Pro, OD-05 masa berlaku dan batas perangkat, OD-09 harga) **tidak ditentukan di dokumen ini**. Backend hanya menyediakan konfigurasi dan kerangka entitlement.

## 2. Stack

| Lapisan | Pilihan | Catatan |
|---|---|---|
| Bahasa | TypeScript (strict) | Tipe API dipakai bersama web |
| Runtime | Cloudflare Workers | Web sudah di Cloudflare |
| Framework | Hono | Ringan dan type-safe |
| Basis data | Cloudflare D1 | Aktifkan pencadangan dan pemulihan titik waktu (periksa dokumentasi terbaru); ekspor terjadwal terenkripsi ke R2 |
| Pembatasan laju | Durable Objects atau rate limiting Workers | Bukan D1/KV |
| Rahasia non-penanda-tangan | Wrangler Secrets | Mis. kunci enkripsi TOTP, kunci webhook |
| **Kunci penerbit (produksi)** | **KMS/HSM eksternal dengan penandatanganan ECDSA P-256** | Syarat Gate 4. Pilih penyedia yang mendukung P-256 dan audit akses (OD-12). Jangan berasumsi Cloudflare menyediakan penandatanganan berbasis HSM; verifikasi dulu |
| Kunci penerbit (staging) | Kunci terpisah dari produksi | Tidak pernah diterima klien produksi (Bagian 4.5) |
| Hash password | Argon2id (WASM) bila muat dalam batas CPU Workers; jika tidak, PBKDF2-HMAC-SHA256 ≥ 600.000 iterasi | Putuskan lewat benchmark di Workers (OD-13) |
| Pembayaran | Ditentukan di OD-14 | Pastikan penyedia dapat dipakai oleh badan usaha dan rekening yang dimiliki |
| Email | Penyedia email transaksional | Wajib SPF, DKIM, DMARC |
| Observabilitas | Log terstruktur tanpa data sensitif; metrik dan peringatan | Bagian 9 |

Backend berada di `apps/backend/`, dengan CI yang sama (lint, typecheck, audit, secret scan, SBOM).

## 3. Arsitektur dan Batas Kepercayaan

```
Klien (Web/Desktop) ──HTTPS──► Worker API ──service binding──► Worker Penerbit ──► KMS
                                  │                               (hanya menerima
                                  ├─► D1 (akun, perangkat,         permintaan sah
                                  │     langganan, audit)          dari Worker API)
                                  ├─► Durable Objects (rate limit)
                                  └─► Penyedia pembayaran (webhook bertanda tangan)
```

- **Worker Penerbit dipisah** dari Worker API. Hanya fungsi ini yang boleh meminta tanda tangan ke KMS, tanpa rute publik, dengan izin akses minimum dan log setiap penandatanganan.
- Klien tidak dipercaya. Setiap entitlement diverifikasi lokal dengan kunci publik penerbit dari keyset yang tertanam atau bertanda tangan root key.
- Tidak ada endpoint yang menerima berkas atau kunci pengguna.

## 4. Model Kunci dan Entitlement

### 4.1 Hirarki kunci

| Tingkat | Fungsi | Penyimpanan | Masa berlaku |
|---|---|---|---|
| Root key (ES256) | Menandatangani keyset penerbit; kunci publiknya **tertanam di build klien** | Offline, perangkat keras (token atau mesin terisolasi), cadangan terpisah | Panjang (tahun); rotasi hanya lewat pembaruan aplikasi |
| Kunci penerbit (ES256) | Menandatangani entitlement | KMS/HSM (produksi) | Pendek (mis. 6–12 bulan); dua kunci dapat aktif saat transisi |
| Keyset | Daftar kunci publik penerbit berstatus aktif atau dicabut, bertanda tangan root key | Disajikan di `GET /keys/public` dan juga disertakan di build | Memiliki `version` naik monoton dan `expires_at` |

Aturan klien terhadap keyset:
1. Terima hanya bila tanda tangan root valid dengan root key tertanam.
2. Tolak bila `version` lebih rendah dari versi tertinggi yang pernah diterima (anti-rollback); simpan versi tertinggi secara lokal.
3. Tolak bila `expires_at` terlewat, kecuali klien offline dan memakai keyset terakhir yang valid sampai batas toleransi yang ditetapkan di Bagian 4.4.
4. Kunci berstatus dicabut tidak dipakai untuk memverifikasi entitlement baru.

### 4.2 Format entitlement

JWS compact serialization (RFC 7515).

**Header yang diterima:** `{"alg":"ES256","typ":"aegis-entitlement+jwt","kid":"<id>"}`. Klien menolak `alg` selain ES256 (tidak ada `none`, tidak ada HS*), dan menolak header yang memuat bidang tak dikenal yang bersifat kritis (`crit`).

**Klaim:**

| Klaim | Makna |
|---|---|
| `iss` | Identitas penerbit untuk lingkungan terkait |
| `aud` | `aegiscrypt-client` |
| `env` | `prod` atau `staging`; klien menolak yang tidak sesuai build-nya |
| `jti` | ID unik entitlement; dipakai untuk pencabutan, audit, dan penelusuran di server |
| `kid` | Sama dengan header |
| `iat`, `nbf` | Waktu terbit dan mulai berlaku |
| `exp` | Batas offline: akhir periode langganan ditambah grace period (OD-05) |
| `pe` | Akhir periode langganan yang dibayar (informasi; bukan batas offline) |
| `installation_id` | ID instalasi tujuan |
| `plan` | `pro` atau `organization` (Free tidak menerima entitlement) |
| `features` | Daftar hak penggunaan |
| `schema_version` | Versi skema entitlement |

**Aturan format tanda tangan.** Tanda tangan ES256 pada JWS adalah gabungan mentah `R ‖ S` sepanjang 64 byte (format IEEE P1363), **bukan DER**. Banyak KMS mengembalikan DER; Worker Penerbit wajib mengonversinya ke format mentah sebelum dibentuk menjadi JWS. Web Crypto (browser dan Workers) dan .NET (`DSASignatureFormat.IeeeP1363FixedFieldConcatenation`) memverifikasi format mentah. Konversi ini harus punya test vector bersama web dan desktop.

### 4.3 Algoritma verifikasi di klien (berurutan)

1. Pisahkan tiga segmen JWS; tolak jika tidak tepat tiga atau ukuran melebihi batas.
2. Dekode header; tolak jika `alg` ≠ ES256, `typ` salah, atau ada `crit`.
3. Cari `kid` pada keyset yang valid (Bagian 4.1); tolak jika tidak ditemukan atau berstatus dicabut.
4. Verifikasi tanda tangan; tolak jika gagal.
5. Dekode klaim; tolak bila `iss`, `aud`, `env`, atau `schema_version` tidak didukung.
6. Tolak bila `installation_id` tidak sama dengan ID instalasi lokal.
7. Periksa waktu: gunakan waktu perangkat dengan toleransi 5 menit untuk `nbf`; bandingkan dengan waktu terakhir terlihat (FR-LIC-07, best-effort); tolak bila `exp` terlewat.
8. Simpan entitlement yang lolos bersama waktu verifikasi.

Hasil verifikasi hanya mengatur fitur Pro. **Apa pun hasilnya, enkripsi dan dekripsi tidak terpengaruh.**

### 4.4 Masa berlaku dan toleransi offline

- Entitlement berlaku offline sampai `exp`.
- Keyset terakhir yang valid boleh dipakai offline sampai batas toleransi tambahan (usulan: 90 hari sesudah `expires_at`), setelah itu fitur Pro dinonaktifkan sampai klien terhubung dan memperbarui keyset.
- Pencabutan berlaku saat klien terhubung: permintaan perpanjangan ditolak atau `GET /licenses/status` mengembalikan status dicabut.

### 4.5 Pemisahan lingkungan

Setiap lingkungan memiliki root key, kunci penerbit, basis data, dan domain sendiri. Build klien produksi hanya menanam root key produksi dan menolak `env` selain `prod`. Kunci staging tidak boleh pernah diterima build produksi.

### 4.6 Penyimpanan kunci dan transisi

- **Sebelum peluncuran berbayar (dev/staging saja):** kunci penerbit boleh berupa secret pada Worker Penerbit terisolasi dengan akses terbatas dan log. Ini bukan kondisi produksi.
- **Syarat peluncuran berbayar:** kunci penerbit dipindahkan ke KMS/HSM, root key offline, upacara kunci terdokumentasi, dan rotasi pernah dilatih di staging.
- **Upacara kunci (tertulis dan dilatih):** pembuatan root key, pencetakan keyset awal, penyimpanan cadangan terpisah, pencatatan saksi dan waktu, uji penandatanganan dan verifikasi silang web/desktop sebelum build dirilis.
- **Runbook kebocoran kunci penerbit (ringkas):** cabut kunci di keyset baru (versi naik), terbitkan kunci baru, publikasikan keyset, paksa perpanjangan entitlement, umumkan, selidiki. Kebocoran root key memerlukan pembaruan aplikasi dan dianggap insiden tertinggi.

## 5. Skema Data (D1)

Tabel dari versi 1.0 dipertahankan dengan koreksi berikut.

**`users`:** `email_verification_token` diganti `email_verification_token_hash` (hash, bukan token mentah). `totp_secret` menjadi **wajib terenkripsi** dengan kunci dari secret terpisah (bukan opsional). `backup_codes` disimpan sebagai hash. `deleted_at` dipakai bersama pekerjaan penghapusan permanen terjadwal.

**`devices`:** tetap, dengan catatan bahwa perangkat hanya dibuat untuk akun dengan langganan aktif (Bagian 6). `public_key` adalah kunci instalasi untuk pengikatan lunak (FR-LIC-11); pengikatan ini bukan pengaman anti-penyalinan (SRS T-09).

**`entitlements`:** simpan `jti`, `installation_id`, `plan`, `features`, `exp`, `pe`, `iat`, `revoked`, `kid`. Menyimpan JWS penuh bersifat opsional (cukup untuk audit); tanda tangan dapat ditiru ulang bila perlu.

**`signing_keys`:** diganti `issuer_keysets` (`version`, `keyset_jws`, `published_at`, `expires_at`). Tidak ada kunci privat di tabel ini.

**`subscriptions`, `payments`:** tetap; `payments` menambahkan `raw_event_hash` untuk rekonsiliasi.

**Tabel baru:**

| Tabel | Kolom utama | Fungsi |
|---|---|---|
| `sessions` | `id`, `user_id`, `refresh_token_hash`, `family_id`, `expires_at`, `revoked_at`, `created_at` | Sesi pengelolaan akun dengan rotasi refresh token dan deteksi pemakaian ulang |
| `audit_log` | `id`, `actor`, `event`, `ip_hash`, `created_at`, `meta` (tanpa data sensitif) | Jejak aktivitas akun dan administrasi |
| `webhook_events` | `provider_webhook_id` (UNIQUE), `received_at`, `status` | Idempotensi webhook |

## 6. Kontrak API

Semua endpoint HTTPS; JSON; tanpa menerima berkas atau kunci pengguna. CORS dibatasi ke origin resmi. Kesalahan memakai kode dan pesan yang tidak membocorkan informasi internal.

### 6.1 Autentikasi

| Endpoint | Perilaku |
|---|---|
| `POST /auth/register` | Respons seragam `202 Accepted` apa pun status email (mencegah enumerasi); email verifikasi dikirim hanya bila baru |
| `POST /auth/verify-email` | Memakai token sekali pakai berbatas waktu |
| `POST /auth/login` | Batas laju berlapis (per IP, per akun); verifikasi hash; TOTP bila aktif; respons membuat sesi, bukan entitlement |
| `POST /auth/refresh`, `POST /auth/logout` | Rotasi refresh token; pemakaian ulang token lama mencabut seluruh keluarga sesi |
| `POST /auth/password/reset-request`, `/reset` | Tautan sekali pakai; reset **tidak** memengaruhi password enkripsi (FR-ACC-03, 08) |
| `POST /auth/2fa/enable`, `/verify`, `/disable` | TOTP dan kode cadangan terhash; menonaktifkan 2FA memerlukan password dan kode |
| `DELETE /account` | Penghapusan akun dan data server (FR-ACC-07); tidak memengaruhi berkas lokal pengguna |
| `GET /account/export` | Ekspor data pengguna (NFR-PRV-03) |

### 6.2 Aktivasi dan lisensi

| Endpoint | Perilaku |
|---|---|
| `POST /devices/activate` | Memerlukan sesi dan **langganan aktif**; mendaftarkan `installation_id` dan `public_key`; menerbitkan entitlement bila paket mengizinkan. Pengguna Free tidak memerlukan langkah ini |
| `GET /devices`, `DELETE /devices/{id}` | Mengelola perangkat; penonaktifan tidak mencabut entitlement yang sudah ada seketika, berlaku saat berikutnya terhubung (FR-LIC-09) |
| `POST /licenses/renew` | Menerbitkan entitlement baru bila langganan masih berlaku; ditolak bila dicabut atau kedaluwarsa |
| `GET /licenses/status` | Mengembalikan status entitlement milik instalasi untuk deteksi pencabutan |
| `GET /keys/public` | Mengembalikan keyset terbaru bertanda tangan root key; klien tidak mempercayainya tanpa verifikasi tanda tangan |

### 6.3 Langganan dan pembayaran

| Endpoint | Perilaku |
|---|---|
| `GET /subscription` | Paket, masa berlaku, perangkat aktif |
| `POST /subscription/checkout` | Membuat sesi checkout penyedia pembayaran |
| `POST /webhooks/payments` | Verifikasi tanda tangan **sebelum** diproses; idempotensi lewat `webhook_events`; tangani kejadian tidak berurutan dan berulang; hasil: pembaruan langganan dan penerbitan perpanjangan |

## 7. Keamanan Backend

| Aspek | Pelaksanaan |
|---|---|
| Password akun | Sesuai OD-13; salt unik; parameter dicatat agar dapat ditingkatkan |
| Sesi | Token akses pendek, refresh token dirotasi dan disimpan sebagai hash; cookie `HttpOnly`, `Secure`, `SameSite` bila memakai cookie; perlindungan CSRF untuk alur berbasis cookie |
| Pembatasan laju | Per IP dan per akun; penguncian bertahap tanpa mengungkap apakah akun ada |
| Header respons | Mengikuti kebijakan keamanan yang sama dengan web (HSTS, nosniff, dan seterusnya) |
| Rahasia | Tidak di kode, tidak di D1, tidak di log; rotasi terjadwal |
| Log | Terstruktur; tanpa password, token, kunci, isi atau nama berkas |
| Basis data | Pencadangan terenkripsi; **uji pemulihan terjadwal**; kebijakan retensi dan penghapusan |
| Rantai suplai | Dependensi dikunci, audit, SBOM, tinjau pembaruan |
| Webhook | Verifikasi tanda tangan, toleransi waktu, penolakan pengulangan di luar idempotensi |

## 8. Keputusan Terbuka

| ID | Pertanyaan | Status |
|---|---|---|
| OD-02 | Apa yang dijual paket Pro | Terbuka; dari masukan pengguna versi gratis |
| OD-05 | Masa berlaku, grace, batas instalasi | Terbuka; usulan grace 7 hari |
| OD-09 | Harga dan batas paket | Terbuka |
| OD-11 | Apakah ada uji coba Pro yang memerlukan aktivasi | Terbuka |
| OD-12 | Penyedia KMS/HSM | Terbuka; diputuskan sebelum Gate 4 |
| OD-13 | Algoritma hash password (Argon2id WASM atau PBKDF2) | Terbuka; benchmark di Workers |
| OD-14 | Penyedia pembayaran | Terbuka; periksa ketersediaan dan syarat sebelum Fase 3 |

## 9. Pengujian (Dirancang Sejak Awal)

1. **Threat model backend** untuk `/auth`, `/devices`, `/licenses`, `/webhooks`, dan alur kunci; diperbarui bersama `threat-model-v1.md`.
2. **Otorisasi:** pengguna tidak dapat mengakses perangkat, entitlement, atau langganan milik pengguna lain; setiap endpoint menolak sesi tidak valid.
3. **Entitlement:** tanda tangan salah atau diubah; `alg` diganti (`none`, HS256); `kid` tak dikenal atau dicabut; `schema_version`, `aud`, `env`, atau `iss` tidak cocok; `installation_id` lain; `exp` lewat; `nbf` di masa depan; segmen JWS tidak lengkap atau berlebih.
4. **Format tanda tangan:** test vector bersama web dan desktop untuk konversi DER ke R‖S dan verifikasi ES256.
5. **Keyset:** rollback versi, keyset kedaluwarsa, tanda tangan root salah, rotasi kunci penerbit, dan kunci dicabut.
6. **Lintas lingkungan:** entitlement staging ditolak build produksi.
7. **Webhook:** idempotensi, tanda tangan salah, kejadian tidak berurutan, dan kejadian ganda.
8. **Batas laju dan sesi:** penguncian bertahap; pemakaian ulang refresh token mencabut keluarga sesi.
9. **Offline:** kedaluwarsa entitlement saat offline dan saat online; jam perangkat digeser (pada skenario yang dapat dideteksi); fitur Free dan dekripsi tetap berfungsi pada semua kondisi (AC-11).
10. **Pemulihan:** pemulihan basis data dari cadangan dan penerbitan ulang entitlement.
11. **Pemetaan ke kriteria penerimaan SRS:** AC-10 s.d. AC-17 harus dapat ditelusuri ke butir di atas.

## 10. Operasional

- **Pemantauan:** ketersediaan, galat, latensi, kegagalan penandatanganan, kegagalan webhook, dan lonjakan login gagal; peringatan yang realistis untuk tim kecil.
- **Target tingkat layanan (SLO) awal:** ditetapkan tertulis sebelum beta (mis. ketersediaan Worker API dan keberhasilan penerbitan entitlement).
- **Degradasi:** bila Worker Penerbit atau KMS tidak tersedia, aktivasi dan perpanjangan gagal dengan pesan jelas; klien yang sudah aktif tetap bekerja sampai `exp`; fitur Free dan dekripsi tidak terpengaruh.
- **Runbook tertulis:** kebocoran kunci penerbit, kebocoran basis data, gangguan penyedia pembayaran, pemulihan basis data, dan pengelolaan permintaan hapus data.
- **Status dan dukungan:** halaman status publik dan kanal dukungan sebelum peluncuran.

## 11. Urutan Milestone

| Milestone | Isi | Kriteria selesai |
|---|---|---|
| B0 | Putuskan OD-12, OD-13, OD-14 (lewat benchmark dan pemeriksaan penyedia); perbarui threat model dengan komponen backend | Keputusan tertulis; threat model backend ditinjau |
| B1 | Kerangka proyek, lingkungan dev dan staging terpisah, CI yang sama | CI hijau; kunci staging terpisah dari produksi |
| B2 | Format entitlement dan verifikator bersama (web dan desktop), test vector ES256 termasuk konversi DER ke R‖S | Test vector lulus di web dan desktop |
| B3 | Hirarki kunci, keyset bertanda tangan, upacara kunci di staging | Rotasi dan pencabutan dilatih di staging |
| B4 | Akun, verifikasi email, sesi, 2FA, reset password, batas laju | Pengujian otorisasi dan sesi lulus |
| B5 | Aktivasi perangkat (Pro), penerbit entitlement, `/licenses/*`, `/keys/public` | AC-12 s.d. AC-15 lulus |
| B6 | Modul lisensi klien di web dan desktop (verifikasi, penyimpanan, kedaluwarsa, pemulihan aktivasi) | AC-11, AC-13, AC-16, AC-17 lulus |
| B7 | Pembayaran, webhook, perpanjangan, pencabutan | Siklus penuh di staging dengan data uji; rekonsiliasi otomatis |
| B8 | Penghapusan dan ekspor akun, cadangan dan uji pemulihan, observabilitas, runbook | Uji pemulihan berhasil dalam target waktu |
| B9 | Pemindahan kunci penerbit ke KMS/HSM; audit dan uji penetrasi | Syarat Gate 4 terpenuhi |

Urutan B0 sampai B9 tidak diubah: format, kunci, dan verifikasi diselesaikan sebelum akun dan pembayaran, karena itu yang paling sulit diperbaiki setelah ada pengguna.
