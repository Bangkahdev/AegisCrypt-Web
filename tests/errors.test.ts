import { describe, expect, it } from "vitest";
import { isStorageQuotaMessage } from "../src/lib/errors";

describe("isStorageQuotaMessage", () => {
  it("matches Chromium storage quota failures", () => {
    expect(
      isStorageQuotaMessage(
        "The operation failed because it would cause the application to exceed its storage quota.",
      ),
    ).toBe(true);
  });

  it("matches explicit QuotaExceededError messages", () => {
    expect(isStorageQuotaMessage("QuotaExceededError: write failed")).toBe(true);
  });

  it("ignores ordinary crypto errors", () => {
    expect(isStorageQuotaMessage("Kata sandi atau keyfile salah.")).toBe(false);
    expect(isStorageQuotaMessage("Header memuat flag yang tidak dikenal.")).toBe(false);
  });
});
