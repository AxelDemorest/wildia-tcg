import type { RevealedCard } from "@/lib/boosters/enrich-drawn-cards";
import { groupOpeningRecap } from "@/lib/boosters/opening-recap";
import { revealStackOrder } from "@/lib/boosters/reveal-order";

/** One drawn card in the révélation; a card drawn twice is two entries, each with its own key. */
export type CeremonyCard = {
  key: string;
  card: RevealedCard;
  faceUp: boolean;
};

export type StackCeremony = {
  phase: "stack";
  /** The cards still to reveal, the top card first. */
  stack: CeremonyCard[];
  /** The cards already revealed, in the order they were set aside. */
  setAside: CeremonyCard[];
};

export type RecapCeremony = {
  phase: "recap";
  /** Every drawn card, in the order it was set aside. */
  setAside: CeremonyCard[];
  /** The récapitulatif d’ouverture: one entry per species with its quantity, rarest first. */
  recap: Array<RevealedCard & { quantity: number }>;
};

export type Ceremony = StackCeremony | RecapCeremony;

/** The player's only gesture: a click on the top card turns it, or sets it aside once turned. */
export type CeremonyAction = { type: "click" };

/** The révélation of an ouverture before the first turn: every drawn card face down, in reveal order. */
export function createCeremony(cards: readonly RevealedCard[]): StackCeremony {
  return {
    phase: "stack",
    stack: revealStackOrder(cards).map((card, index) => ({
      key: String(index),
      card,
      faceUp: false,
    })),
    setAside: [],
  };
}

/** The révélation's next state after the player's gesture. */
export function ceremonyReducer(state: Ceremony, action: CeremonyAction): Ceremony {
  switch (action.type) {
    case "click":
      return clickTopCard(state);
  }
}

/** Turns the top card, or sets it aside once turned; setting the last one aside shows the recap. */
function clickTopCard(state: Ceremony): Ceremony {
  if (state.phase !== "stack") return state;

  const [top, ...rest] = state.stack;
  if (!top.faceUp) return { ...state, stack: [{ ...top, faceUp: true }, ...rest] };

  const setAside = [...state.setAside, top];
  if (rest.length > 0) return { phase: "stack", stack: rest, setAside };

  return {
    phase: "recap",
    setAside,
    recap: groupOpeningRecap(setAside.map((entry) => entry.card)),
  };
}
