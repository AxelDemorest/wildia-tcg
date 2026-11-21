import { describe, expect, it } from "vitest";
import type { RevealedCard } from "@/lib/boosters/enrich-drawn-cards";
import {
  ceremonyReducer,
  createCeremony,
  type Ceremony,
  type CeremonyCard,
  type StackCeremony,
} from "@/lib/boosters/reveal-ceremony";
import type { CardRarity } from "@/lib/cards/types";

function card(cardId: string, name: string, rarity: CardRarity): RevealedCard {
  return {
    cardId,
    slug: name.toLowerCase(),
    rarity,
    name,
    scientific_name: null,
    iucn_status: null,
    description: "",
    image_path: null,
    stats: { power: 1, defense: 1, speed: 1 },
  };
}

const epic = card("c1", "Tigre", "epic");
const commonA = card("c2", "Renard", "common");
const rare = card("c3", "Lynx", "rare");

describe("createCeremony", () => {
  // Drawn out of order, with a duplicate (Renard twice).
  const ceremony = createCeremony([epic, commonA, rare, commonA]);

  it("starts in the stack phase with nothing set aside", () => {
    expect(ceremony.phase).toBe("stack");
    expect(ceremony.setAside).toEqual([]);
  });

  it("holds one entry per draw, duplicates included, in reveal order", () => {
    expect(ceremony.stack.map((entry) => entry.card.name)).toEqual([
      "Renard",
      "Renard",
      "Lynx",
      "Tigre",
    ]);
  });

  it("gives each entry its own key, even for the same card drawn twice", () => {
    const keys = ceremony.stack.map((entry) => entry.key);

    expect(new Set(keys).size).toBe(4);
  });

  it("starts with every card face down", () => {
    expect(ceremony.stack.every((entry) => entry.faceUp === false)).toBe(true);
  });
});

const click = (state: Ceremony) => ceremonyReducer(state, { type: "click" });

function inStackPhase(state: Ceremony) {
  if (state.phase !== "stack") throw new Error(`expected the stack phase, got ${state.phase}`);
  return state;
}

const entry = (key: string, drawn: RevealedCard, faceUp: boolean): CeremonyCard => ({
  key,
  card: drawn,
  faceUp,
});
const names = (entries: CeremonyCard[]) => entries.map((item) => item.card.name);

// Each state below is written out in full, so a test touches one branch of the reducer only.
describe("ceremonyReducer: a click on the top card", () => {
  it("turns a face-down top card face up, setting nothing aside and keeping the stack length", () => {
    const state: StackCeremony = {
      phase: "stack",
      stack: [entry("0", commonA, false), entry("1", rare, false)],
      setAside: [],
    };

    const next = inStackPhase(click(state));

    expect(next.stack[0].faceUp).toBe(true);
    expect(next.stack).toHaveLength(2);
    expect(next.setAside).toEqual([]);
  });

  it("brings the next card on top face down once the top card is set aside", () => {
    const state: StackCeremony = {
      phase: "stack",
      stack: [entry("0", commonA, true), entry("1", rare, false)],
      setAside: [],
    };

    const next = inStackPhase(click(state));

    expect(names(next.stack)).toEqual(["Lynx"]);
    expect(next.stack[0].faceUp).toBe(false);
  });

  it("keeps the set-aside cards face up, in the order they were set aside", () => {
    // Distinct cards, so a reversed row cannot pass.
    const state: StackCeremony = {
      phase: "stack",
      stack: [entry("1", rare, true), entry("2", epic, false)],
      setAside: [entry("0", commonA, true)],
    };

    const next = inStackPhase(click(state));

    expect(names(next.setAside)).toEqual(["Renard", "Lynx"]);
    expect(next.setAside.every((item) => item.faceUp)).toBe(true);
  });
});

describe("ceremonyReducer: setting the last card aside", () => {
  it("switches to the recap: one entry per species with its quantity, rarest first", () => {
    const state: StackCeremony = {
      phase: "stack",
      stack: [entry("3", epic, true)],
      setAside: [entry("0", commonA, true), entry("1", commonA, true), entry("2", rare, true)],
    };

    const next = click(state);

    if (next.phase !== "recap") throw new Error(`expected the recap, got ${next.phase}`);
    expect(next.recap.map((item) => [item.name, item.quantity])).toEqual([
      ["Tigre", 1],
      ["Lynx", 1],
      ["Renard", 2],
    ]);
  });
});
