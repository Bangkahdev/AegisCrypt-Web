import { describe, expect, it } from "vitest";
import {
  CRYPTO_CONSTANTS,
  FILENAME_METADATA_LENGTH_BYTES,
  HEADER_LENGTH,
  RECORD_HEADER_LENGTH,
} from "../../src/constants";
import { AegisError, processFileDecrypt, processFileEncrypt } from "../../src/services/cryptoService";
import { concat, patternBytes, toBytes, type Bytes } from "../helpers";

const CHUNK = CRYPTO_CONSTANTS.CHUNK_SIZE_MIN;
const FAST = { iterations: CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_MIN, chunkSize: CHUNK };

const encrypt = async (data: Bytes, filename?: string): Promise<Bytes> =>
  toBytes(
    await processFileEncrypt(
      new Blob([data]),
      "pw",
      null,
      new AbortController().signal,
      () => {},
      { ...FAST, filename },
    ),
  );

const expectError = async (bytes: Bytes, message: string) => {
  await expect(
    processFileDecrypt(new Blob([bytes]), "pw", null, new AbortController().signal, () => {}),
  ).rejects.toThrow(message);
};

const view = (bytes: Bytes) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

describe("header flag hardening", () => {
  it.each([0x08, 0x10, 0x20, 0x80, 0xff])("rejects reserved header flag bits %i", async (flag) => {
    const bytes = await encrypt(patternBytes(8));
    bytes[7] = flag;
    await expectError(bytes, AegisError.flags);
  });

  it.each([0x04, 0x05])("authenticates known header flag bits %i", async (flag) => {
    const bytes = await encrypt(patternBytes(8));
    bytes[7] = flag;
    await expectError(bytes, AegisError.credentials);
  });

  it("requires a recovery slot when the recovery flag is set", async () => {
    const bytes = await encrypt(patternBytes(8));
    bytes[7] = 0x02;
    await expectError(bytes, AegisError.truncated);
  });
});

describe("parameter hardening", () => {
  it("rejects a chunk size above the allowed maximum", async () => {
    const bytes = await encrypt(patternBytes(8));
    view(bytes).setUint32(12, CRYPTO_CONSTANTS.CHUNK_SIZE_MAX + 1, false);
    await expectError(bytes, AegisError.chunkSize);
  });

  it("rejects a chunk size of zero", async () => {
    const bytes = await encrypt(patternBytes(8));
    view(bytes).setUint32(12, 0, false);
    await expectError(bytes, AegisError.chunkSize);
  });
});

describe("record structure hardening", () => {
  it("rejects a zero-length ciphertext in a non-final record", async () => {
    const bytes = await encrypt(patternBytes(CHUNK));
    bytes[HEADER_LENGTH] &= ~0x01;
    view(bytes).setUint32(HEADER_LENGTH + 1, 0, false);
    await expectError(bytes, AegisError.record);
  });

  it("rejects a record length of 0xffffffff without attempting to allocate it", async () => {
    const bytes = await encrypt(patternBytes(8));
    view(bytes).setUint32(HEADER_LENGTH + 1, 0xffffffff, false);
    await expectError(bytes, AegisError.record);
  });

  it("rejects a final record with unknown flag bits set", async () => {
    const bytes = await encrypt(patternBytes(8));
    bytes[HEADER_LENGTH] = 0x03;
    await expectError(bytes, AegisError.record);
  });

  it("rejects a trailing partial record header", async () => {
    const bytes = await encrypt(patternBytes(8));
    await expectError(concat(bytes, new Uint8Array([0x01, 0x00, 0x00])), AegisError.trailing);
  });

  it("rejects a container that ends inside a record header", async () => {
    const bytes = await encrypt(patternBytes(8));
    const withoutFinal = bytes.slice(0, bytes.byteLength - (RECORD_HEADER_LENGTH + 8 + 16));
    await expectError(concat(withoutFinal, new Uint8Array([0x00])), AegisError.truncated);
  });

  it("rejects an empty payload after the header of an encrypted empty file", async () => {
    const bytes = await encrypt(new Uint8Array(0));
    await expectError(bytes.slice(0, HEADER_LENGTH + RECORD_HEADER_LENGTH - 1), AegisError.truncated);
  });
});

describe("filename metadata hardening", () => {
  const withMetadata = async () => {
    const bytes = await encrypt(patternBytes(16), "document.pdf");
    return { bytes, lengthOffset: HEADER_LENGTH };
  };

  it("rejects a metadata length of zero", async () => {
    const { bytes, lengthOffset } = await withMetadata();
    view(bytes).setUint16(lengthOffset, 0, false);
    await expectError(bytes, AegisError.filenameMetadata);
  });

  it("rejects a metadata length below the tag size", async () => {
    const { bytes, lengthOffset } = await withMetadata();
    view(bytes).setUint16(lengthOffset, CRYPTO_CONSTANTS.TAG_LENGTH_BYTES - 1, false);
    await expectError(bytes, AegisError.filenameMetadata);
  });

  it("rejects a metadata length above the maximum", async () => {
    const { bytes, lengthOffset } = await withMetadata();
    view(bytes).setUint16(
      lengthOffset,
      CRYPTO_CONSTANTS.TAG_LENGTH_BYTES + 1024 + 1,
      false,
    );
    await expectError(bytes, AegisError.filenameMetadata);
  });

  it("rejects metadata that claims more bytes than the container holds", async () => {
    const { bytes, lengthOffset } = await withMetadata();
    view(bytes).setUint16(lengthOffset, 200, false);
    await expectError(bytes, AegisError.truncated);
  });

  it("rejects a partial metadata length field", async () => {
    const { bytes } = await withMetadata();
    await expectError(
      bytes.slice(0, HEADER_LENGTH + FILENAME_METADATA_LENGTH_BYTES - 1),
      AegisError.truncated,
    );
  });
});

describe("filename write-side validation", () => {
  it.each(["a/b", "a\\b", "a\u0000b"])("rejects %j containing path or NUL characters", async (name) => {
    await expect(encrypt(patternBytes(4), name)).rejects.toThrow(AegisError.filenameMetadata);
  });
});
