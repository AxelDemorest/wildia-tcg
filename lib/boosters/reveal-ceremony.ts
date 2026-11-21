import type { RevealedCard } from "@/lib/boosters/enrich-drawn-cards";
import { groupOpeningRecap } from "@/lib/boosters/opening-recap";
import { revealStackOrder } from "@/lib/boosters/reveal-order";

/** How long a press charges the pack before it bursts. */
export const PACK_CHARGE_MS = 1300;
/** How long the burst lasts before the pile takes over. */
export const PACK_BURST_MS = 1500;
/** A pointer press released sooner is a tap: the charge then runs on by itself, as from an activation. */
export const PACK_TAP_MS = 250;

/** One drawn card in the révélation; a card drawn twice is two entries, each with its own key. */
export type CeremonyCard = {
  key: string;
  card: RevealedCard;
  faceUp: boolean;
};

export type PackCeremony = {
  phase: "pack";
  /** At rest, charging under a press, then bursting once the charge is complete. */
  step: "rest" | "charging" | "bursting";
  /** Charging from an activation or a quick tap: the charge runs on to the burst, whatever the pointer does. */
  runsOnItsOwn: boolean;
  /** The pile the pack opens onto. */
  prepared: StackCeremony;
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

export type Ceremony = PackCeremony | StackCeremony | RecapCeremony;

/**
 * What moves the révélation on. On the pack: a pointer press (`press`, then `release` when it ends,
 * let go or cancelled), its activation from the keyboard or a screen reader (`press` alone), its
 * timers (`charged`, then `burst-done`), Passer or Échap (`skip`). On the pile: a click on the top
 * card.
 */
export type CeremonyAction =
  | { type: "press"; by: "pointer" | "activation"; reducedMotion: boolean }
  | { type: "release"; heldMs: number }
  | { type: "charged" }
  | { type: "burst-done" }
  | { type: "skip" }
  | { type: "click" };

type PackAction = Exclude<CeremonyAction, { type: "click" }>;

/** A step of the pack that moves on by itself once its duration is over. */
export type PackTimer = {
  action: Extract<PackAction, { type: "charged" | "burst-done" }>;
  delayMs: number;
};

/** The révélation of an ouverture: its pack at rest, over every drawn card face down in reveal order. */
export function createCeremony(cards: readonly RevealedCard[]): PackCeremony {
  return {
    phase: "pack",
    step: "rest",
    runsOnItsOwn: false,
    prepared: {
      phase: "stack",
      stack: revealStackOrder(cards).map((card, index) => ({
        key: String(index),
        card,
        faceUp: false,
      })),
      setAside: [],
    },
  };
}

/** The révélation's next state after the player's gesture or a timer; a late one changes nothing. */
export function ceremonyReducer(state: Ceremony, action: CeremonyAction): Ceremony {
  if (action.type === "click") return clickTopCard(state);
  return state.phase === "pack" ? packReducer(state, action) : state;
}

/** The timer the pack's current step waits on, or null when it waits on the player. */
export function nextPackTimer(state: Ceremony): PackTimer | null {
  if (state.phase !== "pack") return null;
  if (state.step === "charging") return { action: { type: "charged" }, delayMs: PACK_CHARGE_MS };
  if (state.step === "bursting") return { action: { type: "burst-done" }, delayMs: PACK_BURST_MS };
  return null;
}

/** Identifies the timer the pack waits on, so a state that changes nothing of it keeps it running. */
export function packTimerKey(state: Ceremony): string | null {
  return nextPackTimer(state)?.action.type ?? null;
}

/** Press to charge, hold until the burst; under reduced motion a press shows the pile at once. */
function packReducer(state: PackCeremony, action: PackAction): Ceremony {
  switch (action.type) {
    case "press":
      if (state.step !== "rest") return state;
      if (action.reducedMotion) return state.prepared;
      return { ...state, step: "charging", runsOnItsOwn: action.by === "activation" };
    case "release":
      // A hold let go before the burst cancels; a tap, or a charge from an activation, runs on.
      if (state.step !== "charging" || state.runsOnItsOwn) return state;
      return action.heldMs < PACK_TAP_MS
        ? { ...state, runsOnItsOwn: true }
        : { ...state, step: "rest" };
    case "charged":
      return state.step === "charging" ? { ...state, step: "bursting" } : state;
    // No step to check for burst-done: only the burst waits on it, and only the pile follows it.
    case "burst-done":
    case "skip":
      return state.prepared;
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
