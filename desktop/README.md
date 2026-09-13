# AegisCrypt Desktop (C# / Avalonia) — Belum Diimplementasikan

Folder ini adalah kerangka proyek Avalonia (`.csproj`, `.axaml`) untuk versi
desktop AegisCrypt yang disebut di README utama (untuk file >10GB yang tidak
didukung oleh batas Blob browser).

**Status saat ini: semua file di folder ini kosong (0 byte).** Belum ada kode
C# yang benar-benar ditulis. Struktur folder disiapkan lebih dulu sebagai
kerangka (`Models/`, `Services/`), tapi implementasinya menyusul.

Sebelumnya ada folder duplikat `AegisCrypt/` di root repo dengan isi yang sama
kosongnya — sudah dihapus supaya tidak ada dua sumber kebenaran yang
membingungkan.

## Rencana implementasi
- `Program.cs` / `App.axaml(.cs)` — bootstrap aplikasi Avalonia
- `MainWindow.axaml(.cs)` — UI utama
- `Services/CryptoService.cs` — port logika AES-256-GCM + PBKDF2 dari
  `src/services/cryptoService.ts` (format `.aegis` v2 harus tetap kompatibel
  dengan versi web)
- `Services/SecureDeleteService.cs` — secure-delete file asli setelah proses
- `Models/AegisConstants.cs` — konstanta kripto (samakan dengan
  `src/constants.ts` di versi web)
