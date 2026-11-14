import { describe, expect, it } from "vitest";
import catalog from "../fixtures/error-catalog.json";
import { AegisError } from "../../src/services/cryptoService";

describe("error catalog (D5)", () => {
  const messages = catalog.messages as Record<string, string>;

  it("matches every web message exactly", () => {
    for (const [id, message] of Object.entries(messages)) {
      expect({ id, message: AegisError[id as keyof typeof AegisError] }).toEqual({ id, message });
    }
  });

  it("renders the version template with the offending version", () => {
    for (const version of [1, 4, 9]) {
      expect(AegisError.version(version)).toBe(
        catalog.versionTemplate.replace("{v}", String(version)),
      );
    }
  });

  it("catalogues every web error and nothing else", () => {
    const webKeys = Object.entries(AegisError)
      .filter(([, value]) => typeof value === "string")
      .map(([id]) => id)
      .sort();

    expect(Object.keys(messages).sort()).toEqual(webKeys);
    expect(Object.keys(AegisError)).toContain("version");
  });
});
