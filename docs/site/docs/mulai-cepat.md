---
sidebar_position: 2
slug: /mulai-cepat
---

# Mulai Cepat

Tidak perlu menginstal sesuatu secara lokal. AegisCrypt adalah aplikasi web yang sudah di-deploy. Buka langsung dan mulai sesi enkripsi.

## Langkah 1: Buka aplikasi

Buka [https://aegiscrypt.bangkah.tech](https://aegiscrypt.bangkah.tech) di browser Anda. Aplikasi akan dimuat sepenuhnya di browser — tidak ada unduhan atau instalasi yang diperlukan.

<div className="card">
  <img src="/screenshots/login.png" alt="Layar masuk AegisCrypt" style={{ width: "100%", height: "auto", borderRadius: "8px", marginBottom: "1rem" }} />
  <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>Layar masuk: masukkan kata sandi dan (opsional) pilih keyfile.</p>
</div>

## Langkah 2: Mulai sesi

1. Masukkan **kata sandi kuat** di kolom `Master password`.
2. (Opsional) Aktifkan **Use keyfile** dan pilih berkas acak (gambar, audio, dokumen, atau berkas apa pun) sebagai faktor kedua. Keyfile yang sama harus digunakan saat dekripsi.
3. Klik tombol **Start Session**.

## Langkah 3: Enkripsi berkas

Setelah sesi aktif, Anda akan melihat dasbor pemrosesan.

<div className="card">
  <img src="/screenshots/dashboard.png" alt="Dasbor pemrosesan AegisCrypt" style={{ width: "100%", height: "auto", borderRadius: "8px", marginBottom: "1rem" }} />
  <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>Dasbor: antrean berkas, tombol Enkripsi/Dekripsi, dan log operasi.</p>
</div>

1. Seret satu atau beberapa berkas/folder ke zona `Processing Queue`, atau klik `Click to browse`.
2. Klik tombol **Encrypt** (gembok tertutup).
3. Pantau progres, kecepatan (MB/s), dan Estimasi Waktu Selesai (ETA) di `Operation Status`.
4. Setelah selesai, browser akan otomatis mengunduh kontainer berformat `original.ext.aegis`.

## Langkah 4: Dekripsi berkas

1. Mulai sesi dengan **kata sandi dan keyfile yang sama persis** yang digunakan saat enkripsi.
2. Seret berkas `.aegis` ke zona unggah.
3. Klik tombol **Decrypt** (gembok terbuka).
4. Unduh berkas asli yang berhasil dipulihkan.

<div className="callout callout-danger">
  <div className="callout-title">Peringatan penting</div>
  Tanpa keyfile yang sama persis, dekripsi akan gagal. Simpan keyfile dengan aman dan jangan menghapusnya sebelum memverifikasi bahwa dekripsi berhasil. Tidak ada mekanisme pemulihan kunci di server.
</div>

## Tampilan di perangkat seluler

Aplikasi responsif dan dapat digunakan di layar seluler.

<img src="/screenshots/login-mobile.png" alt="Layar masuk seluler" style={{ width: "100%", maxWidth: "400px", borderRadius: "8px", marginBottom: "0.5rem" }} />
<img src="/screenshots/dashboard-mobile.png" alt="Dasbor seluler" style={{ width: "100%", maxWidth: "400px", borderRadius: "8px" }} />

## Apa yang diperlukan

- Browser modern dengan `crypto.subtle`, `File.slice`, dan `Blob`
- Koneksi internet hanya untuk memuat aplikasi pertama kali; kriptografi tetap bekerja secara offline setelah halaman dimuat

## Sumber kode

Kode sumber aplikasi tersedia di GitHub: https://github.com/Bangkahdev/AegisCrypt-Web
