import {
  CRYPTO_CONSTANTS,
  FILE_MAGIC,
  HEADER_LENGTH,
  LEGACY_HEADER_LENGTH,
  RECORD_HEADER_LENGTH,
} from "../src/constants";

export type Bytes = Uint8Array<ArrayBuffer>;

export const toBytes = async (blob: Blob): Promise<Bytes> =>
  new Uint8Array(await blob.arrayBuffer());

export const hex = (bytes: Bytes): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

export const fromHex = (value: string): Bytes => {
  const clean = value.replace(/\s+/g, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};

export const concat = (...parts: Bytes[]): Bytes => {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
};

/** Deterministic byte stream so encryption output can be reproduced exactly. */
export const makeRng = (seed = 7) => {
  let counter = seed;
  return (length: number): Bytes => {
    const out = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      out[i] = (counter * 31 + 7) & 0xff;
      counter += 1;
    }
    return out;
  };
};

export interface V3RecordInfo {
  offset: number;
  length: number;
  isFinal: boolean;
  ciphertextLength: number;
}

/** Walks a v3 container and returns record offsets. Adds nothing to the format. */
export const listV3Records = (container: Bytes): V3RecordInfo[] => {
  const records: V3RecordInfo[] = [];
  let offset = HEADER_LENGTH;
  while (offset < container.byteLength) {
    const view = new DataView(
      container.buffer,
      container.byteOffset + offset,
      RECORD_HEADER_LENGTH,
    );
    const flags = container[offset];
    const ciphertextLength = view.getUint32(1, false);
    const length = RECORD_HEADER_LENGTH + ciphertextLength;
    records.push({
      offset,
      length,
      isFinal: (flags & 0x01) !== 0,
      ciphertextLength,
    });
    offset += length;
  }
  return records;
};

/**
 * Independent legacy v2 encoder. Built directly with WebCrypto so the v2
 * reader is verified against bytes it did not produce itself.
 */
export const buildLegacyV2 = async (
  plaintext: Bytes,
  password: string,
  salt: Bytes,
  ivs: Bytes[],
  chunkSize: number = CRYPTO_CONSTANTS.CHUNK_SIZE,
  keyFileBuffer: ArrayBuffer | null = null,
): Promise<Bytes> => {
  const passwordBytes = new TextEncoder().encode(password);
  let materialBytes = passwordBytes;
  if (keyFileBuffer) {
    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", keyFileBuffer));
    materialBytes = new Uint8Array(passwordBytes.length + hash.length);
    materialBytes.set(passwordBytes, 0);
    materialBytes.set(hash, passwordBytes.length);
  }
  const material = await crypto.subtle.importKey("raw", materialBytes, "PBKDF2", false, [
    "deriveKey",
  ]);
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: CRYPTO_CONSTANTS.LEGACY_PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );

  const header = new Uint8Array(LEGACY_HEADER_LENGTH);
  header.set(FILE_MAGIC, 0);
  header[5] = 2;
  header.set(salt, 6);

  const parts: Bytes[] = [header];
  let offset = 0;
  let index = 0;
  while (offset < plaintext.byteLength) {
    const end = Math.min(offset + chunkSize, plaintext.byteLength);
    const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: ivs[index] },
        key,
        plaintext.subarray(offset, end),
      ),
    );
    const record = new Uint8Array(4 + CRYPTO_CONSTANTS.IV_LENGTH + ciphertext.byteLength);
    new DataView(record.buffer).setInt32(
      0,
      CRYPTO_CONSTANTS.IV_LENGTH + ciphertext.byteLength,
      true,
    );
    record.set(ivs[index], 4);
    record.set(ciphertext, 4 + CRYPTO_CONSTANTS.IV_LENGTH);
    parts.push(record);

    offset = end;
    index += 1;
  }

  return concat(...parts);
};

export const patternBytes = (length: number, seed = 0): Bytes => {
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i++) out[i] = (i + seed) & 0xff;
  return out;
};
