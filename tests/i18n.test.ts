import { describe, expect, it } from "vitest";
import { en, id } from "../src/i18n/translations";

const placeholders = (value: string): string[] =>
  [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe("i18n translations", () => {
  it("has every English key in Indonesian", () => {
    expect(Object.keys(id).sort()).toEqual(Object.keys(en).sort());
  });

  it("keeps both locales free of empty strings", () => {
    for (const [key, value] of Object.entries({ ...en, ...id })) {
      expect(value.trim(), key).not.toBe("");
    }
  });

  it("keeps interpolation placeholders aligned", () => {
    for (const key of Object.keys(en) as Array<keyof typeof en>) {
      expect(placeholders(id[key]), key).toEqual(placeholders(en[key]));
    }
  });
});
