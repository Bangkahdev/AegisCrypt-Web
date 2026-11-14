# Panduan Wawancara Gate 1

Panduan operasional untuk memvalidasi masalah, bukan memvalidasi solusi. Target:
mengumpulkan bukti apakah ada orang yang mau membayar sebelum membangun backend,
akun, dan lisensi (Gate 2-3).

Halaman pendaratan uji: `https://aegiscrypt.bangkah.tech/awal/` (statis, `noindex`).
Pendaftaran memakai surel agar tidak perlu backend atau analitik pihak ketiga.

## 1. Keputusan yang Ingin Dijawab

| Kode | Pertanyaan | Bukti yang dicari |
|---|---|---|
| OD-02 | Apa yang layak dijual di Pro? | Fitur yang disebut tanpa dipancing oleh minimal 3 narasumber |
| OD-05 | Masa berlaku, grace period, batas instalasi | Toleransi terhadap lisensi per perangkat |
| OD-09 | Harga dan paket | Angka yang disebut spontan dan reaksi terhadap 3 titik harga |

Hipotesis yang diuji (tulis sebelum wawancara, jangan diubah setelahnya):

1. Pengguna rutin mengirim berkas sensitif lewat email/pesan dan menyadari risikonya.
2. Mereka sudah mengeluarkan biaya (uang, waktu, atau risiko) untuk mengatasinya.
3. Alat saat ini dirasa cukup, tetapi ada satu langkah yang membuatnya jarang dipakai.
4. Kesediaan membayar muncul untuk menghilangkan langkah itu, bukan untuk "enkripsi".

## 2. Profil Narasumber

Prioritas (pilih 8-12 orang, minimal 4 dari dua kategori berbeda):

- **Freelancer/agensi kecil**: kontrak, NPWP, KTP, desain klien, laporan keuangan.
- **Legal/keuangan/HR**: dokumen karyawan, rekap gaji, dokumen klien.
- **Pendiri/operator bisnis kecil**: data pelanggan, dokumen investasi.
- **Jurnalis/peneliti/aktivis**: sumber dan dokumen lapangan (hati-hati etika).

Hindari: kolega dekat yang tahu proyek ini, penggemar kriptografi, dan orang yang
tidak pernah mengirim berkas sensitif.

Kriteria keluar: pernah mengirim berkas sensitif dalam 30 hari terakhir.

## 3. Rekrutmen

Kanal, urut dari yang paling cepat:

1. Jaringan pribadi tingkat dua (bukan teman langsung): minta rujukan.
2. Komunitas praktisi (grup freelancer, asosiasi profesi, forum lokal).
3. Posting singkat di LinkedIn/X dengan tautan `/awal/`, tanpa klaim berlebihan.

Skrip ajakan (kirim personal, jangan massal):

> Halo [Nama], saya sedang meneliti cara orang mengirim berkas sensitif
> (kontrak, laporan, data pelanggan) tanpa harus mengunggahnya ke layanan awan.
> Saya butuh 20 menit untuk mendengar pengalaman Anda, bukan untuk menjual.
> Tidak ada data sensitif yang perlu ditunjukkan. Bersedia?

Aturan: maksimal dua kali tindak lanjut, lalu berhenti. Jangan menawarkan insentif
uang pada tahap ini.

## 4. Etika dan Privasi

- Minta izin sebelum mencatat atau merekam. Sebutkan tujuan dan siapa yang membaca.
- Jangan meminta berkas asli, kata sandi, atau nama klien. Cukup jenis dokumen.
- Catatan disimpan di luar repo ini. Repo hanya memuat ringkasan tanpa PII.
- Hapus rekaman setelah ringkasan dibuat, kecuali narasumber minta sebaliknya.
- Jika narasumber menyebut insiden keamanan nyata, jangan menyelidiki; catat sebagai
  konteks dan lanjutkan.

## 5. Skrip 20-25 Menit

### Pembuka (2 menit)

> Terima kasih waktunya. Saya sedang mempelajari kebiasaan mengirim berkas sensitif.
> Tidak ada jawaban benar atau salah, dan saya tidak menjual apa pun hari ini.
> Boleh saya mencatat?

### Konteks terakhir (6 menit)

1. Ceritakan berkas sensitif terakhir yang Anda kirim. Apa isinya, ke siapa?
2. Lewat apa dikirim? Mengapa memilih cara itu?
3. Apa yang terjadi setelah dikirim? Ada kekhawatiran?

### Biaya dan risiko (5 menit)

4. Pernahkah khawatir berkas itu tersebar? Apa yang Anda lakukan?
5. Apakah pernah menolak mengirim sesuatu karena risikonya?
6. Berapa lama waktu yang dihabiskan untuk mengamankan berkas bulan lalu?

### Alat saat ini (5 menit)

7. Alat apa yang dipakai sekarang untuk melindungi berkas? Seberapa sering?
8. Apa bagian paling menjengkelkan dari alat itu?
9. Pernah berhenti memakainya? Mengapa?

### Reaksi konsep (4 menit)

Tunjukkan `/awal/`, bukan aplikasi. Jangan jelaskan fitur lebih dulu.

10. Setelah melihat ini, apa yang menurut Anda terjadi saat menekan tombolnya?
11. Bagian mana yang tidak jelas atau tidak Anda percaya?
12. Apa yang membuat Anda tidak mau memakainya?

### Kesediaan membayar (4 menit)

13. Jika alat ini menghilangkan langkah yang tadi Anda sebut, apakah layak dibayar?
14. Berapa yang wajar per bulan untuk penggunaan pribadi? Per tahun?
15. Reaksi terhadap tiga titik harga: Rp 15.000, Rp 49.000, Rp 99.000 per bulan.
    Mana yang terlalu murah, wajar, terlalu mahal? Mengapa?
16. Lebih memilih berlangganan atau bayar sekali? Berapa lama lisensi yang wajar?

### Penutup (2 menit)

17. Siapa lagi yang menurut Anda punya masalah ini? Boleh minta pengantar?
18. Boleh saya hubungi lagi setelah versi uji siap?

## 6. Aturan Bertanya

- Tanyakan pengalaman lampau, bukan niat ("terakhir kapan", bukan "apakah Anda akan").
- Jangan menyebut fitur sebelum narasumber menyebut masalahnya.
- Diam setelah pertanyaan; biarkan jeda diisi narasumber.
- Kejar angka dan nama alat, bukan opini umum.
- Jika narasumber hanya memuji, tanyakan "apa yang membuat Anda ragu?".
- Jangan membela produk atau mengoreksi kekhawatiran.

## 7. Rubrik Sinyal (skor 1-3 per baris)

| Sinyal | 1 | 2 | 3 |
|---|---|---|---|
| Frekuensi masalah | < 1x/bulan | 1-3x/bulan | > 3x/bulan |
| Dampak | Ragu | Waktu hilang | Uang, klien, atau risiko hukum |
| Biaya saat ini | Tidak ada | Waktu | Uang atau langganan |
| Upaya mencari solusi | Tidak | Mencoba | Membayar/membangun sendiri |
| Kesediaan membayar | Menolak | Ragu | Menyebut angka |

Simpan satu baris per wawancara (tanpa nama lengkap):

| ID | Profil | Skor total | Masalah utama | Angka harga | Tindak lanjut |
|---|---|---|---|---|---|
| W01 | Freelancer desain |  |  |  |  |

## 8. Ambang Keputusan Gate 1

Lanjut ke Gate 2 bila minimal tiga terpenuhi:

- 10 wawancara selesai, minimal 6 memenuhi kriteria keluar.
- Minimal 4 narasumber menyebut biaya nyata (uang/waktu/risiko) tanpa dipancing.
- Minimal 3 menyebut angka harga sendiri, atau menerima titik tengah tanpa ragu.
- Minimal 3 bersedia dihubungi untuk uji tertutup.
- Masalah yang berulang muncul di dua profil berbeda.

Berhenti dan revisi bila:

- Masalah utama berbeda-beda tanpa pola, atau
- Semua narasumber puas dengan alat gratis yang sudah ada, atau
- Tidak ada yang mau membayar pada titik harga terendah.

Tulis keputusan dan alasannya di `docs/specs/production-readiness-plan-v1.0.md`
(Gate 1) sebelum memulai pekerjaan backend.

## 9. Setelah Wawancara

1. Isi rubrik dalam 24 jam, selagi ingatan masih segar.
2. Kirim ucapan terima kasih dan satu pertanyaan lanjutan.
3. Perbarui hitungan ambang di atas.
4. Jika diminta, kirim tautan `/awal/`, bukan aplikasi, sampai ada kata sandi uji.
5. Perbarui SRS v1.3 hanya setelah ada temuan, agar status Fase 1 dan Lampiran A
   mencerminkan keputusan nyata.
