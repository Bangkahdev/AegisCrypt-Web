import {
  CRYPTO_CONSTANTS,
  EXTENSION_ENCRYPTED,
  FILE_MAGIC,
  FILE_VERSION,
  LEGACY_FILE_VERSION,
  KDF_ID_PBKDF2_SHA256,
  HEADER_LENGTH,
  HEADER_AAD_LENGTH,
  FILE_ID_LENGTH,
  FILE_ID_OFFSET,
  SALT_OFFSET,
  NONCE_PREFIX_OFFSET,
  NONCE_PREFIX_LENGTH,
  WRAP_NONCE_OFFSET,
  WRAPPED_DEK_OFFSET,
  WRAP_TAG_OFFSET,
  FLAG_KEYFILE,
  FLAG_RECOVERY,
  FLAG_FILENAME_METADATA,
  KNOWN_FLAGS,
  RECOVERY_SLOT_LENGTH,
  RECORD_HEADER_LENGTH,
  RECORD_FLAG_FINAL,
  RECORD_KNOWN_FLAGS,
  RECORD_AAD_LENGTH,
  LEGACY_HEADER_LENGTH,
  FILENAME_METADATA_MAX_LENGTH,
  FILENAME_METADATA_LENGTH_BYTES,
  FILENAME_METADATA_INDEX,
  FILENAME_AAD_DOMAIN,
  FILENAME_AAD_LENGTH,
} from "../constants";

/**
 * ==========================================================
 * AEGISCRYPT CRYPTO ENGINE
 * ==========================================================
 *
 * v3 uses envelope encryption:
 *   - a random 256-bit DEK encrypts every record of a single file
 *   - the DEK is wrapped by a KEK derived from password + optional keyfile
 *   - STAR (salt, iterations, file id, chunk size, nonce prefix) live in a
 *     fixed 128-byte header, authenticated as AAD when unwrapping the DEK
 *   - every record is authenticated with a unique derived nonce and an AAD
 *     that binds the record index, length and final flag
 *
 * The legacy v2 container is still readable (fixed 100k iterations, no AAD)
 * but is no longer written.
 */

const webcrypto = globalThis.crypto;

/** Byte buffer backed by a plain ArrayBuffer, as required by WebCrypto. */
type Bytes = Uint8Array<ArrayBuffer>;

// ---------------------------------------------------------------------------
// Errors (kept distinct on purpose; the UI maps them to specific messages)
// ---------------------------------------------------------------------------

export const AegisError = {
  format: "Format file tidak valid (.aegis tidak dikenali).",
  version: (v: number) => `Versi file tidak didukung (v${v}). Perbarui aplikasi.`,
  kdf: "KDF tidak didukung oleh versi aplikasi ini.",
  iterations: "Parameter iterasi KDF di luar batas yang diizinkan.",
  chunkSize: "Ukuran chunk di luar batas yang diizinkan.",
  flags: "Header memuat flag yang tidak dikenal.",
  filenameMetadata: "Metadata nama berkas rusak atau tidak valid.",
  truncated: "Berkas terpotong atau tidak lengkap.",
  missingFinal: "Record final tidak ditemukan; berkas mungkin terpotong.",
  trailing: "Terdapat data setelah record final; berkas dimanipulasi.",
  record: "Struktur record tidak valid; berkas dimanipulasi atau rusak.",
  tampered: "Autentikasi berkas gagal; data dimanipulasi atau rusak.",
  credentials: "Kata sandi atau keyfile salah.",
  legacyCorrupt: "Berkas corrupt: struktur v2 tidak valid.",
  cancelled: "Operation Cancelled",
} as const;

// ---------------------------------------------------------------------------
// Randomness
// ---------------------------------------------------------------------------

export type RandomBytes = (length: number) => Bytes;

const defaultRandomBytes: RandomBytes = (length) =>
  webcrypto.getRandomValues(new Uint8Array(length));

export const generateSalt = (): Bytes =>
  webcrypto.getRandomValues(new Uint8Array(CRYPTO_CONSTANTS.SALT_LENGTH));

export const generateIV = (): Bytes =>
  webcrypto.getRandomValues(new Uint8Array(CRYPTO_CONSTANTS.IV_LENGTH));

// ---------------------------------------------------------------------------
// Key material and KDF
// ---------------------------------------------------------------------------

/**
 * KeyMaterial = PasswordBytes || SHA-256(KeyfileBytes)  (keyfile optional)
 *
 * Passwords may be supplied as UTF-8 bytes so the UI can hold them in a
 * zeroizable buffer instead of an immutable JS string.
 */
export const prepareKeyMaterial = async (
  password: string | Uint8Array,
  keyFileBuffer?: ArrayBuffer | null,
): Promise<Bytes> => {
  const passwordBytes: Bytes =
    typeof password === "string"
      ? new TextEncoder().encode(password)
      : new Uint8Array(password); // copy into a plain ArrayBuffer-backed buffer
  if (!keyFileBuffer) return passwordBytes;

  const keyFileHash = await webcrypto.subtle.digest("SHA-256", keyFileBuffer);
  const combined = new Uint8Array(passwordBytes.length + keyFileHash.byteLength);
  combined.set(passwordBytes, 0);
  combined.set(new Uint8Array(keyFileHash), passwordBytes.length);
  return combined;
};

export const deriveKey = async (
  keyMaterialRaw: Bytes,
  salt: Bytes,
  usage: KeyUsage[],
  iterations: number = CRYPTO_CONSTANTS.PBKDF2_ITERATIONS,
): Promise<CryptoKey> => {
  const keyMaterial = await webcrypto.subtle.importKey(
    "raw",
    keyMaterialRaw,
    { name: CRYPTO_CONSTANTS.ALGORITHM_KDF },
    false,
    ["deriveBits", "deriveKey"],
  );

  return webcrypto.subtle.deriveKey(
    {
      name: CRYPTO_CONSTANTS.ALGORITHM_KDF,
      salt,
      iterations,
      hash: CRYPTO_CONSTANTS.HASH_ALGO,
    },
    keyMaterial,
    { name: CRYPTO_CONSTANTS.ALGORITHM_AES, length: CRYPTO_CONSTANTS.KEY_LENGTH },
    false,
    usage,
  );
};

const importDek = (raw: BufferSource, usage: KeyUsage[]): Promise<CryptoKey> =>
  webcrypto.subtle.importKey(
    "raw",
    raw,
    { name: CRYPTO_CONSTANTS.ALGORITHM_AES },
    false,
    usage,
  );

// ---------------------------------------------------------------------------
// Parameter validation
// ---------------------------------------------------------------------------

const assertIterations = (iterations: number): void => {
  if (
    !Number.isInteger(iterations) ||
    iterations < CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MIN ||
    iterations > CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MAX
  ) {
    throw new Error(AegisError.iterations);
  }
};

const assertChunkSize = (chunkSize: number): void => {
  if (
    !Number.isInteger(chunkSize) ||
    chunkSize < CRYPTO_CONSTANTS.CHUNK_SIZE_MIN ||
    chunkSize > CRYPTO_CONSTANTS.CHUNK_SIZE_MAX
  ) {
    throw new Error(AegisError.chunkSize);
  }
};

// ---------------------------------------------------------------------------
// v3 header helpers
// ---------------------------------------------------------------------------

interface HeaderFields {
  flags: number;
  iterations: number;
  chunkSize: number;
  salt: Bytes;
  fileId: Bytes;
  noncePrefix: Bytes;
  wrapNonce: Bytes;
  wrappedDek: Bytes;
  wrapTag: Bytes;
}

interface ParsedHeader extends HeaderFields {
  /** Offset directly after the fixed header and optional recovery slot. */
  metadataOffset: number;
}

const buildHeader = (fields: HeaderFields): Bytes => {
  const header = new Uint8Array(HEADER_LENGTH);
  header.set(FILE_MAGIC, 0);
  header[5] = FILE_VERSION;
  header[6] = KDF_ID_PBKDF2_SHA256;
  header[7] = fields.flags;

  const view = new DataView(header.buffer);
  view.setUint32(8, fields.iterations, false);
  view.setUint32(12, fields.chunkSize, false);

  header.set(fields.salt, SALT_OFFSET);
  header.set(fields.fileId, FILE_ID_OFFSET);
  header.set(fields.noncePrefix, NONCE_PREFIX_OFFSET);
  header.set(fields.wrapNonce, WRAP_NONCE_OFFSET);
  header.set(fields.wrappedDek, WRAPPED_DEK_OFFSET);
  header.set(fields.wrapTag, WRAP_TAG_OFFSET);

  return header;
};

const assertMagic = (bytes: Bytes): void => {
  if (bytes.byteLength < FILE_MAGIC.byteLength) throw new Error(AegisError.format);
  for (let i = 0; i < FILE_MAGIC.byteLength; i++) {
    if (bytes[i] !== FILE_MAGIC[i]) throw new Error(AegisError.format);
  }
};

/**
 * Validates the entire fixed header before any KDF work is performed.
 * Rejects unknown flags, reserved bits, out-of-range parameters and
 * unsupported KDF identifiers.
 */
const parseHeader = (bytes: Bytes): ParsedHeader => {
  assertMagic(bytes);
  if (bytes.byteLength < HEADER_LENGTH) throw new Error(AegisError.truncated);

  if (bytes[5] !== FILE_VERSION) throw new Error(AegisError.version(bytes[5]));
  if (bytes[6] !== KDF_ID_PBKDF2_SHA256) throw new Error(AegisError.kdf);

  const flags = bytes[7];
  if ((flags & ~KNOWN_FLAGS) !== 0) throw new Error(AegisError.flags);

  const view = new DataView(bytes.buffer, bytes.byteOffset, HEADER_LENGTH);
  const iterations = view.getUint32(8, false);
  const chunkSize = view.getUint32(12, false);
  assertIterations(iterations);
  assertChunkSize(chunkSize);

  const metadataOffset =
    HEADER_LENGTH + (flags & FLAG_RECOVERY ? RECOVERY_SLOT_LENGTH : 0);

  return {
    flags,
    iterations,
    chunkSize,
    salt: bytes.slice(SALT_OFFSET, SALT_OFFSET + CRYPTO_CONSTANTS.SALT_LENGTH),
    fileId: bytes.slice(FILE_ID_OFFSET, FILE_ID_OFFSET + FILE_ID_LENGTH),
    noncePrefix: bytes.slice(NONCE_PREFIX_OFFSET, NONCE_PREFIX_OFFSET + NONCE_PREFIX_LENGTH),
    wrapNonce: bytes.slice(WRAP_NONCE_OFFSET, WRAP_NONCE_OFFSET + CRYPTO_CONSTANTS.IV_LENGTH),
    wrappedDek: bytes.slice(WRAPPED_DEK_OFFSET, WRAPPED_DEK_OFFSET + CRYPTO_CONSTANTS.DEK_LENGTH),
    wrapTag: bytes.slice(WRAP_TAG_OFFSET, WRAP_TAG_OFFSET + CRYPTO_CONSTANTS.TAG_LENGTH_BYTES),
    metadataOffset,
  };
};

const makeNonce = (prefix: Bytes, index: bigint): Bytes => {
  const nonce = new Uint8Array(CRYPTO_CONSTANTS.IV_LENGTH);
  nonce.set(prefix, 0);
  new DataView(nonce.buffer).setBigUint64(4, index, false);
  return nonce;
};

const makeRecordNonce = (prefix: Bytes, index: number): Bytes =>
  makeNonce(prefix, BigInt(index));

const makeFilenameAad = (
  fileId: Bytes,
  noncePrefix: Bytes,
  ciphertextLength: number,
): Bytes => {
  const aad = new Uint8Array(FILENAME_AAD_LENGTH);
  aad.set(FILE_MAGIC, 0); // 0..4
  aad[5] = FILE_VERSION; // 5
  aad.set(fileId, 6); // 6..21
  aad.set(noncePrefix, 22); // 22..25
  aad.set(FILENAME_AAD_DOMAIN, 26); // 26..33
  new DataView(aad.buffer).setUint16(34, ciphertextLength, false); // 34..35
  return aad;
};

const assertFilename = (filename: string): Bytes => {
  if (typeof filename !== "string") throw new Error(AegisError.filenameMetadata);
  const bytes = new TextEncoder().encode(filename);
  if (bytes.byteLength === 0 || bytes.byteLength > FILENAME_METADATA_MAX_LENGTH) {
    throw new Error(AegisError.filenameMetadata);
  }
  return bytes;
};

const encryptFilename = async (
  dek: CryptoKey,
  fileId: Bytes,
  noncePrefix: Bytes,
  filename: string,
): Promise<Bytes> => {
  const plaintext = assertFilename(filename);
  const ciphertextLength = plaintext.byteLength + CRYPTO_CONSTANTS.TAG_LENGTH_BYTES;

  const ciphertext = new Uint8Array(
    await webcrypto.subtle.encrypt(
      {
        name: CRYPTO_CONSTANTS.ALGORITHM_AES,
        iv: makeNonce(noncePrefix, FILENAME_METADATA_INDEX),
        additionalData: makeFilenameAad(fileId, noncePrefix, ciphertextLength),
        tagLength: CRYPTO_CONSTANTS.TAG_LENGTH_BITS,
      },
      dek,
      plaintext,
    ),
  );

  const block = new Uint8Array(FILENAME_METADATA_LENGTH_BYTES + ciphertext.byteLength);
  new DataView(block.buffer).setUint16(0, ciphertext.byteLength, false);
  block.set(ciphertext, FILENAME_METADATA_LENGTH_BYTES);
  return block;
};

const decryptFilename = async (
  reader: { size: number; read(offset: number, length: number): Promise<Bytes> },
  offset: number,
  header: ParsedHeader,
  dek: CryptoKey,
): Promise<{ filename: string; blockLength: number }> => {
  if (reader.size - offset < FILENAME_METADATA_LENGTH_BYTES) {
    throw new Error(AegisError.truncated);
  }

  const lengthBytes = await reader.read(offset, FILENAME_METADATA_LENGTH_BYTES);
  const ciphertextLength = new DataView(
    lengthBytes.buffer,
    lengthBytes.byteOffset,
    FILENAME_METADATA_LENGTH_BYTES,
  ).getUint16(0, false);

  if (
    ciphertextLength < CRYPTO_CONSTANTS.TAG_LENGTH_BYTES ||
    ciphertextLength > FILENAME_METADATA_MAX_LENGTH + CRYPTO_CONSTANTS.TAG_LENGTH_BYTES
  ) {
    throw new Error(AegisError.filenameMetadata);
  }
  if (reader.size - offset - FILENAME_METADATA_LENGTH_BYTES < ciphertextLength) {
    throw new Error(AegisError.truncated);
  }

  const ciphertext = await reader.read(
    offset + FILENAME_METADATA_LENGTH_BYTES,
    ciphertextLength,
  );

  let plaintext: Bytes;
  try {
    plaintext = new Uint8Array(
      await webcrypto.subtle.decrypt(
        {
          name: CRYPTO_CONSTANTS.ALGORITHM_AES,
          iv: makeNonce(header.noncePrefix, FILENAME_METADATA_INDEX),
          additionalData: makeFilenameAad(header.fileId, header.noncePrefix, ciphertextLength),
          tagLength: CRYPTO_CONSTANTS.TAG_LENGTH_BITS,
        },
        dek,
        ciphertext,
      ),
    );
  } catch {
    throw new Error(AegisError.tampered);
  }

  let filename: string;
  try {
    filename = new TextDecoder("utf-8", { fatal: true }).decode(plaintext);
  } catch {
    throw new Error(AegisError.filenameMetadata);
  }

  if (
    filename.length === 0 ||
    filename.includes("\u0000") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    throw new Error(AegisError.filenameMetadata);
  }

  return {
    filename,
    blockLength: FILENAME_METADATA_LENGTH_BYTES + ciphertextLength,
  };
};

const resolveRecordsOffset = async (
  reader: { size: number; read(offset: number, length: number): Promise<Bytes> },
  header: ParsedHeader,
  dek: CryptoKey,
): Promise<{ recordsOffset: number; filename: string | null }> => {
  let offset = header.metadataOffset;
  if (reader.size < offset) throw new Error(AegisError.truncated);

  if (!(header.flags & FLAG_FILENAME_METADATA)) {
    return { recordsOffset: offset, filename: null };
  }

  const metadata = await decryptFilename(reader, offset, header, dek);
  return {
    recordsOffset: offset + metadata.blockLength,
    filename: metadata.filename,
  };
};

const makeRecordAad = (
  chunkSize: number,
  fileId: Bytes,
  noncePrefix: Bytes,
  recordHeader: Bytes,
  index: number,
): Bytes => {
  const aad = new Uint8Array(RECORD_AAD_LENGTH);
  aad.set(FILE_MAGIC, 0); // 0..4
  aad[5] = FILE_VERSION; // 5
  new DataView(aad.buffer).setUint32(6, chunkSize, false); // 6..9
  aad.set(fileId, 10); // 10..25
  aad.set(noncePrefix, 26); // 26..29
  aad.set(recordHeader, 30); // 30..34
  new DataView(aad.buffer).setBigUint64(35, BigInt(index), false); // 35..42
  return aad;
};

const unwrapDekRaw = async (
  header: ParsedHeader,
  keyMaterial: Bytes,
): Promise<ArrayBuffer> => {
  const kek = await deriveKey(keyMaterial, header.salt, ["decrypt"], header.iterations);

  const sealed = new Uint8Array(
    CRYPTO_CONSTANTS.DEK_LENGTH + CRYPTO_CONSTANTS.TAG_LENGTH_BYTES,
  );
  sealed.set(header.wrappedDek, 0);
  sealed.set(header.wrapTag, CRYPTO_CONSTANTS.DEK_LENGTH);

  const aad = new Uint8Array(HEADER_AAD_LENGTH);
  aad.set(FILE_MAGIC, 0);
  aad[5] = FILE_VERSION;
  aad[6] = KDF_ID_PBKDF2_SHA256;
  aad[7] = header.flags;
  new DataView(aad.buffer).setUint32(8, header.iterations, false);
  new DataView(aad.buffer).setUint32(12, header.chunkSize, false);
  aad.set(header.salt, SALT_OFFSET);
  aad.set(header.fileId, FILE_ID_OFFSET);
  aad.set(header.noncePrefix, NONCE_PREFIX_OFFSET);

  try {
    return await webcrypto.subtle.decrypt(
      {
        name: CRYPTO_CONSTANTS.ALGORITHM_AES,
        iv: header.wrapNonce,
        additionalData: aad,
        tagLength: CRYPTO_CONSTANTS.TAG_LENGTH_BITS,
      },
      kek,
      sealed,
    );
  } catch {
    throw new Error(AegisError.credentials);
  }
};

// ---------------------------------------------------------------------------
// Reader abstraction (Blob => true streaming, ArrayBuffer => zero-copy views)
// ---------------------------------------------------------------------------

interface Reader {
  size: number;
  read(offset: number, length: number): Promise<Bytes>;
}

const makeReader = (source: Blob | ArrayBuffer): Reader => {
  if (typeof Blob !== "undefined" && source instanceof Blob) {
    const blob = source;
    return {
      size: blob.size,
      async read(offset, length) {
        const end = Math.min(offset + length, blob.size);
        if (end <= offset) return new Uint8Array(0);
        return new Uint8Array(await blob.slice(offset, end).arrayBuffer());
      },
    };
  }

  const view = new Uint8Array(source as ArrayBuffer);
  return {
    size: view.byteLength,
    async read(offset, length) {
      const end = Math.min(offset + length, view.byteLength);
      if (end <= offset) return new Uint8Array(0);
      return view.subarray(offset, end);
    },
  };
};

// ---------------------------------------------------------------------------
// Output sinks
// ---------------------------------------------------------------------------

export interface DecryptSink {
  write(chunk: Bytes): Promise<void> | void;
  finalize(): Promise<Blob> | Blob;
  abort?(): Promise<void> | void;
  /** OPFS temp file name, when the sink spilled to disk. */
  tempName?: string;
}

/** In-memory sink. Peak JS heap grows with the output size. */
export const createBlobSink = (): DecryptSink => {
  const parts: BlobPart[] = [];
  return {
    write(chunk) {
      parts.push(chunk as BlobPart);
    },
    finalize() {
      return new Blob(parts, { type: "application/octet-stream" });
    },
  };
};

/**
 * Origin Private File System sink. Writes plaintext to a temporary file so
 * peak memory stays bounded. Cleanup is deferred so the download can read the
 * file; it runs on page hide or after a timeout, whichever comes first.
 * Falls back to the in-memory sink when OPFS is unavailable.
 */
const createOpfsSink = async (): Promise<DecryptSink | null> => {
  const storage = (globalThis.navigator as any)?.storage;
  if (!storage || typeof storage.getDirectory !== "function") return null;

  try {
    const root = await storage.getDirectory();
    const name = `.aegis-tmp-${webcrypto.randomUUID()}`;
    const handle = await root.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      void root.removeEntry(name).catch(() => {
        /* best effort */
      });
    };
    const scheduleCleanup = () => {
      setTimeout(cleanup, 60_000);
      globalThis.addEventListener?.("pagehide", cleanup, { once: true });
    };

    return {
      tempName: name,
      async write(chunk) {
        await writable.write(chunk);
      },
      async finalize() {
        await writable.close();
        const file = await handle.getFile();
        scheduleCleanup();
        return file;
      },
      async abort() {
        try {
          await writable.abort();
        } catch {
          /* best effort */
        }
        cleanup();
      },
    };
  } catch {
    return null;
  }
};

export const createDefaultSink = async (): Promise<DecryptSink> =>
  (await createOpfsSink()) ?? createBlobSink();

const yieldToEventLoop = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

// ---------------------------------------------------------------------------
// Encryption (v3 only)
// ---------------------------------------------------------------------------

export interface EncryptOptions {
  iterations?: number;
  chunkSize?: number;
  /** Encrypt the original filename into the container (flag bit2). */
  filename?: string | null;
  /** Deterministic RNG injection for test vectors / property tests. */
  randomBytes?: RandomBytes;
}

export const processFileEncrypt = async (
  file: Blob,
  password: string | Uint8Array,
  keyFileBuffer: ArrayBuffer | null,
  signal: AbortSignal,
  onProgress: (bytes: number) => void,
  options: EncryptOptions = {},
): Promise<Blob> => {
  const iterations = options.iterations ?? CRYPTO_CONSTANTS.PBKDF2_ITERATIONS;
  const chunkSize = options.chunkSize ?? CRYPTO_CONSTANTS.CHUNK_SIZE;
  const randomBytes = options.randomBytes ?? defaultRandomBytes;

  assertIterations(iterations);
  assertChunkSize(chunkSize);

  const salt = randomBytes(CRYPTO_CONSTANTS.SALT_LENGTH);
  const dekRaw = randomBytes(CRYPTO_CONSTANTS.DEK_LENGTH);
  const fileId = randomBytes(FILE_ID_LENGTH);
  const noncePrefix = randomBytes(NONCE_PREFIX_LENGTH);
  const wrapNonce = randomBytes(CRYPTO_CONSTANTS.IV_LENGTH);

  const keyMaterial = await prepareKeyMaterial(password, keyFileBuffer);
  const kek = await deriveKey(keyMaterial, salt, ["encrypt"], iterations);
  const dek = await importDek(dekRaw, ["encrypt"]);

  const flags =
    (keyFileBuffer ? FLAG_KEYFILE : 0) |
    (options.filename != null ? FLAG_FILENAME_METADATA : 0);
  if (options.filename != null) assertFilename(options.filename);

  const header = buildHeader({
    flags,
    iterations,
    chunkSize,
    salt,
    fileId,
    noncePrefix,
    wrapNonce,
    wrappedDek: new Uint8Array(CRYPTO_CONSTANTS.DEK_LENGTH),
    wrapTag: new Uint8Array(CRYPTO_CONSTANTS.TAG_LENGTH_BYTES),
  });

  const wrapped = new Uint8Array(
    await webcrypto.subtle.encrypt(
      {
        name: CRYPTO_CONSTANTS.ALGORITHM_AES,
        iv: wrapNonce,
        additionalData: header.subarray(0, HEADER_AAD_LENGTH),
        tagLength: CRYPTO_CONSTANTS.TAG_LENGTH_BITS,
      },
      kek,
      dekRaw,
    ),
  );
  header.set(wrapped.subarray(0, CRYPTO_CONSTANTS.DEK_LENGTH), WRAPPED_DEK_OFFSET);
  header.set(
    wrapped.subarray(CRYPTO_CONSTANTS.DEK_LENGTH),
    WRAP_TAG_OFFSET,
  );

  const parts: BlobPart[] = [header];
  if (options.filename != null) {
    parts.push(await encryptFilename(dek, fileId, noncePrefix, options.filename));
  }
  const totalSize = file.size;

  const encryptRecord = async (
    index: number,
    plaintext: Bytes,
    isFinal: boolean,
  ): Promise<Bytes> => {
    const recordHeader = new Uint8Array(RECORD_HEADER_LENGTH);
    recordHeader[0] = isFinal ? RECORD_FLAG_FINAL : 0;
    new DataView(recordHeader.buffer).setUint32(
      1,
      plaintext.byteLength + CRYPTO_CONSTANTS.TAG_LENGTH_BYTES,
      false,
    );

    const nonce = makeRecordNonce(noncePrefix, index);
    const aad = makeRecordAad(chunkSize, fileId, noncePrefix, recordHeader, index);

    const ciphertext = new Uint8Array(
      await webcrypto.subtle.encrypt(
        {
          name: CRYPTO_CONSTANTS.ALGORITHM_AES,
          iv: nonce,
          additionalData: aad,
          tagLength: CRYPTO_CONSTANTS.TAG_LENGTH_BITS,
        },
        dek,
        plaintext,
      ),
    );

    const record = new Uint8Array(RECORD_HEADER_LENGTH + ciphertext.byteLength);
    record.set(recordHeader, 0);
    record.set(ciphertext, RECORD_HEADER_LENGTH);
    return record;
  };

  if (totalSize === 0) {
    // Empty file => exactly one final record containing only the GCM tag.
    parts.push(await encryptRecord(0, new Uint8Array(0), true));
    onProgress(0);
    return new Blob(parts, { type: "application/octet-stream" });
  }

  let offset = 0;
  let index = 0;
  while (offset < totalSize) {
    if (signal.aborted) throw new Error(AegisError.cancelled);

    const end = Math.min(offset + chunkSize, totalSize);
    const plaintext = new Uint8Array(await file.slice(offset, end).arrayBuffer());
    const isFinal = end === totalSize;

    parts.push(await encryptRecord(index, plaintext, isFinal));

    offset = end;
    index += 1;
    onProgress(offset);
    await yieldToEventLoop();
  }

  return new Blob(parts, { type: "application/octet-stream" });
};

// ---------------------------------------------------------------------------
// Decryption
// ---------------------------------------------------------------------------

export interface DecryptOptions {
  /** Explicit sink (tests); defaults to OPFS when available, else memory. */
  sink?: DecryptSink;
  /** Called with the encrypted filename when the container stores one. */
  onFilename?: (filename: string) => void;
}

const decryptLegacyV2 = async (
  reader: Reader,
  password: string | Uint8Array,
  keyFileBuffer: ArrayBuffer | null,
  signal: AbortSignal,
  onProgress: (bytes: number) => void,
  sink: DecryptSink,
): Promise<Blob> => {
  if (reader.size < LEGACY_HEADER_LENGTH) throw new Error(AegisError.truncated);

  const header = await reader.read(0, LEGACY_HEADER_LENGTH);
  assertMagic(header);
  const salt = header.slice(6, 6 + CRYPTO_CONSTANTS.SALT_LENGTH);

  const keyMaterial = await prepareKeyMaterial(password, keyFileBuffer);
  const key = await deriveKey(
    keyMaterial,
    salt,
    ["decrypt"],
    CRYPTO_CONSTANTS.LEGACY_PBKDF2_ITERATIONS,
  );

  let offset = LEGACY_HEADER_LENGTH;
  try {
    while (offset < reader.size) {
      if (signal.aborted) throw new Error(AegisError.cancelled);
      if (reader.size - offset < 4) throw new Error(AegisError.legacyCorrupt);

      const lengthBytes = await reader.read(offset, 4);
      const chunkLength = new DataView(
        lengthBytes.buffer,
        lengthBytes.byteOffset,
        4,
      ).getInt32(0, true);

      const minimum = CRYPTO_CONSTANTS.IV_LENGTH + CRYPTO_CONSTANTS.TAG_LENGTH_BYTES;
      if (chunkLength < minimum) throw new Error(AegisError.legacyCorrupt);
      if (reader.size - offset - 4 < chunkLength) throw new Error(AegisError.legacyCorrupt);

      const payload = await reader.read(offset + 4, chunkLength);
      const iv = payload.subarray(0, CRYPTO_CONSTANTS.IV_LENGTH);
      const ciphertext = payload.subarray(CRYPTO_CONSTANTS.IV_LENGTH);

      try {
        const plaintext = new Uint8Array(
          await webcrypto.subtle.decrypt(
            { name: CRYPTO_CONSTANTS.ALGORITHM_AES, iv },
            key,
            ciphertext,
          ),
        );
        await sink.write(plaintext);
      } catch {
        throw new Error(AegisError.credentials);
      }

      offset += 4 + chunkLength;
      onProgress(offset);
      await yieldToEventLoop();
    }

    return await sink.finalize();
  } catch (error) {
    await sink.abort?.();
    throw error;
  }
};

/**
 * Decrypts a v3 (or legacy v2) container.
 *
 * `source` may be a Blob/File (streamed, constant memory) or an ArrayBuffer.
 * Output is written to a sink and only finalized after the final record has
 * been authenticated; on any failure the partial output is discarded.
 */
export const processFileDecrypt = async (
  source: Blob | ArrayBuffer,
  password: string | Uint8Array,
  keyFileBuffer: ArrayBuffer | null,
  signal: AbortSignal,
  onProgress: (bytes: number) => void,
  options: DecryptOptions = {},
): Promise<Blob> => {
  const reader = makeReader(source);

  const prefixBytes = await reader.read(0, 6);
  assertMagic(prefixBytes);
  if (prefixBytes.byteLength < 6) throw new Error(AegisError.truncated);

  const version = prefixBytes[5];
  const sink = options.sink ?? (await createDefaultSink());

  if (version === LEGACY_FILE_VERSION) {
    return decryptLegacyV2(reader, password, keyFileBuffer, signal, onProgress, sink);
  }
  if (version !== FILE_VERSION) throw new Error(AegisError.version(version));

  const headerBytes = await reader.read(0, HEADER_LENGTH);
  const header = parseHeader(headerBytes);

  if (reader.size < header.metadataOffset) throw new Error(AegisError.truncated);

  const keyMaterial = await prepareKeyMaterial(password, keyFileBuffer);
  const dekRaw = await unwrapDekRaw(header, keyMaterial);
  const dek = await importDek(dekRaw, ["decrypt"]);

  const { recordsOffset, filename } = await resolveRecordsOffset(reader, header, dek);
  if (filename) options.onFilename?.(filename);

  let offset = recordsOffset;
  let index = 0;
  let sawFinal = false;

  try {
    while (offset < reader.size) {
      if (signal.aborted) throw new Error(AegisError.cancelled);

      if (reader.size - offset < RECORD_HEADER_LENGTH) {
        throw new Error(AegisError.truncated);
      }

      const recordHeader = await reader.read(offset, RECORD_HEADER_LENGTH);
      const recordFlags = recordHeader[0];
      if ((recordFlags & ~RECORD_KNOWN_FLAGS) !== 0) throw new Error(AegisError.record);

      const isFinal = (recordFlags & RECORD_FLAG_FINAL) !== 0;
      const ciphertextLength = new DataView(
        recordHeader.buffer,
        recordHeader.byteOffset,
        RECORD_HEADER_LENGTH,
      ).getUint32(1, false);

      if (ciphertextLength < CRYPTO_CONSTANTS.TAG_LENGTH_BYTES) {
        throw new Error(AegisError.record);
      }
      if (ciphertextLength > header.chunkSize + CRYPTO_CONSTANTS.TAG_LENGTH_BYTES) {
        throw new Error(AegisError.record);
      }
      if (!isFinal && ciphertextLength !== header.chunkSize + CRYPTO_CONSTANTS.TAG_LENGTH_BYTES) {
        throw new Error(AegisError.record);
      }
      if (reader.size - offset - RECORD_HEADER_LENGTH < ciphertextLength) {
        throw new Error(AegisError.truncated);
      }

      const ciphertext = await reader.read(offset + RECORD_HEADER_LENGTH, ciphertextLength);
      const nonce = makeRecordNonce(header.noncePrefix, index);
      const aad = makeRecordAad(
        header.chunkSize,
        header.fileId,
        header.noncePrefix,
        recordHeader,
        index,
      );

      let plaintext: Bytes;
      try {
        plaintext = new Uint8Array(
          await webcrypto.subtle.decrypt(
            {
              name: CRYPTO_CONSTANTS.ALGORITHM_AES,
              iv: nonce,
              additionalData: aad,
              tagLength: CRYPTO_CONSTANTS.TAG_LENGTH_BITS,
            },
            dek,
            ciphertext,
          ),
        );
      } catch {
        throw new Error(AegisError.tampered);
      }

      await sink.write(plaintext);

      offset += RECORD_HEADER_LENGTH + ciphertextLength;
      index += 1;
      onProgress(offset);

      if (isFinal) {
        sawFinal = true;
        break;
      }

      await yieldToEventLoop();
    }

    if (!sawFinal) throw new Error(AegisError.missingFinal);
    if (offset !== reader.size) throw new Error(AegisError.trailing);

    return await sink.finalize();
  } catch (error) {
    await sink.abort?.();
    throw error;
  }
};

// ---------------------------------------------------------------------------
// Header rewrap (change password / keyfile without re-encrypting payload)
// ---------------------------------------------------------------------------

export interface RewrapOptions {
  iterations?: number;
  randomBytes?: RandomBytes;
}

/**
 * Re-wraps the per-file DEK under a new password/keyfile. Only the header is
 * rewritten; every record is copied byte-for-byte unchanged.
 */
export const rewrapFile = async (
  source: Blob | ArrayBuffer,
  oldPassword: string | Uint8Array,
  oldKeyFile: ArrayBuffer | null,
  newPassword: string | Uint8Array,
  newKeyFile: ArrayBuffer | null,
  options: RewrapOptions = {},
): Promise<Blob> => {
  const reader = makeReader(source);
  const prefixBytes = await reader.read(0, 6);
  assertMagic(prefixBytes);
  if (prefixBytes.byteLength < 6) throw new Error(AegisError.truncated);
  if (prefixBytes[5] !== FILE_VERSION) throw new Error(AegisError.version(prefixBytes[5]));

  const headerBytes = await reader.read(0, HEADER_LENGTH);
  const header = parseHeader(headerBytes);
  if (reader.size < header.metadataOffset) throw new Error(AegisError.truncated);

  const oldMaterial = await prepareKeyMaterial(oldPassword, oldKeyFile);
  const dekRaw = await unwrapDekRaw(header, oldMaterial);

  // Validate the metadata block (if any) before copying the tail verbatim.
  const dek = await importDek(dekRaw, ["decrypt"]);
  await resolveRecordsOffset(reader, header, dek);

  const iterations = options.iterations ?? header.iterations;
  const randomBytes = options.randomBytes ?? defaultRandomBytes;
  assertIterations(iterations);

  const salt = randomBytes(CRYPTO_CONSTANTS.SALT_LENGTH);
  const wrapNonce = randomBytes(CRYPTO_CONSTANTS.IV_LENGTH);
  const flags =
    (newKeyFile ? FLAG_KEYFILE : 0) |
    (header.flags & (FLAG_RECOVERY | FLAG_FILENAME_METADATA));

  const newHeader = buildHeader({
    flags,
    iterations,
    chunkSize: header.chunkSize,
    salt,
    fileId: header.fileId,
    noncePrefix: header.noncePrefix,
    wrapNonce,
    wrappedDek: new Uint8Array(CRYPTO_CONSTANTS.DEK_LENGTH),
    wrapTag: new Uint8Array(CRYPTO_CONSTANTS.TAG_LENGTH_BYTES),
  });

  const newMaterial = await prepareKeyMaterial(newPassword, newKeyFile);
  const newKek = await deriveKey(newMaterial, salt, ["encrypt"], iterations);

  const wrapped = new Uint8Array(
    await webcrypto.subtle.encrypt(
      {
        name: CRYPTO_CONSTANTS.ALGORITHM_AES,
        iv: wrapNonce,
        additionalData: newHeader.subarray(0, HEADER_AAD_LENGTH),
        tagLength: CRYPTO_CONSTANTS.TAG_LENGTH_BITS,
      },
      newKek,
      dekRaw,
    ),
  );
  newHeader.set(wrapped.subarray(0, CRYPTO_CONSTANTS.DEK_LENGTH), WRAPPED_DEK_OFFSET);
  newHeader.set(wrapped.subarray(CRYPTO_CONSTANTS.DEK_LENGTH), WRAP_TAG_OFFSET);

  const parts: BlobPart[] = [newHeader];

  // Recovery slot and encrypted filename metadata are DEK-protected, so they
  // are copied unchanged alongside the payload records.
  if (!(source instanceof Blob)) {
    const view = new Uint8Array(source as ArrayBuffer);
    parts.push(view.subarray(header.metadataOffset));
    return new Blob(parts, { type: "application/octet-stream" });
  }

  parts.push(source.slice(header.metadataOffset));
  return new Blob(parts, { type: "application/octet-stream" });
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export const downloadBlob = (data: Blob | ArrayBuffer, filename: string) => {
  const blob =
    data instanceof Blob ? data : new Blob([data], { type: "application/octet-stream" });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke later: some browsers cancel a download when the URL is revoked in
  // the same task (notably for File objects backed by OPFS).
  setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
};

export const getEncryptedFilename = (originalName: string): string =>
  `${originalName}${EXTENSION_ENCRYPTED}`;

export const getDecryptedFilename = (encryptedName: string): string => {
  return encryptedName.endsWith(EXTENSION_ENCRYPTED)
    ? encryptedName.slice(0, -EXTENSION_ENCRYPTED.length)
    : `decrypted_${encryptedName}`;
};
