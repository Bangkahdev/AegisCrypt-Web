/**
 * UI copy for the two supported locales. `en` is the source of truth; `id` is
 * typed against it so a missing key fails the typecheck.
 */

export const en = {
  "meta.title": "AegisCrypt — Zero-Knowledge File Encryption",
  "meta.description":
    "AegisCrypt is a zero-knowledge, browser-based AES-256-GCM file encryption suite. Your files never leave your device.",

  "recovery.title": "Recovery key",
  "recovery.description":
    "Attach an independent recovery key to the files you encrypt from now on.",
  "recovery.activeDescription":
    "This key opens .aegis files that were sealed while it was active.",
  "recovery.generate": "Generate recovery key",
  "recovery.generateHint":
    "AegisCrypt can attach a second, independent key to every file you encrypt from now on. The key is never stored in the browser or on a server.",
  "recovery.generateWarning":
    "You will see the key once. Without it, a forgotten password cannot be recovered.",
  "recovery.warning":
    "Store this key offline. Anyone who has it can decrypt files that carry a recovery slot.",
  "recovery.copy": "Copy key",
  "recovery.copied": "Copied",
  "recovery.download": "Download .txt",
  "recovery.remove": "Remove recovery key from this session",
  "recovery.close": "Close recovery dialog",
  "recovery.fileContent":
    "AegisCrypt recovery key\n=======================\n\n{key}\n\nKeep this file offline. It can decrypt .aegis files sealed with a recovery slot. AegisCrypt never stores this key.\n",

  "login.modePassword": "Password",
  "login.modeRecovery": "Recovery key",
  "login.recoveryLabel": "Recovery key",
  "login.recoveryPlaceholder": "XXXX-XXXX-XXXX-...",
  "login.recoveryHint":
    "Paste the 64-character key you saved when enabling recovery. Recovery sessions can only decrypt.",
  "login.recoveryInvalid": "Enter a valid 64-character recovery key.",

  "common.skipToContent": "Skip to main content",
  "common.documentation": "Documentation",
  "common.readDocs": "Read the docs",
  "errors.storageQuota":
    "The browser does not have enough storage to process this file. Free up space and try again.",

  "common.switchLanguage": "Switch language",
  "common.themeLight": "Switch to light mode",
  "common.themeDark": "Switch to dark mode",

  "login.zeroKnowledgeSuite": "Zero-knowledge suite",
  "login.badge": "RUNS ENTIRELY IN YOUR BROWSER",
  "login.headline1": "Private by default.",
  "login.headline2": "Encrypted by you.",
  "login.introBefore": "AegisCrypt turns any file into a sealed",
  "login.introAfter":
    "container using AES-256-GCM. Keys are derived on your device and never transmitted, logged, or stored.",
  "login.feature1": "AES-256-GCM authenticated encryption",
  "login.feature2": "PBKDF2-HMAC-SHA256 key derivation",
  "login.feature3": "Optional keyfile as a second factor",
  "login.feature4": "Streaming engine for multi-gigabyte files",
  "login.factCipher": "Cipher",
  "login.factKdf": "Key derivation",
  "login.factDataPath": "Data path",
  "login.factDataPathValue": "Browser only",
  "login.startTitle": "AegisCrypt",
  "login.startSubtitle": "Start a secure, local-only session",
  "login.useKeyfile": "Use keyfile",
  "login.secondFactor": "Second factor (2FA)",
  "login.selectKeyfile": "Select keyfile...",
  "login.keyfileHint": "Image, audio, document - any file works",
  "login.toggleKeyfile": "Toggle keyfile second factor",
  "login.startSession": "Start Session",
  "login.initializing": "Initializing...",
  "login.filesNeverLeave": "Files never leave your device",
  "login.footer": "AegisCrypt Web / Zero-knowledge encryption workspace",
  "login.noticeLockedInactivity": "Session locked after 10 minutes of inactivity.",
  "login.noticeLockedManual": "Session locked. Enter your password to continue.",

  "app.badge": "ZERO-KNOWLEDGE",
  "app.workspaceActive": "Secure workspace / session active",
  "app.auth": "Auth",
  "app.password": "Password",
  "app.recoveryKey": "Recovery key",
  "app.recoveryActive": "RECOVERY",
  "app.changePassword": "Change password",
  "app.changePasswordTitle": "Change password for queued .aegis files",
  "app.lock": "Lock",
  "app.lockTitle": "Lock the session and clear credentials",
  "app.logout": "Logout",
  "app.zeroKnowledgeFooter":
    "Zero-knowledge by design. Files are sealed in browser memory and never uploaded to a server.",

  "queue.title": "Processing Queue",
  "queue.queued": "{size} queued for processing",
  "queue.empty": "Drop files or folders to get started",
  "queue.clearAll": "Clear all",
  "queue.dropTitle": "Drop files to secure",
  "queue.dropRelease": "Release to add them to the queue",
  "queue.dropDescription":
    "Drag and drop documents, images, archives, or entire folders. Bulk processing is supported.",
  "queue.browse": "Click to browse",
  "queue.addFolder": "Add a folder",
  "queue.addMoreFiles": "Add more files",

  "actions.encrypt": "Encrypt",
  "actions.encryptHint": "Seal into .aegis",
  "actions.decrypt": "Decrypt",
  "actions.decryptHint": "Restore originals",

  "status.title": "Operation Status",
  "status.batchProgress": "Batch progress",
  "status.percentOf": "{percent}% of {file}",
  "status.idle": "Idle",
  "status.idleBadge": "IDLE",
  "status.cancel": "Cancel",
  "status.progress": "Progress",
  "status.speed": "Speed",
  "status.eta": "ETA",
  "status.current": "Current",
  "status.processing": "Processing {file}",
  "status.processingFiles": "Processing files",
  "status.rewrapping": "Re-wrapping files",
  "status.aesLine": "AES-256-GCM / PBKDF2",
  "status.iterations": "600k iterations",

  "mode.encrypt": "ENCRYPT",
  "mode.decrypt": "DECRYPT",

  "logs.added": "Added {count} files to queue.",
  "logs.noneInDrop": "No files found in the drop.",
  "logs.cancelled": "Operation cancelled by user.",
  "logs.noFiles": "No files in queue.",
  "logs.starting": "Starting {mode}: {name}",
  "logs.success": "{mode} Success: {name}",
  "logs.failed": "Failed {name}: {error}",
  "logs.systemError": "System Error: {error}",
  "logs.batchComplete": "Batch Process Completed.",
  "logs.noContainers": "No .aegis containers in the queue to re-wrap.",
  "logs.rewrapping": "Re-wrapping credentials: {name}",
  "logs.rewrapped": "Re-wrapped {name}",
  "logs.rewrapComplete": "Rewrap completed. Unlock with the new password from now on.",

  "files.encrypted": "ENCRYPTED",
  "files.remove": "Remove {name}",

  "logBox.title": "Operation Log",
  "logBox.clear": "Clear",
  "logBox.ready": "Ready for operations...",

  "password.label": "Master password",
  "password.placeholder": "Enter encryption password",
  "password.required": "Password required",
  "password.chars": "{count} chars",
  "password.weak": "Weak",
  "password.fair": "Fair",
  "password.good": "Good",
  "password.excellent": "Excellent",
  "password.show": "Show password",
  "password.hide": "Hide password",
  "password.iterations": "PBKDF2 / 600k iterations",

  "rewrap.title": "Change password",
  "rewrap.description":
    "Re-wraps the file key for {count} container(s). Records are not re-encrypted.",
  "rewrap.newPassword": "New password",
  "rewrap.confirmPassword": "Confirm new password",
  "rewrap.confirmPlaceholder": "Repeat new password",
  "rewrap.iterations": "PBKDF2 iterations",
  "rewrap.iterationsDefault": "600k (default)",
  "rewrap.newKeyfile": "New keyfile",
  "rewrap.newKeyfileHint": "Optional second factor for the new password",
  "rewrap.toggleNewKeyfile": "Toggle new keyfile",
  "rewrap.selectKeyfile": "Select keyfile...",
  "rewrap.submit": "Re-wrap files",
  "rewrap.submitting": "Re-wrapping...",
  "rewrap.cancel": "Cancel",
  "rewrap.close": "Close change password dialog",
  "rewrap.mismatch": "New passwords do not match.",
  "rewrap.enterPassword": "Enter a new password.",
} as const;

export type TranslationKey = keyof typeof en;

export const id: Record<TranslationKey, string> = {
  "meta.title": "AegisCrypt — Enkripsi Berkas Zero-Knowledge",
  "meta.description":
    "AegisCrypt adalah aplikasi enkripsi berkas AES-256-GCM berbasis browser dengan model zero-knowledge. Berkas Anda tidak pernah meninggalkan perangkat.",

  "recovery.title": "Kunci recovery",
  "recovery.description":
    "Tambahkan kunci recovery independen ke berkas yang Anda enkripsi mulai sekarang.",
  "recovery.activeDescription":
    "Kunci ini membuka berkas .aegis yang dibuat saat kunci aktif.",
  "recovery.generate": "Buat kunci recovery",
  "recovery.generateHint":
    "AegisCrypt dapat menambahkan kunci kedua yang independen ke setiap berkas yang Anda enkripsi mulai sekarang. Kunci ini tidak disimpan di browser maupun server.",
  "recovery.generateWarning":
    "Kunci hanya ditampilkan sekali. Tanpa kunci ini, kata sandi yang lupa tidak dapat dipulihkan.",
  "recovery.warning":
    "Simpan kunci ini secara offline. Siapa pun yang memilikinya dapat mendekripsi berkas yang memiliki slot recovery.",
  "recovery.copy": "Salin kunci",
  "recovery.copied": "Tersalin",
  "recovery.download": "Unduh .txt",
  "recovery.remove": "Hapus kunci recovery dari sesi ini",
  "recovery.close": "Tutup dialog recovery",
  "recovery.fileContent":
    "Kunci recovery AegisCrypt\n=========================\n\n{key}\n\nSimpan berkas ini secara offline. Berkas ini dapat mendekripsi berkas .aegis yang dibuat dengan slot recovery. AegisCrypt tidak pernah menyimpan kunci ini.\n",

  "login.modePassword": "Kata sandi",
  "login.modeRecovery": "Kunci recovery",
  "login.recoveryLabel": "Kunci recovery",
  "login.recoveryPlaceholder": "XXXX-XXXX-XXXX-...",
  "login.recoveryHint":
    "Tempel kunci 64 karakter yang Anda simpan saat mengaktifkan recovery. Sesi recovery hanya dapat mendekripsi.",
  "login.recoveryInvalid": "Masukkan kunci recovery 64 karakter yang valid.",

  "common.skipToContent": "Lewati ke konten utama",
  "common.documentation": "Dokumentasi",
  "common.readDocs": "Baca dokumentasi",
  "errors.storageQuota":
    "Penyimpanan browser tidak cukup untuk memproses berkas ini. Kosongkan ruang penyimpanan lalu coba lagi.",

  "common.switchLanguage": "Ganti bahasa",
  "common.themeLight": "Ganti ke mode terang",
  "common.themeDark": "Ganti ke mode gelap",

  "login.zeroKnowledgeSuite": "Suite zero-knowledge",
  "login.badge": "BERJALAN SEPENUHNYA DI BROWSER ANDA",
  "login.headline1": "Privat secara bawaan.",
  "login.headline2": "Terenkripsi oleh Anda.",
  "login.introBefore": "AegisCrypt mengubah berkas apa pun menjadi kontainer",
  "login.introAfter":
    "tertutup memakai AES-256-GCM. Kunci diturunkan di perangkat Anda dan tidak pernah dikirim, dicatat, atau disimpan.",
  "login.feature1": "Enkripsi terautentikasi AES-256-GCM",
  "login.feature2": "Derivasi kunci PBKDF2-HMAC-SHA256",
  "login.feature3": "Keyfile opsional sebagai faktor kedua",
  "login.feature4": "Mesin streaming untuk berkas multi-gigabyte",
  "login.factCipher": "Cipher",
  "login.factKdf": "Derivasi kunci",
  "login.factDataPath": "Jalur data",
  "login.factDataPathValue": "Hanya browser",
  "login.startTitle": "AegisCrypt",
  "login.startSubtitle": "Mulai sesi aman yang hanya berjalan lokal",
  "login.useKeyfile": "Gunakan keyfile",
  "login.secondFactor": "Faktor kedua (2FA)",
  "login.selectKeyfile": "Pilih keyfile...",
  "login.keyfileHint": "Gambar, audio, dokumen - berkas apa pun bisa",
  "login.toggleKeyfile": "Aktifkan faktor kedua keyfile",
  "login.startSession": "Mulai Sesi",
  "login.initializing": "Menginisialisasi...",
  "login.filesNeverLeave": "Berkas tidak pernah meninggalkan perangkat Anda",
  "login.footer": "AegisCrypt Web / Ruang kerja enkripsi zero-knowledge",
  "login.noticeLockedInactivity": "Sesi terkunci setelah 10 menit tanpa aktivitas.",
  "login.noticeLockedManual": "Sesi terkunci. Masukkan kata sandi untuk melanjutkan.",

  "app.badge": "ZERO-KNOWLEDGE",
  "app.workspaceActive": "Ruang kerja aman / sesi aktif",
  "app.auth": "Autentikasi",
  "app.password": "Kata sandi",
  "app.recoveryKey": "Kunci recovery",
  "app.recoveryActive": "RECOVERY",
  "app.changePassword": "Ganti kata sandi",
  "app.changePasswordTitle": "Ganti kata sandi untuk berkas .aegis dalam antrean",
  "app.lock": "Kunci",
  "app.lockTitle": "Kunci sesi dan hapus kredensial",
  "app.logout": "Keluar",
  "app.zeroKnowledgeFooter":
    "Zero-knowledge sejak desain. Berkas dikunci di memori browser dan tidak pernah diunggah ke server.",

  "queue.title": "Antrean Pemrosesan",
  "queue.queued": "{size} dalam antrean pemrosesan",
  "queue.empty": "Letakkan berkas atau folder untuk memulai",
  "queue.clearAll": "Hapus semua",
  "queue.dropTitle": "Lepaskan berkas untuk dikunci",
  "queue.dropRelease": "Lepaskan untuk menambahkan ke antrean",
  "queue.dropDescription":
    "Seret dan lepaskan dokumen, gambar, arsip, atau seluruh folder. Pemrosesan batch didukung.",
  "queue.browse": "Klik untuk memilih",
  "queue.addFolder": "Tambah folder",
  "queue.addMoreFiles": "Tambah berkas",

  "actions.encrypt": "Enkripsi",
  "actions.encryptHint": "Kunci ke .aegis",
  "actions.decrypt": "Dekripsi",
  "actions.decryptHint": "Pulihkan berkas asli",

  "status.title": "Status Operasi",
  "status.batchProgress": "Progres batch",
  "status.percentOf": "{percent}% dari {file}",
  "status.idle": "Siaga",
  "status.idleBadge": "SIAGA",
  "status.cancel": "Batal",
  "status.progress": "Progres",
  "status.speed": "Kecepatan",
  "status.eta": "ETA",
  "status.current": "Saat ini",
  "status.processing": "Memproses {file}",
  "status.processingFiles": "Memproses berkas",
  "status.rewrapping": "Membungkus ulang berkas",
  "status.aesLine": "AES-256-GCM / PBKDF2",
  "status.iterations": "600k iterasi",

  "mode.encrypt": "ENKRIPSI",
  "mode.decrypt": "DEKRIPSI",

  "logs.added": "Menambahkan {count} berkas ke antrean.",
  "logs.noneInDrop": "Tidak ada berkas pada drop.",
  "logs.cancelled": "Operasi dibatalkan oleh pengguna.",
  "logs.noFiles": "Tidak ada berkas dalam antrean.",
  "logs.starting": "Memulai {mode}: {name}",
  "logs.success": "{mode} Berhasil: {name}",
  "logs.failed": "Gagal {name}: {error}",
  "logs.systemError": "Galat sistem: {error}",
  "logs.batchComplete": "Pemrosesan batch selesai.",
  "logs.noContainers": "Tidak ada kontainer .aegis dalam antrean untuk di-wrap ulang.",
  "logs.rewrapping": "Membungkus ulang kredensial: {name}",
  "logs.rewrapped": "Berhasil membungkus ulang {name}",
  "logs.rewrapComplete": "Rewrap selesai. Gunakan kata sandi baru untuk dekripsi berikutnya.",

  "files.encrypted": "TERENKRIPSI",
  "files.remove": "Hapus {name}",

  "logBox.title": "Log Operasi",
  "logBox.clear": "Bersihkan",
  "logBox.ready": "Siap menerima operasi...",

  "password.label": "Kata sandi utama",
  "password.placeholder": "Masukkan kata sandi enkripsi",
  "password.required": "Kata sandi wajib diisi",
  "password.chars": "{count} karakter",
  "password.weak": "Lemah",
  "password.fair": "Cukup",
  "password.good": "Baik",
  "password.excellent": "Sangat baik",
  "password.show": "Tampilkan kata sandi",
  "password.hide": "Sembunyikan kata sandi",
  "password.iterations": "PBKDF2 / 600k iterasi",

  "rewrap.title": "Ganti kata sandi",
  "rewrap.description":
    "Membungkus ulang kunci berkas untuk {count} kontainer. Record tidak dienkripsi ulang.",
  "rewrap.newPassword": "Kata sandi baru",
  "rewrap.confirmPassword": "Konfirmasi kata sandi baru",
  "rewrap.confirmPlaceholder": "Ulangi kata sandi baru",
  "rewrap.iterations": "Iterasi PBKDF2",
  "rewrap.iterationsDefault": "600k (default)",
  "rewrap.newKeyfile": "Keyfile baru",
  "rewrap.newKeyfileHint": "Faktor kedua opsional untuk kata sandi baru",
  "rewrap.toggleNewKeyfile": "Aktifkan keyfile baru",
  "rewrap.selectKeyfile": "Pilih keyfile...",
  "rewrap.submit": "Wrap ulang berkas",
  "rewrap.submitting": "Membungkus ulang...",
  "rewrap.cancel": "Batal",
  "rewrap.close": "Tutup dialog ganti kata sandi",
  "rewrap.mismatch": "Kata sandi baru tidak sama.",
  "rewrap.enterPassword": "Masukkan kata sandi baru.",
};

export const translations = { en, id } as const;

export type Locale = keyof typeof translations;
