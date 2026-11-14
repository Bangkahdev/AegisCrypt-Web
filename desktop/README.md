# AegisCrypt Desktop (.NET 8)

Implementasi desktop dari mesin format AegisCrypt: **pustaka inti, CLI, dan
aplikasi grafis Avalonia** yang menghasilkan serta membaca kontainer `.aegis`
yang identik dengan versi web.

## Isi Solusi

| Proyek | Keterangan |
|---|---|
| `src/AegisCrypt.Core` | Mesin format v3: enkripsi, dekripsi, rewrap, pembacaan v2 lama, codec kunci recovery, dan secure delete |
| `src/AegisCrypt.Cli` | CLI `aegiscrypt` (perintah `encrypt`, `decrypt`, `rewrap`, `keygen`, `shred`) |
| `src/AegisCrypt.App` | Aplikasi desktop Avalonia (MVVM) dengan mode enkripsi dan dekripsi |
| `tests/AegisCrypt.Core.Tests` | 43 tes xUnit, termasuk vektor beku v3, round-trip batas chunk, pembatalan, dan secure delete |
| `tests/AegisCrypt.App.Tests` | 11 tes ViewModel dan smoke test UI Avalonia headless |

## Kompatibilitas Format

- Kontainer v3 yang ditulis mesin ini **identik byte-per-byte** dengan vektor beku
  web (`tests/vectors.test.ts`) dan dapat dibaca oleh aplikasi web, begitu pula
  sebaliknya (nama berkas, slot recovery, dan rewrap diuji dua arah).
- Kontainer v2 lama tetap dapat didekripsi. Gunakan `rewrap` untuk memindahkannya
  ke format v3.
- Parameter yang sama dengan web: PBKDF2-HMAC-SHA256 600.000–5.000.000 iterasi,
  chunk 64 KiB–16 MiB, metadata nama berkas, dan slot recovery 256-bit.

## Prasyarat

.NET SDK 8.0 atau lebih baru:

```bash
dotnet --version
```

Bila tidak ada SDK sistem, repo ini dapat memakai SDK lokal di `.dotnet/`
(diabaikan git). Panggil `& .\.dotnet\dotnet.exe` sebagai ganti `dotnet`.

## Build dan Uji

```bash
dotnet build desktop/AegisCrypt.sln
dotnet test  desktop/AegisCrypt.sln
```

Untuk menjalankan CLI dari sumber:

```bash
dotnet run --project desktop/src/AegisCrypt.Cli -- --help
```

Menjalankan aplikasi grafis:

```bash
dotnet run --project desktop/src/AegisCrypt.App
```

## Aplikasi Grafis

Antarmuka Avalonia memakai pola MVVM: ViewModel menangani validasi dan operasi
kripto, sedangkan jendela hanya mengatur pemilihan berkas lewat `StorageProvider`.

- Dua mode: **Enkripsi** dan **Dekripsi**.
- Pemilihan berkas masukan/keluaran, keyfile opsional, dan kunci recovery dengan
  tombol pembuat kunci.
- Parameter lanjutan (iterasi PBKDF2 dan ukuran chunk) khusus mode enkripsi.
- Progres operasi dan pesan kesalahan ditampilkan di bilah status.

Smoke test UI berjalan headless (`Avalonia.Headless.XUnit`), sehingga XAML tetap
terverifikasi di CI tanpa layar.

## Pemakaian CLI

```bash
# Enkripsi (nama berkas asli ikut disimpan di dalam kontainer)
aegiscrypt encrypt laporan.pdf --password "rahasia" -o laporan.pdf.aegis

# Enkripsi dengan keyfile dan slot recovery
aegiscrypt keygen                      # mencetak kunci recovery 32 byte
aegiscrypt encrypt arsip.zip --keyfile kunci.bin \
  --recovery-key "0123ABCD-4567EF01-..." -o arsip.zip.aegis

# Dekripsi (tanpa -o memakai nama berkas yang tersimpan; pakai --force untuk menimpa)
aegiscrypt decrypt laporan.pdf.aegis --password "rahasia"
aegiscrypt decrypt arsip.zip.aegis --recovery-key "0123ABCD-..."

# Ganti kata sandi tanpa menulis ulang payload
aegiscrypt rewrap arsip.zip.aegis -o arsip-baru.aegis \
  --old-password "lama" --new-password "baru" --iterations 800000

# Hapus berkas secara aman (overwrite acak lalu hapus)
aegiscrypt shred rahasia.txt --passes 2
```

Opsi lengkap: `aegiscrypt help`. Jika `--password` tidak diberikan, CLI meminta
kata sandi secara tersembunyi.

## Catatan Keamanan

- Utamakan prompt kata sandi; argumen `--password` terlihat di riwayat shell dan
  daftar proses.
- Keyfile dibaca sebagai byte mentah lalu di-hash SHA-256, sama seperti web.
- Kunci recovery tidak disimpan di kontainer. Simpan terpisah; tanpa kunci itu,
  slot recovery tidak dapat dibuka.
- Header, metadata nama berkas, dan setiap record diautentikasi (AAD). Manipulasi
  atau pemotongan berkas ditolak dengan pesan `AegisFormatException` yang sama
  dengan pesan web.
- Enkripsi dan dekripsi dapat dibatalkan (Ctrl+C pada CLI, tombol Batalkan pada
  GUI). Output ditulis ke berkas sementara dan dibersihkan otomatis bila operasi
  dibatalkan atau gagal, sehingga tidak tersisa keluaran parsial.
- Perintah `shred` menimpa isi berkas dengan byte acak sebelum menghapusnya.
  Pada SSD/flash dengan *wear leveling*, overwrite di tempat tidak menjamin
  pemadaman fisik; enkripsi penuh berkas tetap menjadi perlindungan utama.
- Dekripsi menulis ke berkas sementara dan menghapusnya bila verifikasi gagal.
  Pustaka tetap menyerahkan tanggung jawab pembuangan keluaran parsial kepada
  pemanggil: tulis ke berkas/stream sementara dan pindahkan ke lokasi final
  hanya setelah `AegisCrypto.Decrypt` selesai tanpa error.
- Penghapusan berkas sementara **bukan** secure erasure: pada SSD, filesystem
  copy-on-write, jurnal, atau snapshot, salinan plaintext dapat tetap ada.

## Batasan dan Rencana

- Secure delete tersedia di CLI (`shred`); integrasi GUI dan menu
  explorer/shell menyusul.
- Belum ada keluaran streaming ke stdout.
- Format v2 bersifat baca-saja (tanpa pembuatan kontainer v2 baru).
- Paket instalasi (MSIX/installer) dan penandatanganan kode belum disiapkan.

## Lisensi

Apache-2.0, sesuai keputusan desain OD-03.
