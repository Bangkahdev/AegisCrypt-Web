# AegisCrypt Desktop (.NET 8)

Implementasi desktop dari mesin format AegisCrypt. Fase ini berisi **pustaka inti
dan CLI** yang menghasilkan serta membaca kontainer `.aegis` yang identik dengan
versi web. Antarmuka grafis (Avalonia) direncanakan pada fase berikutnya.

## Isi Solusi

| Proyek | Keterangan |
|---|---|
| `src/AegisCrypt.Core` | Mesin format v3: enkripsi, dekripsi, rewrap, dan pembacaan v2 lama |
| `src/AegisCrypt.Cli` | CLI `aegiscrypt` (perintah `encrypt`, `decrypt`, `rewrap`, `keygen`) |
| `tests/AegisCrypt.Core.Tests` | 29 tes xUnit, termasuk vektor beku v3 dan round-trip batas chunk |

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
- Dekripsi menulis ke berkas sementara dan menghapusnya bila verifikasi gagal.
  Pustaka tetap menyerahkan tanggung jawab pembuangan keluaran parsial kepada
  pemanggil.

## Batasan dan Rencana

- GUI Avalonia belum diimplementasikan; fase ini sengaja dibatasi pada komponen
  yang dapat diuji tanpa layar.
- Belum ada keluaran streaming ke stdout, secure delete, atau integrasi
  explorer/shell.
- Format v2 bersifat baca-saja (tanpa pembuatan kontainer v2 baru).

## Lisensi

Apache-2.0, sesuai keputusan desain OD-03.
