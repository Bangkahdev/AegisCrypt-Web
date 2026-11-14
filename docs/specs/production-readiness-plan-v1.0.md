# Rencana Kematangan Produksi AegisCrypt (SaaS)

**Production Readiness Plan** — dari inti teknis yang kuat menjadi layanan berbayar yang dapat dipercaya  
**Versi 1.0 · 13 November 2026 · Penyusun: Muhammad Dhiyaul Atha**  
Dokumen pendamping SRS AegisCrypt (SaaS) v1.2

## 1. Tujuan dan Prinsip

### 1.1 Arti "matang"
AegisCrypt dianggap matang untuk diluncurkan sebagai layanan berbayar bila: (a) inti kriptografinya teruji dan diaudit pihak independen, (b) layanan akun dan lisensi aman, tersedia, dan dapat dipulihkan saat gangguan, (c) aspek hukum dan pembayaran siap, (d) ada pelanggan nyata yang membayar karena nilai yang jelas, dan (e) ada proses operasional untuk menjaga semuanya setelah rilis.

### 1.2 Prinsip kerja
1. **Berbasis gate.** Setiap tahap punya kriteria lulus yang terukur; tahap berikutnya tidak dimulai sebelum gate lulus, kecuali pekerjaan paralel yang disebut eksplisit.
2. **Keamanan tidak dikompromikan demi kecepatan.** Hal yang tidak bisa diperbaiki setelah ada pengguna (format berkas, model kunci, skema lisensi) diselesaikan lebih dulu.
3. **Lisensi tidak pernah menghalangi dekripsi.** Ini prinsip produk yang tidak diubah (SRS 2.6).
4. **Klaim mengikuti bukti.** Tidak ada klaim "aman" atau "zero-knowledge" yang dipublikasikan sebelum didukung audit dan dokumentasi.
5. **Validasi pasar berjalan paralel dengan pembangunan,** bukan menunggu sesudahnya.
6. **Kapasitas realistis.** Rencana mengasumsikan tim kecil (1–2 orang) paruh waktu; lingkup dipotong sebelum kualitas.

## 2. Posisi Saat Ini

| Area | Status | Catatan |
|---|---|---|
| Inti kriptografi (web) | Selesai | Format v3 envelope, streaming, AAD, test vector beku, fuzzing |
| Klien desktop | Ada | Core, aplikasi, CLI; mereproduksi test vector v3 |
| PWA offline dan CSP | Ada | Terverifikasi di produksi (header + `security.txt`) |
| CI | Lint, typecheck, audit, unit, E2E, secret scan, SBOM, desktop | Belum ada build tertanda |
| Lisensi repositori | Apache-2.0 | Perlu dikonfirmasi sebagai keputusan final (OD-03) |
| Backend akun, aktivasi, lisensi | Belum ada | Inti Gate 2 |
| Pembayaran | Belum ada | Gate 3 |
| Validasi pasar, harga, isi paket Pro | Belum ada | Gate 1 — risiko terbesar |
| Hukum, kepatuhan, audit independen | Belum ada | Gate 4 |
| Operasional (pemantauan, backup, insiden) | Belum ada | Gate 2–4 |

## 3. Peta Gate

| Gate | Fokus | Kriteria lulus utama | Perkiraan durasi* |
|---|---|---|---|
| 0 | Fondasi dirapikan | SRS v1.3, test vector bersama, header produksi terverifikasi, SECURITY.md, threat model v1 | 1–2 minggu |
| 1 | Validasi pasar dan keputusan produk | OD-02, OD-05, OD-09 diputuskan berdasarkan data; penyedia pembayaran dan stack backend dipilih | 4–8 minggu (paralel dengan Gate 0 dan 2) |
| 2 | Backend, identitas, entitlement (Fase 2) | AC-10 s.d. AC-17 lulus; lingkungan staging; kunci penanda tangan di KMS/HSM | 8–12 minggu |
| 3 | Pembayaran dan siklus lisensi (Fase 3) | Pembayaran sampai perpanjangan dan pencabutan berfungsi end-to-end di staging | 4–8 minggu |
| 4 | Kesiapan peluncuran | Audit independen, dokumen hukum, pemantauan, uji pemulihan, beta tertutup | 8–12 minggu |
| 5 | Peluncuran dan pertumbuhan | Peluncuran berbayar; metrik dipantau; fitur lanjutan sesuai permintaan | Berkelanjutan |

\*Perkiraan kasar untuk tim kecil paruh waktu; disesuaikan setelah Gate 0 dan setelah kapasitas nyata diketahui.

## 4. Gate 0 — Fondasi Dirapikan

| # | Pekerjaan | Hasil |
|---|---|---|
| 0.1 | Perbarui SRS ke v1.3 (status Fase 1, OD-03, Lampiran A) | SRS selaras dengan kode |
| 0.2 | Satu berkas test vector bersama dibaca oleh test web dan desktop | Interoperabilitas tidak dapat menyimpang diam-diam |
| 0.3 | Verifikasi header keamanan dan CSP pada domain produksi; satukan domain resmi di README, dokumentasi, slide | Klaim keamanan sesuai produksi |
| 0.4 | SECURITY.md dan security.txt (alamat pelaporan, SLA respons, kebijakan pengungkapan) | Jalur pelaporan kerentanan |
| 0.5 | Threat model tertulis v1 (aset, aktor, batas kepercayaan, mitigasi) | Dasar audit dan desain backend |
| 0.6 | Pemindaian rahasia dan SBOM di CI; proteksi branch; 2FA wajib untuk semua kontributor | Rantai suplai dasar |
| 0.7 | Putuskan nama dan merek; periksa ketersediaan nama dan domain; catatan merek dagang | Hindari perubahan nama setelah peluncuran |
| 0.8 | Konfirmasi lisensi publik Crypto Core (Apache-2.0 atau alternatif) | OD-03 ditutup |
| 0.9 | Perbarui materi presentasi agar mencerminkan format v3 | Dokumentasi tidak menyesatkan |

Gate 0 lulus bila semua butir di atas selesai dan CI hijau, termasuk test vector bersama.

### 4.1 Status Gate 0 (2026-11-14)

| # | Status | Bukti |
|---|---|---|
| 0.1 | Terbuka | SRS v1.3 belum masuk repositori (konten eksternal) |
| 0.2 | Selesai | `apps/web/tests/fixtures/v3-vector.json`, `apps/web/tests/fixtures/v2-vector.json` dibaca Web + Desktop |
| 0.3 | Selesai | CSP, HSTS, nosniff, frame DENY, no-referrer, Permissions-Policy, COOP/CORP terverifikasi di `https://aegiscrypt.bangkah.tech`; `/.well-known/security.txt` disajikan `text/plain` |
| 0.4 | Selesai | `SECURITY.md` + `public/.well-known/security.txt` (atha@bangkah.tech) |
| 0.5 | Selesai (draft) | `docs/specs/threat-model-v1.md`; tinjauan di Issue #34 |
| 0.6 | Sebagian | Secret scan + SBOM di CI selesai; proteksi branch dan 2FA adalah setelan repositori |
| 0.7 | Terbuka | Keputusan nama/merek (konten pengguna) |
| 0.8 | Terbuka | Konfirmasi lisensi publik (OD-03) |
| 0.9 | Terbuka | Materi presentasi |

Spesifikasi format v3 berstatus **FROZEN-CANDIDATE v1.0** (`docs/specs/spec-aegis-v3.md`), dengan D1 provisional menunggu tinjauan kriptografis independen (Issue #31). Fase 1 dilacak di Issue #31–#36.

## 5. Gate 1 — Validasi Pasar dan Keputusan Produk

Risiko utama bukan teknis: enkripsi dasar gratis, offline, dan terbuka, sementara alternatif gratis sudah ada. Pro harus menjual sesuatu yang memang dibayar orang, dan keputusan ini harus datang dari data.

### 5.1 Hipotesis yang diuji

| ID | Hipotesis | Segmen | Cara menguji |
|---|---|---|---|
| H1 | Individu nonteknis butuh enkripsi yang mudah dan mau membayar untuk kemudahan dan aplikasi terpasang bertanda tangan | Individu | Wawancara, uji kegunaan |
| H2 | Perusahaan kecil membutuhkan distribusi lisensi dan kebijakan (password, 2FA) untuk berkas sensitif | UKM/profesional (hukum, kesehatan, konsultan) | Wawancara, penawaran pra-daftar |
| H3 | Pengguna menginginkan Recovery Key dan pengelolaan kunci yang lebih mudah | Individu dan UKM | Uji prototipe |
| H4 | Penyedia jasa yang mengirim dokumen ke klien membutuhkan cara berbagi terenkripsi yang sederhana | Profesional | Wawancara |

### 5.2 Rencana kerja
1. Wawancara 15–20 calon pengguna dari dua segmen (individu dan organisasi kecil); fokus pada kebiasaan sekarang, alat yang dipakai, dan kerepotan nyata, bukan menjual fitur.
2. Halaman pendaratan dan daftar tunggu yang menjelaskan nilai dan model offline-first; ukur pendaftaran.
3. Uji prototipe dengan pengguna nyata (versi gratis yang sudah ada sudah cukup).
4. Bandingkan dengan alternatif (VeraCrypt, Cryptomator, age, fitur enkripsi bawaan sistem) dan rumuskan perbedaan yang nyata.
5. Tentukan harga dengan pengujian kesediaan membayar, bukan angka tebakan.

### 5.3 Kriteria lulus (usulan)
- Setidaknya sebagian besar wawancara pada satu segmen menyebut masalah yang sama dan konkret.
- Ada pelanggan awal yang bersedia pra-daftar berbayar atau menandatangani surat minat.
- OD-02 (isi Pro), OD-05 (masa berlaku, grace period, batas instalasi), dan OD-09 (harga) diputuskan secara tertulis.
- Penyedia pembayaran dan stack backend dipilih setelah memeriksa ketersediaan dan syarat di Indonesia.

Bila tidak ada segmen yang memenuhi kriteria, hasilnya adalah keputusan untuk menyesuaikan posisi produk, bukan membangun fitur lebih banyak.

## 6. Gate 2 — Backend, Identitas, dan Entitlement

### 6.1 Arsitektur

| Komponen | Tanggung jawab | Catatan |
|---|---|---|
| API Akun | Registrasi, login, 2FA TOTP, reset password, verifikasi email | Password akun di-hash dengan Argon2id atau bcrypt |
| Layanan Aktivasi | Mendaftarkan instalasi, mengelola daftar perangkat | ID instalasi acak; tanpa sidik jari perangkat |
| License Issuer | Menerbitkan entitlement JWS dan daftar kunci ber-kid | Kunci penanda tangan di KMS/HSM, tidak pernah di server aplikasi |
| Layanan Langganan | Status paket, perpanjangan, pencabutan | Terhubung ke penyedia pembayaran (Gate 3) |
| Basis data | Akun, perangkat, langganan, jejak audit | Cadangan terenkripsi dan uji pemulihan |
| Audit/Log | Peristiwa keamanan dan administrasi | Tidak mencatat isi atau nama berkas |

Prinsip desain: kegagalan layanan lisensi tidak boleh memengaruhi enkripsi, dekripsi, atau fitur Free (degradasi anggun); server tidak pernah menerima password enkripsi, keyfile, atau berkas.

### 6.2 Pekerjaan
1. Keputusan stack backend, hosting, dan KMS; infrastruktur sebagai kode; lingkungan dev, staging, dan produksi terpisah.
2. Skema data dan migrasi; kebijakan penyimpanan dan penghapusan data (hapus akun menghapus data server).
3. Implementasi akun, 2FA, sesi, dan rate limiting.
4. Upacara kunci tertulis: pembuatan root key, kunci penerbit, rotasi, pencabutan, dan prosedur bila kunci diduga bocor.
5. Entitlement: format JWS, klaim, verifikasi klien, rotasi kunci berakar pada root key tertanam (FR-LIC-01..13).
6. Aktivasi perangkat, daftar perangkat, penonaktifan, aktivasi ulang.
7. Modul lisensi klien (tertutup) dengan masa tenggang offline dan deteksi jam best-effort.
8. Pengujian keamanan sejak awal: threat model backend, pemindaian SAST/DAST, pengujian otorisasi, pengujian entitlement palsu.

### 6.3 Kriteria lulus
AC-10 s.d. AC-17 lulus; seluruh endpoint punya pengujian otorisasi; kunci penanda tangan tidak pernah berada di repositori atau lingkungan aplikasi; prosedur rotasi kunci dilatih di staging; layanan dapat dipulihkan dari cadangan dalam waktu target yang tertulis.

## 7. Gate 3 — Pembayaran dan Siklus Lisensi

| # | Pekerjaan |
|---|---|
| 3.1 | Integrasi penyedia pembayaran pilihan; webhook bertanda tangan dengan idempotensi |
| 3.2 | Siklus langganan: beli, perpanjang, upgrade, downgrade, batal, gagal bayar, pengembalian dana |
| 3.3 | Penerbitan entitlement setelah pembayaran valid; perpanjangan online; pencabutan saat perangkat terhubung |
| 3.4 | Pajak dan faktur sesuai ketentuan yang berlaku (dikonfirmasi ahli) |
| 3.5 | Portal pelanggan: paket, masa berlaku, perangkat aktif, riwayat tagihan |
| 3.6 | Pengujian kasus tepi: pembayaran ganda, webhook terlambat atau berulang, perangkat offline saat kedaluwarsa, jam perangkat salah |

Kriteria lulus: seluruh siklus berjalan end-to-end di staging dengan data uji; pembatalan dan kedaluwarsa tidak pernah menghalangi dekripsi (AC-11); rekonsiliasi pembayaran dan lisensi berjalan otomatis.

## 8. Gate 4 — Kesiapan Peluncuran

### 8.1 Keamanan
- Audit keamanan independen atas Crypto Core (web dan desktop) dan desain protokol lisensi; temuan tingkat tinggi dan kritis ditutup sebelum rilis.
- Uji penetrasi pada backend dan alur akun.
- Rilis tertanda tangan (kode desktop ditandatangani sertifikat penerbit; build web dapat diverifikasi) dan pembaruan otomatis yang diverifikasi tanda tangannya.
- Kebijakan pengungkapan kerentanan berjalan; pertimbangkan program hadiah kerentanan setelah peluncuran.
- Rencana respons insiden tertulis, termasuk skenario kebocoran kunci penanda tangan dan kerentanan kriptografi.

### 8.2 Hukum dan kepatuhan
(Dikonsultasikan dengan ahli hukum dan pajak.)

- Bentuk badan usaha dan kepemilikan kekayaan intelektual.
- Syarat Layanan, Kebijakan Privasi, dan kebijakan penggunaan yang dapat diterima.
- Kepatuhan UU Pelindungan Data Pribadi, termasuk hak pengguna dan retensi data.
- Kewajiban pendaftaran sebagai penyelenggara sistem elektronik dan ketentuan terkait layanan digital.
- Perlakuan pajak atas langganan, termasuk pajak pertambahan nilai.
- Merek dagang dan lisensi sumber (Apache-2.0 atau alternatif) serta konsekuensinya bagi model bisnis.
- Pertimbangan regulasi distribusi perangkat lunak kriptografi lintas negara.

### 8.3 Operasional
- Pemantauan ketersediaan, galat, latensi, dan penerbitan lisensi; peringatan dan prosedur on-call yang realistis untuk tim kecil.
- Target tingkat layanan (SLO) tertulis, mis. ketersediaan layanan lisensi dan waktu respons API.
- Cadangan basis data terenkripsi dan uji pemulihan terjadwal (cadangan yang belum pernah diuji dianggap tidak ada).
- Halaman status publik, kanal dukungan, dan pedoman layanan pelanggan.
- Model biaya infrastruktur dan titik impas.

### 8.4 Kualitas
- Uji beban pada layanan aktivasi dan lisensi.
- Uji kegagalan: layanan lisensi mati, penyedia pembayaran terganggu, kunci diputar.
- Uji kompatibilitas browser dan sistem operasi pada daftar yang dijanjikan.
- Test vector lintas platform menjadi gerbang rilis di CI.

### 8.5 Beta tertutup
10–30 pengguna awal dari Gate 1, termasuk setidaknya beberapa organisasi kecil; kumpulkan kegagalan aktivasi, kebingungan alur, dan masalah pembayaran sebelum peluncuran umum.

Kriteria lulus: daftar periksa peluncuran (Bagian 11) terpenuhi seluruhnya.

## 9. Gate 5 — Peluncuran dan Pertumbuhan

1. Peluncuran bertahap; pantau metrik aktivasi, konversi Free ke Pro, retensi, dan tiket dukungan.
2. Tinjauan pascapeluncuran 30, 60, dan 90 hari; sesuaikan paket dan harga.
3. Fitur lanjutan hanya berdasarkan permintaan nyata: Local Vault, Recovery Key, berbagi lanjutan, fitur organisasi (FR-ORG), aplikasi mobile.
4. Audit ulang berkala dan pembaruan threat model pada setiap perubahan besar.

## 10. Risiko Utama dan Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Tidak ada pelanggan yang mau membayar | Seluruh investasi backend sia-sia | Gate 1 sebelum investasi besar; pra-daftar berbayar sebagai bukti |
| Kerentanan kriptografi | Hilangnya kepercayaan | Audit independen, fuzzing, test vector, inti terbuka |
| Kunci penanda tangan bocor | Pemalsuan lisensi | KMS/HSM, rotasi terlatih, rencana pencabutan |
| Lisensi klien dilewati | Pendapatan bocor | Terima risiko di web; hak bernilai tinggi dikaitkan ke server atau build native |
| Klaim keamanan berlebihan | Reputasi dan risiko hukum | Klaim hanya setelah audit; dokumentasikan batasan |
| Kapasitas tim terbatas | Jadwal molor, kualitas turun | Potong lingkup, bukan kualitas; hindari fitur di luar gate |
| Ketergantungan pada satu penyedia pembayaran atau hosting | Gangguan layanan | Abstraksi pembayaran; cadangan; degradasi anggun |
| Perubahan regulasi | Biaya kepatuhan | Konsultasi ahli, tinjauan berkala |
| Cakupan fitur membengkak | Peluncuran tertunda | Gate dan daftar "tidak dikerjakan sekarang" |
| Penyalahgunaan alat enkripsi | Risiko reputasi dan hukum | Kebijakan penggunaan, kepatuhan terhadap permintaan hukum yang sah (dikonsultasikan ahli) |

## 11. Daftar Periksa Peluncuran

**Produk dan bisnis**
- Pelanggan beta membayar atau sepakat membayar; harga dan paket final.
- Nilai Pro dapat dijelaskan dalam satu kalimat.

**Teknis**
- Semua kriteria penerimaan SRS (AC-01 s.d. AC-18) lulus.
- Test vector lintas platform lulus di CI sebagai gerbang rilis.
- Dekripsi tidak pernah bergantung pada lisensi, akun, atau jaringan (diuji).

**Keamanan**
- Audit independen selesai; temuan tinggi dan kritis ditutup.
- Uji penetrasi backend selesai.
- Rilis tertanda tangan; kunci penanda tangan di KMS/HSM; rotasi dilatih.
- SECURITY.md, rencana respons insiden, dan kontak keamanan aktif.

**Hukum dan keuangan**
- Badan usaha, Syarat Layanan, Kebijakan Privasi, kewajiban pendaftaran, dan perlakuan pajak dikonfirmasi ahli.
- Alur pembayaran, faktur, dan pengembalian dana diuji.

**Operasional**
- Pemantauan, peringatan, dan halaman status aktif.
- Uji pemulihan cadangan berhasil dalam waktu target.
- Kanal dukungan dan dokumentasi pengguna siap.

## 12. Jadwal Kasar (perkiraan)

Asumsi: tim kecil paruh waktu dan kapasitas berkurang selama periode magang industri pada Januari–Juli 2027. Jadwal berikut perkiraan dan ditinjau ulang di akhir Gate 0.

| Periode | Fokus |
|---|---|
| Nov–Des 2026 | Gate 0 selesai; Gate 1 dimulai (wawancara, halaman pendaratan) |
| Jan–Feb 2027 | Gate 1 selesai (keputusan produk); desain teknis backend dan threat model; mulai Gate 2 secara terbatas |
| Mar–Mei 2027 | Gate 2 (akun, aktivasi, entitlement) dengan kapasitas paruh waktu |
| Jun–Jul 2027 | Gate 3 (pembayaran); persiapan audit dan dokumen hukum |
| Agu–Okt 2027 | Gate 4 (audit, pentest, beta tertutup, uji pemulihan) |
| Q4 2027 | Gate 5: peluncuran berbayar bila kriteria Gate 4 terpenuhi |

Bila kapasitas lebih kecil dari asumsi, urutan gate tetap; yang bergeser adalah tanggal peluncuran, bukan kualitas.

## 13. Keputusan yang Harus Diambil

| ID | Keputusan | Gate | Dasar keputusan |
|---|---|---|---|
| OD-02 | Apa yang dijual di Pro | 1 | Wawancara dan pra-daftar |
| OD-03 | Lisensi publik Crypto Core | 0 | Tujuan: adopsi/kepercayaan atau imbalan komersial; konsultasi hukum |
| OD-05 | Masa berlaku, grace period, batas instalasi | 1–2 | Uji dengan pengguna beta |
| OD-07 | KDF final (PBKDF2 atau Argon2id) | 2 | Benchmark nyata dan hasil audit |
| OD-08 | Teknologi mobile | 5 | Permintaan pengguna |
| OD-09 | Harga dan paket | 1 | Uji kesediaan membayar |
| Baru | Penyedia pembayaran | 1 | Ketersediaan, biaya, dan syarat di Indonesia |
| Baru | Stack backend, hosting, KMS | 1–2 | Biaya, keamanan, keahlian tim |
| Baru | Nama dan merek | 0 | Pemeriksaan ketersediaan |
| Baru | Badan usaha | 4 | Konsultasi hukum dan pajak |

## 14. Tiga Puluh Hari Pertama

1. **Minggu 1:** SRS v1.3, test vector bersama, SECURITY.md, pemindaian rahasia dan SBOM di CI, verifikasi header produksi.
2. **Minggu 1–2:** threat model v1, keputusan lisensi publik, pembaruan materi presentasi, keputusan nama dan merek.
3. **Minggu 2–4:** susun daftar 20 calon wawancara (individu dan organisasi kecil), jalankan wawancara pertama, bangun halaman pendaratan dan daftar tunggu.
4. **Minggu 3–4:** survei penyedia pembayaran dan stack backend; susun draf arsitektur Gate 2 untuk ditinjau.
5. **Akhir bulan:** tinjauan Gate 0 dan penyesuaian jadwal berdasarkan kapasitas nyata.

*Dokumen ini ditinjau ulang di akhir setiap gate dan diperbarui bersama SRS.*
