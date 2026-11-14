Software Requirements Specification (SRS) — AegisCrypt
Offline-First File Encryption Platform dengan Aktivasi Online (SaaS)
Versi 1.3 (Baseline) · 14 November 2026 · Penyusun: Muhammad Dhiyaul Atha
1. Pendahuluan
1.1 Tujuan Dokumen
Dokumen ini menspesifikasikan kebutuhan AegisCrypt, platform enkripsi berkas yang memproses data secara lokal di perangkat pengguna. Layanan online hanya menangani akun, aktivasi perangkat, penerbitan lisensi, pembayaran, dan distribusi aplikasi. Berbagi berkas dilakukan langsung oleh pengguna melalui media pilihannya dan tidak melewati backend. Dokumen menjadi acuan implementasi, pengujian, dan evaluasi.
1.2 Ruang Lingkup
AegisCrypt terdiri dari: (a) Client yang mengenkripsi dan mendekripsi berkas di perangkat pengguna, mengelola password dan keyfile, serta memverifikasi lisensi secara lokal; (b) Layanan Online untuk akun, aktivasi perangkat, penerbitan lisensi, pembayaran, dan distribusi aplikasi; (c) modul opsional (Local Vault, Berbagi Terenkripsi, Recovery Key) dan (d) Fitur Organisasi pada tahap lanjut. Server tidak pernah menerima plaintext, password enkripsi, keyfile, maupun kunci turunan.
Di luar lingkup: penyimpanan, sinkronisasi, atau backup berkas di server; enkripsi atau dekripsi di server; pemeriksaan lisensi wajib ke server setiap aplikasi dibuka.
Prinsip produk: Activate Online. Encrypt Offline. Login dan aktivasi perangkat dilakukan online satu kali, perpanjangan langganan dilakukan online, dan penggunaan sehari-hari berjalan tanpa internet.
1.3 Definisi dan Singkatan
Istilah
Arti
Crypto Core
Modul utama untuk derivasi kunci, enkripsi, dekripsi, dan validasi berkas
AES-256-GCM
Enkripsi simetris terautentikasi (AEAD) dengan kunci 256-bit
PBKDF2
Fungsi derivasi kunci berbasis password (HMAC-SHA-256)
KEK
Key Encryption Key: kunci hasil derivasi password dan keyfile yang membungkus DEK
DEK
Data Encryption Key: kunci acak 256-bit per berkas yang mengenkripsi seluruh chunk
Envelope Encryption
Isi berkas dienkripsi dengan DEK; DEK dibungkus oleh KEK (dan opsional Recovery Key)
AAD
Additional Authenticated Data, data yang diautentikasi bersama ciphertext
Record
Satu potongan berkas terenkripsi (header record + ciphertext + tag GCM)
Keyfile
Berkas opsional yang menjadi input kriptografis tambahan dalam derivasi kunci (bukan 2FA akun)
Local Vault
Penyimpanan lokal berkas terenkripsi di perangkat
Recovery Key
Kunci pemulihan terpisah yang dipegang pengguna dan membuka slot pembungkus DEK
Entitlement
Pernyataan bertanda tangan digital yang menyatakan hak penggunaan fitur AegisCrypt
Device Activation
Proses mendaftarkan sebuah instalasi melalui layanan online
Installation ID
Identitas acak unik sebuah instalasi aplikasi
Offline License
Entitlement yang diverifikasi secara lokal tanpa komunikasi dengan server
License Issuer
Layanan yang menerbitkan dan menandatangani entitlement
Signing Key / Verification Key
Kunci privat penanda tangan di server / kunci publik verifikasi di klien
Key ID (kid)
Identitas kunci yang dipakai memilih verification key
Grace Period
Masa tambahan setelah periode langganan berakhir saat hak Pro masih berlaku
1.4 Referensi
• NIST SP 800-38D (GCM), FIPS 197 (AES), RFC 8018 (PKCS #5 / PBKDF2), RFC 7515 (JSON Web Signature)
• W3C Web Cryptography API
• OWASP Password Storage Cheat Sheet dan ASVS
• Repositori: https://github.com/Bangkahdev/AegisCrypt-Web · Aplikasi: https://aegis-crypt-web.vercel.app/
1.5 Konvensi Penomoran
Kebutuhan memakai ID FR-<modul>-<nomor> (fungsional) dan NFR-<kategori>-<nomor>. Prioritas: M (Must), S (Should), C (Could). Fase merujuk pada roadmap di Bagian 10.
2. Deskripsi Umum
2.1 Perspektif Produk
AegisCrypt saat ini berupa aplikasi web satu halaman (React, TypeScript, Web Crypto API) tanpa backend. Versi SaaS menambahkan layanan online yang hanya mengurus identitas dan hak penggunaan. Hak tersebut berbentuk entitlement, yaitu pernyataan bertanda tangan digital dari server yang diverifikasi klien secara lokal dengan public key yang tertanam di aplikasi. Fitur inti enkripsi dan dekripsi tetap berfungsi tanpa koneksi ke server dan tanpa lisensi aktif.
2.2 Kelas Pengguna
Kelas
Hak penggunaan
Kebutuhan utama
Guest
Crypto Core tanpa akun maupun lisensi
Enkripsi dan dekripsi cepat tanpa registrasi
Terdaftar (Free)
Hak Crypto Core yang sama, ditambah identitas akun dan pengelolaan akun online
Mengelola akun dan perangkat; membeli layanan tambahan
Pro
Crypto Core ditambah fitur komersial (OD-02) yang berjalan offline selama lisensi berlaku
Fitur lanjutan tanpa menghalangi akses ke berkas
Penerima
Pihak yang menerima berkas .aegis
Membuka berkas tanpa akun maupun lisensi
Admin Organisasi (fase lanjut)
Pengelolaan lisensi dan kebijakan organisasi
Distribusi lisensi, kebijakan, audit
Administrator Sistem
Operator layanan
Penerbitan lisensi, penagihan, pemantauan, dukungan
2.3 Lingkungan Operasi
• Web modern dengan Web Crypto API dan HTTPS (Chrome, Edge, Firefox, Safari, dua versi mayor terakhir).
• PWA pada tahap berikutnya; Android, iOS, dan desktop pada Fase 5.
• Backend berupa layanan HTTPS dengan basis data relasional.
2.4 Batasan Desain
1.  Enkripsi dan dekripsi berjalan di sisi klien; backend tidak boleh berada pada jalur proses tersebut.
2.  Format berkas .aegis harus identik dan kompatibel di semua platform, dan berevolusi lewat nomor versi tanpa merusak berkas lama.
3.  Aplikasi tidak boleh mewajibkan koneksi internet atau pemeriksaan lisensi online setiap kali dibuka, termasuk sebagai proses latar belakang wajib.
4.  Kedaluwarsa atau pencabutan lisensi tidak boleh menghalangi pengguna mendekripsi berkasnya sendiri.
5.  Algoritma terbatas pada yang tersedia di Web Crypto API (atau pustaka teraudit di platform lain).
6.  Repositori publik berlisensi memuat Crypto Core; modul lisensi, fitur Pro, dan backend tidak dipublikasikan (lihat 3.4).
2.5 Asumsi dan Ketergantungan
• Pengguna menjaga kerahasiaan password dan keyfile; kehilangan keduanya berarti data tidak dapat dipulihkan, kecuali modul Recovery Key dibangun dan dipakai.
• Keamanan versi web bergantung pada integritas kode yang dikirim server (lihat NFR-SEC-06).
• Pemeriksaan lisensi di klien tidak dapat sepenuhnya mencegah pembajakan, terutama di web karena kode dikirim ke browser; ia mencegah pelanggaran yang tidak disengaja. Perlindungan lebih kuat hanya berasal dari hak yang diterbitkan server dan build native.
• Perangkat memperoleh koneksi internet saat aktivasi dan perpanjangan lisensi.
• Penyedia pembayaran pihak ketiga dipakai; AegisCrypt tidak menyimpan data kartu.
2.6 Prinsip Produk yang Tidak Boleh Diubah
1.  Lisensi mengatur fitur aplikasi, bukan hak pengguna atas datanya: tidak ada kondisi lisensi, akun, atau langganan yang boleh menghalangi dekripsi berkas milik pengguna.
2.  Crypto Core tidak bergantung pada akun, lisensi, maupun koneksi internet.
3.  Password enkripsi, keyfile, dan kunci tidak pernah dikirim ke server.
4.  Server tidak menyimpan, memproses, atau mendistribusikan berkas pengguna.
2.7 Internet dan Autentikasi per Aktivitas
Aktivitas
Internet
Autentikasi akun
Membuka aplikasi setelah aktivasi
Tidak
Tidak
Enkripsi dan dekripsi
Tidak
Tidak
Memverifikasi entitlement
Tidak
Tidak
Aktivasi perangkat (pertama atau perangkat baru)
Ya
Ya
Membeli atau memperpanjang Pro
Ya
Ya
Mengelola akun atau menonaktifkan perangkat
Ya
Ya, sesuai kebijakan sesi
3. Arsitektur dan Model Ancaman
3.1 Komponen
Komponen
Lokasi
Tanggung jawab
Kode
Crypto Engine
Klien
Derivasi kunci, enkripsi/dekripsi streaming, validasi format
Terbuka
Key Manager
Klien
Penanganan password, keyfile, kunci sesi
Terbuka
License Manager
Klien
Verifikasi entitlement bertanda tangan, penyimpanan lisensi, masa tenggang offline
Tertutup
Local Vault / Sharing (opsional)
Klien
Penyimpanan lokal dan ekspor berkas terenkripsi
Ditentukan kemudian
Activation Service
Server
Login, pendaftaran perangkat, penerbitan entitlement
Tertutup
Subscription Service
Server
Paket, pembayaran, perpanjangan, daftar pencabutan
Tertutup
Distribusi Aplikasi
Server/CDN
Build web (PWA) dan build terpasang yang ditandatangani
Tertutup
3.2 Aset yang Dilindungi
Plaintext berkas; password enkripsi, keyfile, dan kunci turunan; Recovery Key; kredensial akun dan sesi; metadata berkas (nama, ukuran).
3.3 Model Ancaman
ID
Ancaman
Mitigasi
T-01
Penyerang membaca berkas .aegis yang dicuri
AES-256-GCM, KDF kuat, salt unik
T-02
Brute-force password offline
PBKDF2 ≥ 600.000 iterasi, keyfile opsional, indikator kekuatan password
T-03
Manipulasi, penukaran urutan, atau pemotongan chunk
AAD memuat indeks chunk, penanda chunk terakhir, dan header
T-04
Server atau staf layanan mengakses data pengguna
Server tidak pernah menerima plaintext atau kunci; lisensi bukan kunci enkripsi
T-05
Kode web dimodifikasi (supply chain, XSS)
CSP ketat, SRI, audit dependensi, build yang dapat diverifikasi
T-06
Pencurian akun
2FA, rate limiting, deteksi login anomali
T-07
Kebocoran lewat memori, log, atau penyimpanan browser
Penghapusan kunci dari memori, larangan logging data sensitif, kunci non-ekstraktabel
T-08
Pemalsuan lisensi
Entitlement bertanda tangan asimetris; klaim memuat ID instalasi dan masa berlaku
T-09
Pemeriksaan lisensi dilewati dengan memodifikasi kode klien
Risiko sisa yang diterima pada web; hak bernilai tinggi diterbitkan server; build native ditandatangani. Obfuscation bukan kontrol keamanan
T-10
Jam perangkat diputar mundur untuk memperpanjang lisensi
Waktu terakhir terlihat disimpan, masa tenggang terbatas; batasan ini diterima
T-11
Pencabutan tidak berlaku pada perangkat offline
Pencabutan efektif saat perangkat terhubung atau masa berlaku habis
Di luar model ancaman: perangkat pengguna yang sudah dikompromikan malware dan keylogger.
3.4 Pembagian Modul Terbuka dan Tertutup
Repositori GitHub tetap publik dengan lisensi, tetapi tidak seluruh kode dipublikasikan. Crypto Core tetap terbuka karena klaim keamanan produk enkripsi harus dapat diperiksa pihak luar dan audit lebih mudah dilakukan. Yang tertutup adalah lapisan lisensi, fitur Pro, dan layanan backend.
Bagian
Status
Alasan
Crypto Core, format .aegis, test vector
Publik
Dapat diaudit; menjadi dasar kepercayaan
UI dasar
Publik
Transparansi alur pengguna
License Manager, fitur Pro
Tertutup
Melindungi model bisnis
Backend (aktivasi, langganan)
Tertutup
Kode server tidak perlu dipublikasikan
Pada versi web, JavaScript yang dikirim ke browser tetap dapat dibaca meski tidak ada di GitHub; menutup repositori tidak menjadikan pemeriksaan lisensi tahan pembajakan (lihat T-09). Lisensi publik untuk Crypto Core ditentukan pada OD-03.
4. Persyaratan Fungsional
4.1 Crypto Core (CRY)
ID
Kebutuhan
Prioritas
Fase
FR-CRY-01
Sistem mengenkripsi satu atau banyak berkas menjadi berkas .aegis di perangkat pengguna.
M
1
FR-CRY-02
Sistem mendekripsi berkas .aegis dan memulihkan berkas asli persis sama (byte-identical).
M
1
FR-CRY-03
KEK diturunkan dari KeyMaterial = Password ‖ SHA-256(Keyfile) (keyfile opsional) melalui KDF yang tertera di header.
M
1
FR-CRY-04
Enkripsi dan dekripsi berjalan streaming per chunk; penggunaan memori tidak bergantung pada ukuran berkas.
M
1
FR-CRY-05
Format v3 memakai envelope encryption: DEK acak 256-bit per berkas mengenkripsi seluruh chunk, dan DEK dibungkus oleh KEK (Bagian 5).
M
1
FR-CRY-06
Setiap record diautentikasi dengan nonce unik dan AAD yang memuat parameter berkas, flag record, panjang, dan indeks (Bagian 5).
M
1
FR-CRY-07
Sistem menolak berkas yang dimanipulasi, dipotong (termasuk sisa 1–3 byte di akhir), diurutkan ulang, atau memiliki data setelah record final, dengan pesan kesalahan jelas dan tanpa keluaran parsial yang tampak valid.
M
1
FR-CRY-08
Dekripsi menulis ke keluaran sementara dan memfinalisasinya hanya setelah record final terverifikasi; bila gagal, keluaran sementara dibuang.
M
1
FR-CRY-09
Parameter header (magic, versi, KDF ID, rentang iterasi, ukuran chunk, bit reserved) divalidasi sebelum KDF dijalankan.
M
1
FR-CRY-10
Pembaca v2 dipertahankan dengan aturan v2 (100.000 iterasi tetap, tanpa AAD) dan diuji dengan test vector dari berkas nyata; penulisan v2 dihentikan dan migrasi ke v3 disarankan.
M
1
FR-CRY-11
Mengganti password atau keyfile hanya menulis ulang header (membungkus ulang DEK), tanpa mengenkripsi ulang isi berkas.
S
1
FR-CRY-12
Sistem menampilkan progres, kecepatan, ETA, dan log operasi; pengguna dapat membatalkan proses.
S
1
FR-CRY-13
Sistem menyediakan pembuat keyfile acak.
C
1
FR-CRY-14
Nama berkas asli disimpan terenkripsi sebagai metadata (flag dicadangkan pada format v3).
C
4
4.2 Local Vault (VLT)
ID
Kebutuhan
Prioritas
Fase
FR-VLT-01
Pengguna dapat menambah, melihat, menghapus, dan mengekspor berkas terenkripsi di Vault (modul opsional).
S
4
FR-VLT-02
Vault menyimpan data hanya di perangkat (IndexedDB/OPFS di web, penyimpanan aplikasi di platform lain).
S
4
FR-VLT-03
Daftar berkas mendukung pencarian, pengelompokan (folder/tag), dan pengurutan.
C
4
FR-VLT-04
Metadata Vault (nama, tag) dienkripsi dengan kunci Vault.
C
4
FR-VLT-05
Pengguna dapat mengunci Vault; membukanya memerlukan password atau autentikasi perangkat.
S
4
FR-VLT-06
Peringatan ditampilkan bila penyimpanan browser dapat dihapus oleh sistem.
S
4
4.3 Akun dan Aktivasi Perangkat (ACC)
Kebutuhan FR-ACC berlaku untuk layanan berbasis akun; registrasi bukan prasyarat untuk melindungi atau membuka berkas.
ID
Kebutuhan
Prioritas
Fase
FR-ACC-01
Registrasi dengan email dan password akun, disertai verifikasi email (online).
M
2
FR-ACC-02
Login online satu kali untuk mengaktifkan perangkat; tidak ada login ulang setiap aplikasi dibuka.
M
2
FR-ACC-03
Reset password akun melalui tautan sekali pakai berbatas waktu; tidak memengaruhi password enkripsi.
M
2
FR-ACC-04
2FA berbasis TOTP pada login online dan pengelolaan akun, dengan kode cadangan sekali pakai.
M
2
FR-ACC-05
Aktivasi perangkat: instalasi didaftarkan dengan ID instalasi acak (bukan sidik jari perangkat); jumlah perangkat aktif dibatasi sesuai paket.
M
2
FR-ACC-06
Pengguna melihat dan menonaktifkan perangkat aktif dari akun; perangkat baru memerlukan aktivasi online tersendiri.
M
2
FR-ACC-07
Penghapusan akun beserta seluruh data di server.
M
2
FR-ACC-08
Password akun dan password enkripsi terpisah; password enkripsi tidak pernah dikirim ke server.
M
2
FR-ACC-09
Passkey/WebAuthn sebagai metode login alternatif.
C
5
4.3a Lisensi Offline (LIC)
Lisensi berbentuk entitlement bertanda tangan digital yang diverifikasi di klien tanpa menghubungi server.
ID
Kebutuhan
Prioritas
Fase
FR-LIC-01
Entitlement berformat JWS (RFC 7515) dengan klaim iss, aud, jti, kid, iat, nbf, exp, installation_id, plan, features, dan schema_version.
M
2
FR-LIC-02
Klien memverifikasi tanda tangan dengan verification key (sesuai kid) tanpa menghubungi server, dan menolak algoritma, kid, atau schema_version yang tidak didukung.
M
2
FR-LIC-03
Pemeriksaan lisensi tidak memerlukan koneksi internet setiap aplikasi dibuka, termasuk sebagai proses latar belakang wajib.
M
2
FR-LIC-04
Crypto Core tidak memerlukan entitlement; Guest dan Free memakai fungsi dasar tanpa entitlement. Entitlement hanya diperlukan untuk fitur Pro.
M
2
FR-LIC-05
Lisensi Pro memuat akhir periode langganan dan batas offline (usulan: akhir periode + grace period 7 hari); sesudahnya klien kembali ke hak Free.
M
2
FR-LIC-06
Setelah lisensi kedaluwarsa atau dicabut, perangkat dinonaktifkan, atau akun dihapus, enkripsi dan dekripsi semua berkas tetap berfungsi.
M
2
FR-LIC-07
Klien mendeteksi perubahan jam secara best-effort dengan waktu terakhir terlihat. Ini kontrol mitigasi, bukan jaminan anti-tampering terhadap pengguna yang mengendalikan perangkat.
S
2
FR-LIC-08
Perpanjangan dilakukan online; klien menawarkan perpanjangan saat terkoneksi dan memberi peringatan sebelum kedaluwarsa.
M
3
FR-LIC-09
Pencabutan berlaku saat perangkat berikutnya terhubung (perpanjangan ditolak); perangkat offline tetap berlaku sampai batas offline.
M
3
FR-LIC-10
Verification key berakar pada root key yang tertanam saat build; daftar kunci penerbit ber-kid ditandatangani root key atau dikirim lewat pembaruan aplikasi tepercaya. Respons GET /keys/public tidak dipercaya tanpa tanda tangan.
M
2
FR-LIC-11
Instalasi membuat pasangan kunci di perangkat (private key non-ekstraktabel bila didukung) dan entitlement diikat pada public key instalasi. Batas perangkat adalah kebijakan lisensi, bukan DRM; penyimpanan web dapat disalin.
S
2
FR-LIC-12
Entitlement dapat dipulihkan lewat aktivasi ulang; pengguna diperingatkan bahwa browser dapat menghapus penyimpanan.
M
2
FR-LIC-13
Lisensi tidak pernah berisi atau menurunkan kunci enkripsi berkas.
M
2
FR-LIC-14
Aplikasi web dapat dimuat ulang dari kondisi tertutup saat offline (PWA): seluruh aset (skrip, stylesheet, font, ikon) tersedia lokal dan tanpa skrip inline sesuai CSP.
M
2
4.4 Pemulihan (REC)
ID
Kebutuhan
Prioritas
Fase
FR-REC-01
Pengguna dapat membuat Recovery Key (dibuat di klien, ditampilkan sekali) yang menambah slot pembungkus DEK pada header (flag recovery).
C
4
FR-REC-02
Recovery Key membuka berkas melalui slot tersebut tanpa mengungkap password; dimungkinkan karena format v3 memakai envelope encryption (FR-CRY-05).
C
4
FR-REC-03
Server tidak pernah menyimpan Recovery Key atau materi yang cukup untuk menurunkannya.
M
4
FR-REC-04
Pengguna diperingatkan tegas bahwa kehilangan password, keyfile, dan Recovery Key berarti data tidak dapat dipulihkan (berlaku di Crypto Core).
M
1
FR-REC-05
Pemulihan terkelola organisasi (escrow kunci oleh admin) untuk paket bisnis, opt-in dan terdokumentasi.
C
6
4.5 Berbagi Berkas (SHR)
ID
Kebutuhan
Prioritas
Fase
FR-SHR-01
Menyimpan atau mengekspor berkas .aegis adalah bagian dasar Crypto Core dan tidak menjadi fitur berbayar.
M
1
FR-SHR-02
Penerima dapat mendekripsi tanpa akun maupun lisensi, memakai password atau keyfile yang dibagikan terpisah oleh pengirim.
M
1
FR-SHR-03
Aplikasi menyarankan pengiriman password lewat kanal berbeda dari berkas.
S
1
FR-SHR-04
Kemudahan berbagi (Web Share API, pengiriman cepat).
S
4
FR-SHR-05
Berbagi berbasis kunci publik (enkripsi untuk penerima tertentu) tanpa berbagi password.
C
6
4.6 Langganan dan Kuota (SUB)
ID
Kebutuhan
Prioritas
Fase
FR-SUB-01
Paket Guest, Free, Pro, dan Organization (fase lanjut) dengan hak fitur berbeda; seluruh angka bersifat konfigurasi dan belum final.
M
2
FR-SUB-02
Fungsi dasar perlindungan berkas (enkripsi dan dekripsi) tidak dibatasi kuota dan tidak memerlukan server.
M
2
FR-SUB-03
Hak berbayar ditegakkan lewat entitlement (FR-LIC), bukan kuota harian di klien atau server.
M
2
FR-SUB-04
Pembayaran, upgrade, downgrade, dan pembatalan melalui penyedia pembayaran pihak ketiga, beserta riwayat penagihan.
M
3
FR-SUB-05
Pembatalan langganan tidak mencabut hak atas periode yang sudah dibayar.
S
3
FR-SUB-06
Pengguna melihat paket, masa berlaku, dan perangkat aktif di akun.
S
2
4.7 Fitur Tim (ORG)
ID
Kebutuhan
Prioritas
Fase
FR-ORG-01
Admin dapat membuat organisasi, mengundang dan mencabut anggota, serta menetapkan peran.
S
6
FR-ORG-02
Kebijakan organisasi: minimum kekuatan password, wajib 2FA, pembatasan format.
S
6
FR-ORG-03
Audit log aktivitas akun dan administrasi (tanpa isi berkas).
S
6
FR-ORG-04
Penagihan per kursi (per anggota).
C
6
4.7a Antarmuka Pengguna (UI)
ID
Kebutuhan
Prioritas
FR-UI-01
Antarmuka responsif untuk desktop dan mobile, mendukung tema gelap, dan memenuhi WCAG 2.1 AA.
M
FR-UI-02
Indikator kekuatan password dan umpan balik langsung saat input.
M
FR-UI-03
Pesan kesalahan membedakan password salah, keyfile salah, berkas rusak, dan versi tidak didukung.
M
FR-UI-04
Dukungan bahasa Indonesia dan Inggris.
S
5. Spesifikasi Format Berkas .aegis (v3)
Format v3 menutup celah pada v2 (chunk belum terikat urutan) dan harus dibekukan sebelum ada pengguna sungguhan, karena semua berkas yang telah dibuat harus tetap terbuka.
5.1 Header
Offset
Ukuran
Bidang
Keterangan
0
5 B
Magic
AEGIS
5
1 B
Versi
0x03
6
1 B
KDF ID
0x01 = PBKDF2-HMAC-SHA256; nilai lain ditolak (dicadangkan, mis. Argon2id)
7
1 B
Flags
bit0 = keyfile dipakai; bit1 = slot Recovery ada; bit2 = dicadangkan (nama berkas terenkripsi); bit3–7 harus 0
8
4 B
Iterasi KDF
uint32; batas 600.000 s.d. 5.000.000
12
4 B
Ukuran chunk
uint32 dalam byte; batas 65.536 s.d. 16.777.216
16
32 B
Salt
Acak kriptografis
48
16 B
File ID
Acak per berkas; mengikat blok pembungkus dan record ke berkas ini
64
4 B
Prefiks nonce
Acak per berkas
68
12 B
Nonce pembungkus
Acak
80
32 B
DEK terbungkus
DEK dienkripsi AES-256-GCM dengan KEK
112
16 B
Tag pembungkus
Tag GCM
Header berukuran tetap 128 byte; semua integer bertipe unsigned big-endian. Bila flag recovery aktif, satu slot Recovery (60 B: nonce 12 B, DEK terbungkus 32 B, tag 16 B; DEK yang sama dibungkus KEK dari Recovery Key) mengikuti header. AAD pembungkus = byte 0–67 header, sehingga perubahan pada KDF, salt, flag, atau File ID menggagalkan pembukaan DEK. Karena AAD record tidak memuat parameter KDF, salt, maupun blok pembungkus, mengganti password atau menambah slot Recovery hanya menulis ulang header tanpa menyentuh record.
5.2 Record Chunk
Isi berkas berupa deretan record. Setiap record ke-i (mulai 0) berstruktur:
• Header record (5 B): Flags record 1 B (bit0 = record final; bit lain 0) ‖ Panjang ciphertext 4 B (uint32, termasuk tag, maksimum ukuran chunk + 16).
• Nonce (12 B) = Prefiks nonce (4 B) ‖ i (8 B). Nonce tidak pernah berulang untuk satu DEK.
• AAD = Magic ‖ Versi ‖ Ukuran chunk ‖ File ID ‖ Prefiks nonce (30 B dari header) ‖ Header record (5 B) ‖ i (8 B).
• Isi = Ciphertext ‖ Tag GCM (16 B), dienkripsi dengan DEK.
Flag final dan panjang di dalam AAD mencegah pemotongan, penambahan, dan manipulasi batas record; indeks mencegah penukaran urutan. Setiap record non-final berisi tepat satu ukuran chunk plaintext.
5.3 Aturan
1.  Pembaca memvalidasi seluruh parameter header (magic, versi, KDF ID, rentang iterasi dan ukuran chunk, bit reserved nol) sebelum menjalankan KDF; berkas dengan nilai di luar batas atau flag tak dikenal ditolak.
2.  Dekripsi menolak berkas bila: record final tidak ada atau bukan yang terakhir, ada byte setelah record final, panjang record melebihi ukuran chunk + 16, atau tersisa byte yang tidak membentuk header record utuh (termasuk 1–3 byte).
3.  Keluaran ditulis ke penyimpanan sementara dan difinalisasi hanya setelah record final terverifikasi; bila platform tidak mendukung keluaran sementara, batas ukuran fallback harus diumumkan ke pengguna.
4.  Berkas kosong menghasilkan tepat satu record final (hanya tag).
5.  Pembaca v3 wajib membaca v2 dengan aturan v2 (header lama tanpa nilai iterasi, 100.000 iterasi tetap, tanpa AAD); penulisan v2 dihentikan.
6.  Pustaka di semua platform wajib lulus kumpulan test vector bersama (v2 dan v3).
6. Persyaratan Non-Fungsional
6.1 Keamanan (SEC)
ID
Kebutuhan
NFR-SEC-01
Plaintext, password enkripsi, keyfile, dan kunci turunan tidak pernah dikirim ke server atau ditulis ke log.
NFR-SEC-02
Kunci disimpan sebagai CryptoKey non-ekstraktabel selama memungkinkan dan dihapus dari memori setelah sesi berakhir; password dan keyfile mentah tidak disimpan lebih lama dari yang diperlukan untuk menurunkan kunci.
NFR-SEC-03
Semua nilai acak (salt, prefiks nonce, kode pemulihan) dibuat dengan CSPRNG (crypto.getRandomValues).
NFR-SEC-04
Password akun disimpan di server menggunakan hash lambat teruji (Argon2id atau bcrypt) dengan salt unik.
NFR-SEC-05
Seluruh komunikasi memakai TLS 1.2 atau lebih baru; HSTS aktif.
NFR-SEC-06
Aplikasi web menerapkan Content Security Policy ketat, Subresource Integrity, dan tanpa skrip inline; dependensi dipindai otomatis dan dikunci versinya.
NFR-SEC-07
Rate limiting dan penguncian bertahap pada endpoint login dan reset.
NFR-SEC-08
Audit keamanan independen atas desain dan implementasi dilakukan sebelum peluncuran komersial dan sebelum penjualan ke organisasi.
NFR-SEC-09
Klaim "zero-knowledge" dan sejenisnya hanya dipublikasikan bila didukung hasil audit dan dokumentasi arsitektur.
6.2 Kinerja (PER)
ID
Kebutuhan
NFR-PER-01
Penggunaan memori enkripsi dan dekripsi tidak bergantung pada ukuran berkas (batas atas ≈ beberapa kali ukuran chunk).
NFR-PER-02
Berkas 1 GiB dapat diproses tanpa kegagalan pada perangkat dengan RAM 4 GB.
NFR-PER-03
Waktu derivasi kunci pada perangkat menengah berada pada 0,3–2 detik.
NFR-PER-04
Antarmuka tetap responsif selama proses berat (pemrosesan di Web Worker).
NFR-PER-05
Waktu respons API akun p95 di bawah 500 ms.
6.3 Keandalan dan Ketersediaan (REL)
ID
Kebutuhan
NFR-REL-01
Fitur inti (enkripsi, dekripsi, Vault) berfungsi tanpa koneksi internet setelah aplikasi termuat (PWA/aplikasi native).
NFR-REL-02
Target ketersediaan layanan backend ≥ 99,5% per bulan.
NFR-REL-03
Gangguan backend tidak boleh mencegah dekripsi berkas yang sudah dimiliki pengguna.
NFR-REL-04
Proses yang dibatalkan atau gagal tidak meninggalkan keluaran parsial yang dapat dikira valid.
6.4 Privasi dan Kepatuhan (PRV)
ID
Kebutuhan
NFR-PRV-01
Data yang dikumpulkan dibatasi pada akun, langganan, dan telemetri minimal; tidak ada isi atau nama berkas.
NFR-PRV-02
Kebijakan privasi dan syarat layanan tersedia; sistem sesuai UU Pelindungan Data Pribadi (UU PDP) dan siap memenuhi GDPR bila melayani pengguna Uni Eropa.
NFR-PRV-03
Pengguna dapat mengekspor dan menghapus datanya.
6.5 Kompatibilitas dan Pemeliharaan (CMP)
ID
Kebutuhan
NFR-CMP-01
Berkas .aegis yang dibuat di satu platform dapat dibuka di semua platform.
NFR-CMP-02
Perubahan format hanya lewat penambahan versi; versi lama tetap dapat dibaca.
NFR-CMP-03
Basis kode TypeScript strict dengan lint, type check, dan cakupan pengujian unit ≥ 80% pada modul kriptografi.
NFR-CMP-04
Pipeline CI menjalankan lint, type check, unit, integrasi, E2E, build, dan pemindaian dependensi pada setiap perubahan.
6.6 Kegunaan (USA)
ID
Kebutuhan
NFR-USA-01
Pengguna nonteknis dapat menyelesaikan enkripsi dan dekripsi pertama dalam kurang dari 2 menit tanpa panduan.
NFR-USA-02
Peringatan risiko (kehilangan password, pengiriman password) ditampilkan jelas dan tidak dapat terlewat.
6.7 Lisensi dan Penggunaan Offline (LIC)
ID
Kebutuhan
NFR-LIC-01
Entitlement memakai tanda tangan asimetris (Ed25519 atau ECDSA P-256); kunci privat penerbit tidak pernah ada di klien dan disimpan di KMS/HSM.
NFR-LIC-02
Public key tertanam mendukung rotasi melalui daftar kunci ber-ID.
NFR-LIC-03
Aplikasi terbuka dan berfungsi penuh tanpa permintaan jaringan wajib setelah aktivasi.
NFR-LIC-04
Kedaluwarsa atau pencabutan lisensi tidak pernah memengaruhi kemampuan mendekripsi berkas.
NFR-LIC-05
ID instalasi acak dan tidak memuat data pribadi atau sidik jari perangkat.
NFR-LIC-06
Gangguan layanan lisensi tidak boleh mengganggu fitur Free maupun fungsi dasar enkripsi dan dekripsi.
7. Antarmuka Eksternal
7.1 Antarmuka Pengguna
Halaman: Login/Sesi, Dashboard (antrean, status operasi, log), Vault, Berbagi, Akun dan Keamanan, Langganan, Pengaturan. Bahasa Indonesia dan Inggris.
7.2 Antarmuka Perangkat Lunak
• Web Crypto API untuk AES-GCM, PBKDF2, SHA-256, dan CSPRNG.
• File System Access API / File API / OPFS untuk berkas dan penyimpanan Vault.
• Penyedia pembayaran (mis. Stripe atau Midtrans) lewat webhook bertanda tangan.
• Penyedia email untuk verifikasi dan reset.
7.3 Antarmuka API Backend (ringkas)
Endpoint
Fungsi
POST /auth/register, /auth/login
Registrasi dan login online untuk aktivasi
POST /auth/2fa/enable, /auth/2fa/verify
2FA TOTP
POST /devices/activate
Mendaftarkan instalasi dan menerbitkan entitlement bertanda tangan
GET /devices, DELETE /devices/{id}
Daftar dan penonaktifan perangkat
POST /licenses/renew
Perpanjangan entitlement setelah pembayaran valid
GET /keys/public
Public key penerbit (mendukung rotasi)
GET /subscription, POST /subscription/checkout
Paket dan pembayaran
POST /webhooks/payments
Notifikasi pembayaran bertanda tangan
Tidak ada endpoint yang menerima berkas atau kunci pengguna.
8. Use Case Utama
ID
Use Case
Aktor
Alur utama
Alur alternatif
UC-01
Enkripsi berkas
Guest/Pengguna
Memilih berkas → memasukkan password (+ keyfile) → menjalankan → mengunduh .aegis
Password lemah: peringatan; dibatalkan: tidak ada keluaran
UC-02
Dekripsi berkas
Guest/Pengguna/Penerima
Memilih .aegis → memasukkan password (+ keyfile) → berkas asli dipulihkan
Password/keyfile salah atau berkas dimanipulasi: ditolak dengan pesan spesifik
UC-03
Aktivasi perangkat
Pengguna
Online → login (+ 2FA) → perangkat didaftarkan → entitlement disimpan lokal → aplikasi dipakai offline
Batas perangkat tercapai: pilih perangkat untuk dinonaktifkan
UC-04
Aktivasi langganan Pro
Pengguna
Memilih paket → membayar → server menerbitkan entitlement → fitur Pro aktif offline
Pembayaran gagal: paket tidak berubah
UC-05
Perpanjangan lisensi
Pengguna
Terkoneksi → klien meminta entitlement baru → masa berlaku diperbarui
Langganan berakhir: kembali ke Free, dekripsi tetap bisa
UC-06
Berbagi berkas
Pengguna, Penerima
Mengenkripsi → membagikan .aegis → penerima membuka dengan password dari kanal terpisah
Password hilang: tidak dapat dipulihkan
UC-07
Aktivasi ulang
Pengguna
Penyimpanan terhapus atau perangkat baru → login online → entitlement diterbitkan ulang
Tanpa internet: fitur Free dasar tetap tersedia
9. Pengujian dan Kriteria Penerimaan
9.1 Strategi
Jenis
Cakupan
Unit
Fungsi kriptografi, derivasi kunci, parser format, penanganan kesalahan
Properti/Fuzz
Enkripsi lalu dekripsi selalu menghasilkan data asal; fuzzing pada header dan chunk
Integrasi
Alur akun, sesi, langganan, webhook pembayaran
E2E (Playwright)
Alur enkripsi, dekripsi, Vault, login lintas browser
Keamanan
Manipulasi ciphertext/metadata/urutan chunk, pemotongan, password dan keyfile salah, pemeriksaan kebocoran data, SAST/DAST, pemindaian dependensi
Kinerja
Berkas 100 MiB, 1 GiB, dan 4 GiB; pengukuran memori puncak
Interoperabilitas
Test vector bersama di setiap platform
9.2 Kriteria Penerimaan Utama
ID
Kriteria
Terkait
AC-01
Test vector deterministik dan pengujian properti (enkripsi lalu dekripsi = berkas asli) lulus pada setiap perubahan; sebelum rilis, 1.000 berkas acak (distribusi 0 B s.d. 100 MiB, total data ditetapkan) menghasilkan berkas identik byte demi byte.
FR-CRY-01/02
AC-02
Mengubah satu bit di header, header record, atau ciphertext mana pun menyebabkan dekripsi gagal.
FR-CRY-06/07
AC-03
Menukar dua record, menghapus record final, menambah record, atau menambah byte setelah record final menyebabkan dekripsi gagal.
FR-CRY-07
AC-04
Berkas yang terpotong 1–3 byte atau di batas mana pun ditolak tanpa keluaran parsial yang diserahkan ke pengguna.
FR-CRY-07/08
AC-05
Dekripsi berkas 1 GiB berjalan di bawah 256 MiB memori puncak pada browser dan perangkat acuan yang ditetapkan, dengan keluaran sementara; metode pengukuran didokumentasikan.
FR-CRY-04/08, NFR-PER-01
AC-06
Berkas v2 nyata tetap dapat didekripsi memakai test vector v2.
FR-CRY-10
AC-07
Header dengan iterasi, ukuran chunk, KDF ID, atau flag di luar batas ditolak sebelum KDF dijalankan.
FR-CRY-09
AC-08
Mengganti password hanya mengubah header; isi record tidak berubah dan berkas tetap terbuka dengan password baru.
FR-CRY-11
AC-09
Dengan jaringan diputus total selama enkripsi dan dekripsi, hasilnya tetap benar; analisis lalu lintas tidak menunjukkan data pengguna keluar perangkat.
NFR-SEC-01, NFR-LIC-03
AC-10
Reset password akun tidak mengubah kemampuan mendekripsi berkas.
FR-ACC-03/08
AC-11
Lisensi Pro kedaluwarsa, dicabut, atau akun dihapus tidak menghalangi dekripsi berkas apa pun.
FR-LIC-06, NFR-LIC-04
AC-12
Entitlement dengan tanda tangan salah, diubah, kid/schema_version tak didukung, atau untuk instalasi lain ditolak dengan pesan jelas.
FR-LIC-02
AC-13
Entitlement tetap terverifikasi setelah browser ditutup dan dibuka kembali saat offline.
FR-LIC-03
AC-14
Aplikasi web dapat dimuat dari kondisi tertutup saat offline dan berfungsi penuh.
FR-LIC-14
AC-15
Perpanjangan menghasilkan entitlement baru yang dapat diverifikasi offline.
FR-LIC-08
AC-16
Penonaktifan perangkat atau penghapusan cache aplikasi tidak menghilangkan berkas pengguna maupun kemampuan mendekripsinya (setelah aplikasi dimuat ulang).
FR-LIC-06/12
AC-17
Memutar jam mundur pada skenario yang dapat dideteksi (waktu terakhir terlihat lebih baru) tidak memperpanjang lisensi; keterbatasan terhadap manipulasi penyimpanan didokumentasikan.
FR-LIC-07
AC-18
Seluruh test vector lintas platform lulus.
NFR-CMP-01
10. Roadmap dan Keterlacakan
Fase
Fokus
Status (14 Nov 2026)
Kebutuhan utama
Keluaran
1
Crypto Core Hardening (publik)
Selesai di kode; verifikasi produksi tertunda
FR-CRY-*, FR-SHR-01..03, FR-REC-04, Bagian 5, AC-01..09
Format v3 beku, dekripsi streaming, test vector bersama, LICENSE, CI diperluas
2
Akun, Aktivasi, Lisensi Offline
Belum dimulai
FR-ACC-01..08, FR-LIC-01..07/10..14, FR-SUB-01..03/06, NFR-LIC-*, AC-10..17
Login online sekali, entitlement bertanda tangan, paket Free
3
Pembayaran dan Perpanjangan
Belum dimulai
FR-SUB-04/05, FR-LIC-08/09
Langganan Pro, perpanjangan online, pencabutan
4
Modul Opsional
Sebagian: Recovery Key, ganti password (rewrap), nama berkas terenkripsi sudah di klien; Vault dan kemudahan berbagi belum
FR-VLT-*, FR-REC-01..03, FR-SHR-04, FR-CRY-14
Local Vault, kemudahan berbagi
5
Lintas Platform
Sebagian: klien desktop (Core, aplikasi, CLI) ada; mobile belum
Build native/terpasang, FR-ACC-09
Desktop dan mobile dengan format identik
6
Organisasi dan Kesiapan Bisnis
Belum dimulai
FR-ORG-*, FR-REC-05, FR-SHR-05, NFR-SEC-08
Lisensi organisasi dan audit independen
Syarat masuk Fase 2: Fase 1 selesai (AC-01 s.d. AC-09 dan AC-18 lulus) dan format v3 dibekukan, sebelum ada pengguna sungguhan atau lisensi berbayar.

## 11. Gate 1 - Masukan Pengguna (Validasi Pasar)

Gate 1 mengumpulkan masukan dari pengguna versi gratis lewat form masukan. Tujuannya menetapkan OD-02 (isi paket Pro), OD-05 (masa berlaku, grace period, batas instalasi), dan OD-09 (harga dan batas paket) berdasarkan data dan masukan, bukan tebakan.

Lulus bila (usulan, bisa disesuaikan): sedikitnya 30 respons yang terisi; satu masalah atau kebutuhan disebut oleh sedikitnya 8 responden; sedikitnya 5 responden memilih fitur berbayar yang sama; dan ada alasan yang berulang mengapa orang tidak memakai alat lain.

Revisi bila: alasan penolakan berbeda-beda tanpa pola, atau sebagian besar responden hanya menginginkan hal yang sudah gratis.

Keputusan dan alasannya ditulis di bagian ini sebelum pekerjaan Fase 2 yang menyangkut paket dan harga dimulai.

Rincian pertanyaan form tersedia di [`docs/guides/user-feedback-form.md`](../guides/user-feedback-form.md).

## 12. Keputusan Terbuka
ID
Pertanyaan
Opsi
Dampak
Status
OD-01
Penyimpanan atau sinkronisasi berkas di server
Tidak ada / opsional
Model ancaman, biaya, identitas produk
Diputuskan: tidak ada cloud storage
OD-02
Apa yang dijual pada paket Pro
Build terpasang bertanda tangan, fitur organisasi, Vault, berbagi lanjutan, dukungan
Nilai bisnis
Terbuka; ditentukan dari masukan pengguna versi gratis. Batasan tetap: keamanan dasar dan dekripsi tidak dijual
OD-03
Lisensi publik Crypto Core
MIT atau Apache-2.0 / AGPL-3.0 + lisensi komersial / BSL atau PolyForm
Hak penggunaan ulang komersial, kepercayaan komunitas
Berkas LICENSE kini Apache-2.0; konfirmasi final sebelum ada kontributor eksternal
OD-04
Menghadapi pemeriksaan lisensi yang dilewati
Terima risiko / hak diterbitkan server / build native
Kekuatan penegakan paket Pro
Diputuskan: terima risiko pada web; fitur bernilai tinggi dikaitkan ke server atau build native
OD-05
Masa berlaku lisensi, grace period, batas instalasi
Mis. grace 7 hari; 2–5 instalasi
Pengalaman offline dan penyalahgunaan
Terbuka; ditetapkan sebelum Fase 3
OD-06
Model recovery
Tanpa pemulihan / Recovery Key / escrow organisasi
Desain kunci
Diputuskan dan diimplementasikan di klien: envelope encryption dan Recovery Key slot
OD-07
KDF akhir
PBKDF2 / Argon2id (WASM)
Ketahanan terhadap serangan GPU
PBKDF2 (batas 600.000–5.000.000) pada v3; default ditetapkan lewat benchmark; KDF ID disiapkan untuk Argon2id
OD-08
Teknologi mobile
Flutter / native / PWA
Implementasi ulang crypto dan test vector
Dievaluasi di Fase 5; desktop memakai .NET (Avalonia)
OD-09
Harga dan batas paket
—
Model bisnis
Terbuka; dijadikan konfigurasi
OD-10
Penyedia pembayaran, stack backend, hosting, KMS
Lihat dokumen Rencana Kematangan Produksi
Fase 2 dan 3
Terbuka; diputuskan sebelum desain Fase 2
Lampiran A. Status Implementasi Saat Ini terhadap Target
Area
Kondisi saat ini (hasil membaca kode; test belum dijalankan oleh penyusun)
Status vs SRS
Format v3
Envelope encryption, header 128 B, record ber-AAD, flag final, batas iterasi dan ukuran chunk
Terpenuhi
Pengikatan urutan dan pemotongan
Terkunci lewat AAD dan flag final; ada test pemotongan dan data tambahan
Terpenuhi
Dekripsi
Streaming ke keluaran sementara dan difinalisasi setelah record final terverifikasi
Terpenuhi
KDF
600.000–5.000.000 di header v3; v2 tetap 100.000
Terpenuhi
Keyfile
Ada; istilah "2FA" hanya untuk akun
Terpenuhi
Recovery Key, ganti password, nama berkas terenkripsi
Sudah di klien, lebih awal dari rencana (Fase 4)
Terpenuhi
Test vector
Berkas bersama v2, v3, v3-unicode, katalog galat; dipakai web dan desktop
Terpenuhi
PWA offline dan CSP
sw.js, precache manifest, _headers dengan CSP ketat, E2E cold-start
Terpenuhi di kode; perlu verifikasi di produksi
Klien desktop
Core, aplikasi Avalonia, CLI, test; SecureDelete dengan peringatan SSD
Ada; peringatan perlu muncul di antarmuka
Lisensi publik
Apache-2.0
Perlu konfirmasi final (OD-03)
Struktur repositori
Monorepo apps/web, apps/desktop, docs/
Selesai
CI dan rantai suplai
Lint, typecheck, audit, secret scan, SBOM, Dependabot, unit, E2E, desktop, fuzzing web
Terpenuhi; belum ada build tertanda dan SAST/DAST
Dokumen keamanan
SECURITY.md, security.txt, threat model v1, arsitektur v1, spesifikasi v3
Terpenuhi
Validasi pasar
Halaman /awal/, form masukan; rencana: kumpulkan masukan dari versi gratis
Berjalan
Akun, aktivasi, lisensi, langganan
Belum ada
Fase 2 dan 3
Local Vault, kemudahan berbagi
Belum ada
Fase 4
Audit independen, hukum, operasional
Belum ada
Gate 4