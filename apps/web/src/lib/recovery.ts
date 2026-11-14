import { RECOVERY_KEY_LENGTH } from "../constants";

const HEX_PATTERN = /^[0-9a-f]+$/i;

/**
 * Formats a recovery key as uppercase hex in 8-character groups, e.g.
 * `0123ABCD-4567EF01-...`. Purely cosmetic; the parser ignores separators.
 */
export const encodeRecoveryKey = (key: Uint8Array): string => {
  const hex = Array.from(key, (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return hex.match(/.{1,8}/g)?.join("-") ?? "";
};

/**
 * Accepts hex with optional spaces or dashes, case-insensitively. Returns
 * null for anything that is not exactly 32 bytes of hex.
 */
export const parseRecoveryKey = (value: string): Uint8Array<ArrayBuffer> | null => {
  const clean = value.replace(/[\s-]/g, "");
  if (clean.length !== RECOVERY_KEY_LENGTH * 2 || !HEX_PATTERN.test(clean)) {
    return null;
  }

  const bytes = new Uint8Array(RECOVERY_KEY_LENGTH);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

export const generateRecoveryKey = (): Uint8Array<ArrayBuffer> =>
  crypto.getRandomValues(new Uint8Array(RECOVERY_KEY_LENGTH));
