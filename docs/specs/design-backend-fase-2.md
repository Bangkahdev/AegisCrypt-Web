# Desain Teknis Backend Fase 2 — AegisCrypt

Status: rencana (belum diimplementasikan)
Target: Fase 2 (Akun, Aktivasi, Lisensi Offline) dan Fase 3 (Pembayaran, Perpanjangan)
Dokumen acuan: `docs/specs/production-readiness-plan-v1.0.md` (SRS v1.3 Baseline)

## 1. Tujuan dan Cakupan

Backend Fase 2 dan 3 menyediakan layanan online yang **tidak pernah menyentuh plaintext, password enkripsi, keyfile, atau berkas pengguna**. Backend hanya mengurus:

- Akun dan aktivasi perangkat (FR-ACC-01 s.d. 08)
- Entitlement lisensi offline bertanda tangan (FR-LIC-01 s.d. 07, 10 s.d. 14)
- Langganan, pembayaran, dan perpanjangan (FR-SUB-01 s.d. 03, 06)
- Publikasi kunci verifikasi penerbit (GET /keys/public)

Keputusan bisnis (OD-02 isi paket Pro, OD-05 masa berlaku/grace/batas perangkat, OD-09 harga) **sengaja tidak ditentukan di sini** dan ditunda sampai ada masukan dari pengguna versi gratis.

## 2. Stack Pilihan (OD-10)

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Bahasa | TypeScript (strict) | Sama bahasa dengan web; satu monorepo, tipe bersama untuk API |
| Runtime | Cloudflare Workers | Web sudah di Cloudflare; deploy via `cf`; tanpa kelola server |
| Framework | Hono | Ringan, type-safe, berjalan di Workers |
| Basis data | Cloudflare D1 (SQLite relasional) | Relasional, ACUK, siap di Workers, biaya rendah untuk awal |
| Kunci penyimpan aset | Cloudflare R2 | Distribusi build terpasang yang ditandatangani (PWA, desktop) |
| Penyimpan rahasia | Wrangler Secrets (sekarang) | Kunci privat penerbit tidak ada di kode; dienkripsi at rest |
| KMS/HSM (lanjutan) | Cloudflare KMS atau AWS KMS | Untuk Fase 4/penjualan organisasi; note di bagian 10 |
| Pembayaran | Stripe atau Midtrans (webhook bertanda tangan) | OD-10 belum final; dipilih sebelum Fase 3 |
| Email | Resend atau penyedia SMTP | Verifikasi dan reset password |
| Rate limiting | D1 + worker state / KV | Login dan reset password |

Alur deploy: `wrangler deploy` dari `apps/backend/` (folder baru di `apps/`).

## 3. Arsitektur

```
┌─────────────┐     HTTPS/JWS     ┌──────────────────┐
│   Klien     │◄──────────────────►│ Cloudflare       │
│  (Web/Desktop)│                  │ Workers (TypeScript)│
└─────────────┘                    │ • /auth/*        │
                                   │ • /devices/*     │
                                   │ • /licenses/*    │
                                   │ • /subscription/*│
                                   │ • /keys/public   │
                                   │ • /webhooks/*    │
                                   └────────┬─────────┘
                                            │
                      ┌─────────────────────┼─────────────────────┐
                      ▼                     ▼                     ▼
                  D1 (SQL)            R2 (builds)        Stripe/Midtrans
              users, devices,            aplikasi         webhook pembayaran
              entitlements, subs,        terpasang         (bertanda tangan)
              payments, keys
```

Batas kepercayaan: klien **tidak dipercaya**. Setiap entitlement divalidasi lokal dengan kunci publik penerbit; backend adalah satu-satunya penerbit yang tepercaya.

## 4. Skema Data (D1)

### 4.1 `users`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT (PK) | UUID v4 acak |
| email | TEXT (UNIQUE) | Lowercase, divalidasi |
| password_hash | TEXT | Argon2id/bcrypt + salt unik |
| email_verified | INTEGER (0/1) | |
| email_verification_token | TEXT | Reset/verifikasi sekali pakai |
| email_verification_expires | INTEGER (unix ms) | |
| totp_secret | TEXT | Enkripsi at-rest (opsional, Fase 2 lanjutan) |
| totp_enabled | INTEGER (0/1) | |
| backup_codes | TEXT (JSON) | Kode cadangan sekali pakai, terhash |
| created_at | INTEGER | |
| updated_at | INTEGER | |
| deleted_at | INTEGER | Soft delete |

### 4.2 `devices`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT (PK) | UUID v4 |
| user_id | TEXT (FK) | |
| installation_id | TEXT (UNIQUE) | Acak, bukan sidik jari perangkat |
| device_name | TEXT | Opsional, dari pengguna |
| public_key | TEXT | Public key instalasi (untuk binding entitlement) |
| active | INTEGER (0/1) | Dapat dinonaktifkan pengguna |
| last_seen_at | INTEGER | Untuk deteksi jam mundur (best-effort) |
| created_at | INTEGER | |

### 4.3 `entitlements`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT (PK) | UUID v4 |
| jti | TEXT (UNIQUE) | JWS ID, mencegah replay |
| installation_id | TEXT | |
| plan | TEXT | `free`, `pro`, `organization` |
| features | TEXT (JSON) | Daftar fitur Aktif |
| expires_at | INTEGER (unix ms) | Batas offline |
| issued_at | INTEGER | |
| signature | TEXT | JWS compact serialization |
| revoked | INTEGER (0/1) | |
| created_at | INTEGER | |

### 4.4 `subscriptions`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT (PK) | |
| user_id | TEXT (FK) | |
| provider_subscription_id | TEXT | ID penyedia pembayaran (Stripe/Midtrans) |
| plan | TEXT | |
| status | TEXT | `active`, `past_due`, `canceled`, `expired` |
| current_period_end | INTEGER | |
| canceled_at | INTEGER | |
| created_at | INTEGER | |
| updated_at | INTEGER | |

### 4.5 `payments`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT (PK) | |
| user_id | TEXT (FK) | |
| provider_payment_id | TEXT | |
| amount | INTEGER | Dalam satuan terkecil mata uang |
| currency | TEXT | `idr`, `usd`, dll |
| status | TEXT | `succeeded`, `failed`, `refunded` |
| provider_webhook_id | TEXT | Idempotensi webhook |
| created_at | INTEGER | |

### 4.6 `signing_keys`
| Kolom | Tipe | Keterangan |
|---|---|---|
| kid | TEXT (PK) | Key ID |
| public_key_jwk | TEXT (JSON) | JWK publik untuk klien |
| active | INTEGER (0/1) | |
| created_at | INTEGER | |
| expires_at | INTEGER | |

Kunci privat penyimpan di Wrangler Secrets (tidak di D1).

## 5. Kontrak API Backend

Semua endpoint HTTPS, tanpa skrip inline, tanpa menerima berkas atau kunci pengguna. Respon JSON.

### 5.1 Autentikasi

**POST /auth/register**
Body: `{ email, password }`
- Buat user, hash password dengan Argon2id, kirim email verifikasi sekali pakai.
- Respon: `201 Created { user_id }` (tidak membuang apakah email sudah terdaftar, mencegah enumerasi).

**POST /auth/login**
Body: `{ email, password, totp_code? }`
- Rate limiting + penguncian bertahap (NFR-SEC-07).
- Verifikasi hash, jika 2FA aktif verifikasi TOTP + kode cadangan.
- Respon: `200 OK { session_token }` (JWT pendek untuk sesi pengelolaan akun, bukan entitlement lisensi).

**POST /auth/2fa/enable**, **POST /auth/2fa/verify**
- Aktifkan/verifikasi TOTP, buat kode cadangan sekali pakai (terhash).

**POST /auth/2fa/disable** (tambahan)
- Nonaktifkan 2FA setelah verifikasi password + kode cadangan.

### 5.2 Aktivasi Perangkat

**POST /devices/activate**
Header: `Authorization: Bearer <session_token>`
Body: `{ installation_id, public_key, device_name? }`
- Verifikasi sesi, buat/rekam device, terbitkan entitlement bertanda tangan (JWS) untuk paket saat ini (default `free`).
- Respon: `200 OK { entitlement_jws, expires_at }`

**GET /devices**
- Daftar device aktif pengguna.

**DELETE /devices/{id}**
- Nonaktifkan device; entitlement lama tidak dicabut segera (berlaku sampai masa berlaku atau koneksi berikutnya, SRS FR-LIC-09).

### 5.3 Lisensi

**POST /licenses/renew**
Header: `Authorization: Bearer <session_token>`
- Hanya setelah pembayaran valid (webhook). Terbitkan entitlement baru dengan masa berlaku diperbarui.
- Respon: `200 OK { entitlement_jws, expires_at }`

**GET /keys/public**
- Kembalikan daftar kunci publik penerbit ber-kid, **ditandatangani root key** (atau hanya kid aktif yang tepercaya dari build terpercaya). Klien **tidak mempercayai respons ini tanpa tanda tangan**.
- Respon: `200 OK { keys: [{ kid, public_key_jwk, active }], signature }`

### 5.4 Langganan dan Pembayaran

**GET /subscription**
- Paket, masa berlaku, device aktif (untuk tampilan akun).

**POST /subscription/checkout**
- Buat sesi checkout penyedia pembayaran; kembali URL checkout.

**POST /webhooks/payments**
- Webhook bertanda tangan dari penyedia pembayaran.
- Idempotensi melalui `provider_webhook_id`.
- Pada `succeeded`: perbarui `subscriptions`, terbitkan entitlement baru melalui `/licenses/renew` internal.
- Tidak ada endpoint yang menerima berkas atau kunci pengguna.

## 6. Desain Kunci Penerbit (JWS)

Entitlement berformat **JWS compact serialization (RFC 7515)** dengan klaim:

```
iss, aud, jti, kid, iat, nbf, exp,
installation_id, plan, features, schema_version
```

- Algoritma: **Ed25519** atau **ECDSA P-256** (asimetris; kunci privat tidak pernah ada di klien).
- Kunci privat penyimpan di Wrangler Secrets (Fase 2) → Cloudflare KMS/AWS KMS (Fase 4).
- Kunci publik tertanam di build klien; rotasi melalui daftar kunci ber-`kid` yang ditandatangani root key.
- Klien menolak algoritma, `kid`, atau `schema_version` yang tidak didukung (FR-LIC-02).
- `jti` dicek untuk mencegah replay entitlement yang sama.
- `exp` adalah batas offline (akhir periode + grace period 7 hari, usulan; OD-05 masih terbuka).

## 7. Autentikasi dan Keamanan Backend

| Aspek | Pelaksanaan |
|---|---|
| Password akun | Argon2id atau bcrypt, salt unik per user (NFR-SEC-04) |
| Komunikasi | TLS 1.2+, HSTS aktif (NFR-SEC-05) |
| Login/reset | Rate limiting dan penguncian bertahap (NFR-SEC-07) |
| Sesi | JWT pendek, HttpOnly (jika cookie), refresh token putar |
| Audit log | Aktivitas akun dan administrasi tanpa isi berkas (FR-ORG-03) |
| Kunci penerbit | Tidak ada di kode, tidak di D1, akses terpadu |
| Webhook pembayaran | Divisualisasi tanda tangan sebelum diproses |

Catatan dari SRS T-09: pemeriksaan lisensi di web dapat dilewati dengan modifikasi kode klien; risiko ini diterima. Fiturn bernilai tinggi dikaitkan ke server atau build native yang ditandatangani.

## 8. Rencana Pengujian (Sejak Awal)

1. **Threat model backend** — identifikasi ancaman pada /auth, /devices, /licenses, /webhooks (panjangan SRS T-06 s.d. T-11).
2. **Uji otorisasi** — setiap endpoint memerlukan sesi yang valid; user tidak dapat mengakses device/entitlement milik user lain.
3. **Uji entitlement palsu** — JWS dengan tanda tangan salah, diubah, `kid`/`schema_version` tidak didukung, atau untuk installation_id lain harus ditolak.
4. **Uji idempotensi webhook** — webhook pembayaran yang sama diproses sekali.
5. **Uji rate limiting** — login gagal berulang menyebabkan penguncian bertahap.
6. **Uji kadaluwarsa offline** — entitlement dengan `exp` lewat ditolak saat klien sedang online; saat offline berlaku sampai batas offline.

## 9. Keputusan Terbuka (Belum Ditentukan)

| ID | Pertanyaan | Status | Catatan |
|---|---|---|---|
| OD-02 | Apa yang dijual paket Pro | Terbuka | Ditentukan dari masukan pengguna versi gratis |
| OD-05 | Masa berlaku, grace, batas perangkat | Terbuka | Usulan grace 7 hari, 2–5 instalasi |
| OD-09 | Harga dan batas paket | Terbuka | Dijadikan konfigurasi |
| OD-10 | Penyedia pembayaran, stack, hosting, KMS | Terbuka | Usulan: Stripe/Midtrans, Workers, D1, Wrangler Secrets/KMS |

## 10. Catatan Implementasi

- Folder backend baru: `apps/backend/` (terpisah dari `apps/web` dan `apps/desktop`).
- Bagian ini **tidak membangun mesin lisensi yang mengerakkan keputusan bisnis** sebelum ada masukan pengguna; hanya menyediakan konfigurasi dan kerangka entitlement.
- Semua perubahan backend melalui CI yang sama (lint, typecheck, audit, secret scan).
