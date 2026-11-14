import { describe, expect, it } from "vitest";
import { isAutoPickable, rankImageHits, scoreImageHit } from "@/lib/cards/import/image-score";

const names = {
  scientificName: "Lutra lutra",
  english: "Eurasian otter",
  french: "Loutre d'Europe",
};

describe("scoreImageHit", () => {
  it("auto-picks hits tagged with the scientific or vernacular name", () => {
    expect(isAutoPickable(scoreImageHit({ id: 1, tags: "lutra lutra, otter", likes: 3 }, names))).toBe(
      true,
    );
    expect(isAutoPickable(scoreImageHit({ id: 2, tags: "eurasian otter, river", likes: 0 }, names))).toBe(
      true,
    );
  });

  it("does not auto-pick a hit matching only the head noun", () => {
    const score = scoreImageHit({ id: 3, tags: "otter, sea, animal", likes: 100 }, names);
    expect(score.matchedName).toBe(false);
    expect(isAutoPickable(score)).toBe(false);
  });

  it("penalises drawings and objects, not lookalike words", () => {
    expect(scoreImageHit({ id: 4, tags: "eurasian otter, illustration", likes: 0 }, names).penalized).toBe(
      true,
    );
    expect(scoreImageHit({ id: 5, tags: "eurasian otter, maple, iconic", likes: 0 }, names).penalized).toBe(
      false,
    );
  });
});

describe("rankImageHits", () => {
  it("sorts best match first", () => {
    const ranked = rankImageHits(
      [
        { id: 1, tags: "otter", likes: 0 },
        { id: 2, tags: "eurasian otter", likes: 0 },
      ],
      names,
    );
    expect(ranked.map((h) => h.id)).toEqual([2, 1]);
  });
});
