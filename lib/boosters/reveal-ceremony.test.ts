import { describe, expect, it } from "vitest";
import type { RevealedCard } from "@/lib/boosters/enrich-drawn-cards";
import {
  ceremonyReducer,
  createCeremony,
  nextPackTimer,
  packTimerKey,
  PACK_BURST_MS,
  PACK_CHARGE_MS,
  PACK_TAP_MS,
  type Ceremony,
  type CeremonyAction,
  type CeremonyCard,
  type PackCeremony,
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

function inPackPhase(state: Ceremony) {
  if (state.phase !== "pack") throw new Error(`expected the pack phase, got ${state.phase}`);
  return state;
}

describe("createCeremony", () => {
  // Drawn out of order, with a duplicate (Renard twice).
  const ceremony = createCeremony([epic, commonA, rare, commonA]);
  // The pile the pack opens onto: the stack phase the burst hands over to.
  const prepared = inPackPhase(ceremony).prepared;

  it("starts in the pack phase, at rest", () => {
    expect(ceremony.phase).toBe("pack");
    expect(inPackPhase(ceremony).step).toBe("rest");
  });

  it("prepares a stack with nothing set aside", () => {
    expect(prepared.phase).toBe("stack");
    expect(prepared.setAside).toEqual([]);
  });

  it("holds one entry per draw, duplicates included, in reveal order", () => {
    expect(prepared.stack.map((entry) => entry.card.name)).toEqual([
      "Renard",
      "Renard",
      "Lynx",
      "Tigre",
    ]);
  });

  it("gives each entry its own key, even for the same card drawn twice", () => {
    const keys = prepared.stack.map((entry) => entry.key);

    expect(new Set(keys).size).toBe(4);
  });

  it("starts with every card face down", () => {
    expect(prepared.stack.every((entry) => entry.faceUp === false)).toBe(true);
  });
});

const rest = createCeremony([epic, commonA, rare, commonA]) as PackCeremony;
const preparedStack = rest.prepared;
const inStep = (step: PackCeremony["step"]): PackCeremony => ({ ...rest, step });
const act = (state: Ceremony, action: CeremonyAction) => ceremonyReducer(state, action);
const pointerPress: CeremonyAction = { type: "press", by: "pointer", reducedMotion: false };

describe("ceremonyReducer: the pack phase", () => {
  it("starts charging when the pack is pressed by pointer at rest", () => {
    expect(inPackPhase(act(rest, pointerPress)).step).toBe("charging");
  });

  it("starts bursting when the charge is complete", () => {
    expect(inPackPhase(act(inStep("charging"), { type: "charged" })).step).toBe("bursting");
  });

  it("hands over to the prepared stack, face down, when the burst is done", () => {
    expect(act(inStep("bursting"), { type: "burst-done" })).toEqual(preparedStack);
  });

  it("cancels back to rest when a press held past the tap threshold is released before full", () => {
    const next = act(inStep("charging"), { type: "release", heldMs: PACK_TAP_MS + 1 });

    expect(inPackPhase(next).step).toBe("rest");
  });

  it("lets the charge run on by itself when the press was a quick tap", () => {
    const next = act(inStep("charging"), { type: "release", heldMs: PACK_TAP_MS - 1 });

    expect(inPackPhase(next).step).toBe("charging");
  });

  it("keeps a charge started by a quick tap running when a later press is held past the tap threshold and released before full", () => {
    const tapped = act(act(rest, pointerPress), { type: "release", heldMs: PACK_TAP_MS - 1 });
    expect(inPackPhase(tapped).step).toBe("charging");

    const laterPress = act(tapped, pointerPress);
    const laterRelease = act(laterPress, { type: "release", heldMs: PACK_TAP_MS + 500 });

    expect(inPackPhase(laterRelease).step).toBe("charging");
  });

  it("changes nothing when the press is released during the burst", () => {
    const bursting = inStep("bursting");

    expect(act(bursting, { type: "release", heldMs: 10 })).toEqual(bursting);
    expect(act(bursting, { type: "release", heldMs: PACK_CHARGE_MS })).toEqual(bursting);
  });

  it("ignores a press during the burst", () => {
    const bursting = inStep("bursting");

    expect(act(bursting, pointerPress)).toEqual(bursting);
  });

  it("charges on by itself after an activation, whatever the later release", () => {
    const charging = act(rest, { type: "press", by: "activation", reducedMotion: false });
    expect(inPackPhase(charging).step).toBe("charging");

    const released = act(charging, { type: "release", heldMs: PACK_TAP_MS + 500 });
    expect(inPackPhase(released).step).toBe("charging");
  });

  it.each<[string, PackCeremony["step"]]>([
    ["rest", "rest"],
    ["charging", "charging"],
    ["the burst", "bursting"],
  ])("goes straight to the face-down stack, in reveal order, when skipped from %s", (_, step) => {
    const next = inStackPhase(act(inStep(step), { type: "skip" }));

    expect(names(next.stack)).toEqual(["Renard", "Renard", "Lynx", "Tigre"]);
    expect(next.stack.every((item) => item.faceUp === false)).toBe(true);
    expect(next.setAside).toEqual([]);
  });

  it.each<["pointer" | "activation"]>([["pointer"], ["activation"]])(
    "shows the stack at once, with no charge nor burst, when pressed by %s under reduced motion",
    (by) => {
      const next = act(rest, { type: "press", by, reducedMotion: true });

      expect(next).toEqual(preparedStack);
    },
  );
});

describe("ceremonyReducer: late timers", () => {
  it("ignores a charged timer that fires at rest", () => {
    expect(act(rest, { type: "charged" })).toEqual(rest);
  });

  it.each<[CeremonyAction]>([[{ type: "charged" }], [{ type: "burst-done" }]])(
    "ignores a late %j timer once the stack is shown",
    (action) => {
      const stack = inStackPhase(click(preparedStack));

      expect(act(stack, action)).toBe(stack);
    },
  );
});

describe("nextPackTimer(state)", () => {
  it.each<[PackCeremony["step"], CeremonyAction, number]>([
    ["charging", { type: "charged" }, PACK_CHARGE_MS],
    ["bursting", { type: "burst-done" }, PACK_BURST_MS],
  ])("while %s, schedules %j after its duration", (step, action, delayMs) => {
    expect(nextPackTimer(inStep(step))).toEqual({ action, delayMs });
  });

  it("schedules nothing at rest nor once the stack is shown", () => {
    expect(nextPackTimer(rest)).toBeNull();
    expect(nextPackTimer(preparedStack)).toBeNull();
  });
});

describe("packTimerKey(state)", () => {
  it("keeps the same key for the charging state before and after a quick-tap release, so the charge timer is not restarted", () => {
    const charging = act(rest, pointerPress);
    const tapped = act(charging, { type: "release", heldMs: PACK_TAP_MS - 1 });

    expect(tapped).not.toBe(charging);
    expect(packTimerKey(tapped)).not.toBeNull();
    expect(packTimerKey(tapped)).toBe(packTimerKey(charging));
  });

  it("changes the key once the state moves to bursting, so the burst timer starts", () => {
    const charging = act(rest, pointerPress);
    const bursting = act(charging, { type: "charged" });

    expect(packTimerKey(bursting)).not.toBeNull();
    expect(packTimerKey(bursting)).not.toBe(packTimerKey(charging));
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
