import type { TranslationKey } from "../i18n/translations";
import { AegisError } from "../services/cryptoService";

/**
 * Storage quota failures surface from OPFS/Blob writes as browser-native
 * English messages. They are matched here so the UI can show localized copy.
 */
export const isStorageQuotaMessage = (message: string): boolean =>
  /quota/i.test(message) || /penyimpanan penuh/i.test(message);

/**
 * Keys stay in the service so the crypto layer can throw Indonesian messages
 * without depending on the UI. This table is the single place that maps those
 * stable strings to translatable copy; tests fail if a new AegisError is added
 * without a translation.
 */
const MESSAGE_KEYS: Record<string, TranslationKey> = {
  [AegisError.format]: "errors.format",
  [AegisError.kdf]: "errors.kdf",
  [AegisError.iterations]: "errors.iterations",
  [AegisError.chunkSize]: "errors.chunkSize",
  [AegisError.flags]: "errors.flags",
  [AegisError.filenameMetadata]: "errors.filenameMetadata",
  [AegisError.truncated]: "errors.truncated",
  [AegisError.missingFinal]: "errors.missingFinal",
  [AegisError.trailing]: "errors.trailing",
  [AegisError.record]: "errors.record",
  [AegisError.tampered]: "errors.tampered",
  [AegisError.credentials]: "errors.credentials",
  [AegisError.recoveryMissing]: "errors.recoveryMissing",
  [AegisError.recoveryKey]: "errors.recoveryKey",
  [AegisError.legacyCorrupt]: "errors.legacyCorrupt",
  [AegisError.cancelled]: "errors.cancelled",
};

const VERSION_MESSAGE = /^Versi file tidak didukung \(v(\d+)\)\. Perbarui aplikasi\.$/;

/** Translation key for a known error message, or null for browser-native text. */
export const errorTranslationKey = (message: string): TranslationKey | null => {
  if (isStorageQuotaMessage(message)) return "errors.storageQuota";
  if (VERSION_MESSAGE.test(message)) return "errors.version";
  return MESSAGE_KEYS[message] ?? null;
};

export const localizeErrorMessage = (
  message: string,
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
): string => {
  const key = errorTranslationKey(message);
  if (!key) return message;
  if (key === "errors.version") {
    const version = message.match(VERSION_MESSAGE)?.[1] ?? "?";
    return t(key, { version });
  }
  return t(key);
};
