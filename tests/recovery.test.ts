import { describe, expect, it } from "vitest";
import {
  encodeRecoveryKey,
  generateRecoveryKey,
  parseRecoveryKey,
} from "../src/lib/recovery";

const SAMPLE = new Uint8Array(32).map((_, index) => (index * 7 + 11) & 0xff);

describe("recovery key encoding", () => {
  it("formats 32 bytes as grouped uppercase hex", () => {
    const encoded = encodeRecoveryKey(SAMPLE);
    expect(encoded).toMatch(/^[0-9A-F]{8}(-[0-9A-F]{8}){7}$/);
    expect(encoded.replace(/-/g, "")).toHaveLength(64);
  });

  it("parses its own output back to the same bytes", () => {
    expect(parseRecoveryKey(encodeRecoveryKey(SAMPLE))).toEqual(SAMPLE);
  });

  it("accepts lowercase, spaces and dashes", () => {
    const hex = encodeRecoveryKey(SAMPLE).toLowerCase().replace(/-/g, " ");
    expect(parseRecoveryKey(hex)).toEqual(SAMPLE);
  });

  it("rejects wrong length or non-hex input", () => {
    expect(parseRecoveryKey("")).toBeNull();
    expect(parseRecoveryKey("AB".repeat(31))).toBeNull();
    expect(parseRecoveryKey("AB".repeat(33))).toBeNull();
    expect(parseRecoveryKey("Z".repeat(64))).toBeNull();
  });

  it("generates distinct 32-byte keys", () => {
    const first = generateRecoveryKey();
    const second = generateRecoveryKey();
    expect(first).toHaveLength(32);
    expect(first).not.toEqual(second);
  });
});
