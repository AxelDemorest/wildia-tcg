import { describe, expect, it } from "vitest";
import {
  applyNameOverrides,
  createWorkEntry,
  evaluateEntry,
  type WorkEntry,
} from "@/lib/cards/import/work-entry";

function fetchedEntry(overrides: Partial<WorkEntry> = {}): WorkEntry {
  return {
    ...createWorkEntry("lutra-lutra", "Lutra lutra", null),
    fetchedAt: "2026-11-01T00:00:00.000Z",
    rarity: "uncommon",
    translations: {
      fr: { wikipediaTitle: "Loutre d'Europe", name: "Loutre d'Europe", extract: "x", description: "x" },
      en: { wikipediaTitle: "Eurasian otter", name: "Eurasian otter", extract: "x", description: "x" },
    },
    imageSearchedAt: "2026-11-01T00:00:00.000Z",
    image: {
      pixabayId: 1,
      pageUrl: "https://pixabay.com/photos/1",
      user: "someone",
      tags: "eurasian otter",
      source: "auto",
      localPath: "data/cards/images/lutra-lutra.webp",
      contentType: "image/webp",
    },
    ...overrides,
  };
}

describe("evaluateEntry", () => {
  it("is pending until fetched", () => {
    expect(evaluateEntry(createWorkEntry("a-b", "A b", null)).status).toBe("pending");
  });

  it("is ready when data and image are complete", () => {
    expect(evaluateEntry(fetchedEntry())).toEqual({ flags: [], status: "ready" });
  });

  it("rejects blocking data flags even when approved", () => {
    const entry = fetchedEntry({ flags: ["iucn_not_playable"], approved: true });
    expect(evaluateEntry(entry).status).toBe("rejected");
  });

  it("needs review without a confident image", () => {
    const entry = fetchedEntry({
      image: null,
      imageCandidates: [
        {
          pixabayId: 2,
          pageUrl: "",
          previewUrl: "",
          user: "",
          tags: "otter",
          score: 2,
          query: "otter",
        },
      ],
    });
    expect(evaluateEntry(entry)).toEqual({ flags: ["image_uncertain"], status: "needs_review" });
  });

  it("flags a scientific-name title until approved or renamed", () => {
    const base = fetchedEntry();
    const translations = {
      ...base.translations,
      fr: { ...base.translations.fr!, name: "Lutra lutra" },
    };
    expect(evaluateEntry({ ...base, translations })).toEqual({
      flags: ["name_is_scientific"],
      status: "needs_review",
    });
    expect(evaluateEntry({ ...base, translations, approved: true }).status).toBe("ready");

    const renamed = { ...base, translations, nameOverrides: { fr: "Loutre d'Europe" } };
    applyNameOverrides(renamed);
    expect(evaluateEntry(renamed).status).toBe("ready");
  });

  it("needs review until WebP conversion", () => {
    const entry = fetchedEntry({
      image: {
        ...fetchedEntry().image!,
        localPath: "data/cards/images/lutra-lutra.jpg",
        contentType: "image/jpeg",
      },
    });
    expect(evaluateEntry(entry)).toEqual({ flags: ["image_not_webp"], status: "needs_review" });
  });

  it("stays published until content changes", () => {
    expect(evaluateEntry(fetchedEntry({ publishedAt: "2026-11-02T00:00:00.000Z" })).status).toBe(
      "published",
    );
  });
});
