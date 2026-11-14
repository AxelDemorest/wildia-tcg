import { describe, expect, it } from "vitest";
import {
  iucnStatusFromWikidataId,
  pickIucnStatement,
  rarityFromIucnStatus,
} from "@/lib/cards/iucn";

describe("rarityFromIucnStatus", () => {
  it("makes more threatened species rarer", () => {
    expect(rarityFromIucnStatus("LC")).toBe("common");
    expect(rarityFromIucnStatus("NT")).toBe("uncommon");
    expect(rarityFromIucnStatus("VU")).toBe("rare");
    expect(rarityFromIucnStatus("EN")).toBe("epic");
    expect(rarityFromIucnStatus("CR")).toBe("legendary");
    expect(rarityFromIucnStatus("EW")).toBe("mythic");
  });

  it("gives no rarity to extinct or unassessed species", () => {
    expect(rarityFromIucnStatus("EX")).toBeNull();
    expect(rarityFromIucnStatus("DD")).toBeNull();
    expect(rarityFromIucnStatus("NE")).toBeNull();
  });
});

describe("iucnStatusFromWikidataId", () => {
  it("maps current and legacy endangered items", () => {
    expect(iucnStatusFromWikidataId("Q96377276")).toBe("EN");
    expect(iucnStatusFromWikidataId("Q11394")).toBe("EN");
    expect(iucnStatusFromWikidataId("Q211005")).toBe("LC");
  });

  it("returns null for unknown items", () => {
    expect(iucnStatusFromWikidataId("Q158862")).toBeNull();
  });
});

describe("pickIucnStatement", () => {
  it("prefers the preferred-rank statement", () => {
    const picked = pickIucnStatement([
      { statusQid: "Q211005", rank: "normal", pointInTime: "2024-01-01" },
      { statusQid: "Q278113", rank: "preferred", pointInTime: "2015-01-01" },
    ]);
    expect(picked?.statusQid).toBe("Q278113");
  });

  it("falls back to the latest assessment", () => {
    const picked = pickIucnStatement([
      { statusQid: "Q211005", rank: "normal", pointInTime: "2008-01-01" },
      { statusQid: "Q719675", rank: "normal", pointInTime: "2021-06-01" },
      { statusQid: "Q278113", rank: "normal", pointInTime: null },
    ]);
    expect(picked?.statusQid).toBe("Q719675");
  });

  it("returns null without statements", () => {
    expect(pickIucnStatement([])).toBeNull();
  });
});
