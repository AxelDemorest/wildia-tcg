import { describe, expect, it } from "vitest";
import { pickTranslation } from "@/lib/cards/translation";

const fr = { locale: "fr", name: "Renard roux", description: "" };
const en = { locale: "en", name: "Red fox", description: "" };

describe("pickTranslation", () => {
  it("returns the translation of the requested locale", () => {
    expect(pickTranslation([fr, en], "en")).toBe(en);
  });

  it("falls back to French when the locale has none", () => {
    expect(pickTranslation([fr], "en")).toBe(fr);
    expect(pickTranslation([fr, en], "de")).toBe(fr);
  });

  it("returns null when there is neither the locale nor French", () => {
    expect(pickTranslation([en], "de")).toBeNull();
    expect(pickTranslation([], "fr")).toBeNull();
  });
});
