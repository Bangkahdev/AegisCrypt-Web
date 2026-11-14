import { describe, expect, it } from "vitest";
import { AegisError } from "../../src/services/cryptoService";
import {
  errorTranslationKey,
  isStorageQuotaMessage,
  localizeErrorMessage,
} from "../../src/lib/errors";
import { en, id } from "../../src/i18n/translations";

const makeT = (locale: "en" | "id") => {
  const dictionary = locale === "en" ? en : id;
  return (key: keyof typeof en, vars?: Record<string, string | number>) =>
    dictionary[key].replace(/\{(\w+)\}/g, (match, name: string) =>
      vars && name in vars ? String(vars[name]) : match,
    );
};

const staticMessages: Array<[string, string]> = Object.entries(AegisError).flatMap(
  ([name, value]) => (typeof value === "string" ? [[name, value] as [string, string]] : []),
);

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

describe("error localization", () => {
  it("maps every static AegisError to a translation key", () => {
    expect(staticMessages.length).toBeGreaterThanOrEqual(16);
    for (const [name, message] of staticMessages) {
      expect(errorTranslationKey(message), name).not.toBeNull();
    }
  });

  it("localizes credentials in English and Indonesian", () => {
    expect(localizeErrorMessage(AegisError.credentials, makeT("en"))).toBe(
      "Incorrect password or keyfile.",
    );
    expect(localizeErrorMessage(AegisError.credentials, makeT("id"))).toBe(
      "Kata sandi atau keyfile salah.",
    );
  });

  it("keeps the version number when localizing", () => {
    const message = AegisError.version(4);
    expect(errorTranslationKey(message)).toBe("errors.version");
    expect(localizeErrorMessage(message, makeT("en"))).toBe(
      "Unsupported file version (v4). Update the app.",
    );
    expect(localizeErrorMessage(message, makeT("id"))).toBe(
      "Versi berkas tidak didukung (v4). Perbarui aplikasi.",
    );
  });

  it("localizes storage quota failures", () => {
    expect(localizeErrorMessage("QuotaExceededError", makeT("id"))).toBe(
      id["errors.storageQuota"],
    );
  });

  it("passes unknown browser errors through unchanged", () => {
    expect(localizeErrorMessage("The operation was aborted.", makeT("en"))).toBe(
      "The operation was aborted.",
    );
  });
});
