import { describe, expect, it } from "vitest";
import {
  cleanDisplayTitle,
  normalizeScientificName,
  slugFromScientificName,
  truncateExtract,
} from "@/lib/cards/import/text";

describe("slugFromScientificName", () => {
  it("builds a stable slug from the binomial", () => {
    expect(slugFromScientificName("Lutra lutra")).toBe("lutra-lutra");
    expect(slugFromScientificName("Canis lupus × familiaris")).toBe("canis-lupus-familiaris");
  });
});

describe("normalizeScientificName", () => {
  it("capitalises the genus only", () => {
    expect(normalizeScientificName("  lutra   LUTRA ")).toBe("Lutra lutra");
  });
});

describe("cleanDisplayTitle", () => {
  it("strips markup, entities and disambiguation", () => {
    expect(cleanDisplayTitle("<i>Lutra lutra</i>")).toBe("Lutra lutra");
    expect(cleanDisplayTitle("Cerf &amp; biche (animal)")).toBe("Cerf & biche");
    expect(cleanDisplayTitle("Père David&#039;s deer")).toBe("Père David's deer");
    expect(cleanDisplayTitle("Loutre&#x2019;s")).toBe("Loutre’s");
  });
});

describe("truncateExtract", () => {
  it("keeps short extracts untouched", () => {
    expect(truncateExtract("La loutre nage.  Elle pêche.")).toBe("La loutre nage. Elle pêche.");
  });

  it("cuts at the last sentence that fits", () => {
    const text = `${"a".repeat(40)}. ${"b".repeat(40)}. ${"c".repeat(40)}.`;
    expect(truncateExtract(text, 90)).toBe(`${"a".repeat(40)}. ${"b".repeat(40)}.`);
  });

  it("falls back to a word boundary with an ellipsis", () => {
    const text = "mot ".repeat(50);
    const cut = truncateExtract(text, 30);
    expect(cut.length).toBeLessThanOrEqual(30);
    expect(cut.endsWith("…")).toBe(true);
  });
});
