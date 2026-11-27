import type { CardRarity } from "@/lib/cards/types";

const RARITY_ORDER: Record<CardRarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  mythic: 5,
};

export function compareRarity(a: CardRarity, b: CardRarity): number {
  return RARITY_ORDER[a] - RARITY_ORDER[b];
}

export function rarityAccentClass(rarity: CardRarity): string {
  switch (rarity) {
    case "common":
      return "border-zinc-300 bg-zinc-50 text-zinc-700";
    case "uncommon":
      return "border-emerald-300 bg-emerald-50 text-emerald-800";
    case "rare":
      return "border-sky-300 bg-sky-50 text-sky-800";
    case "epic":
      return "border-violet-300 bg-violet-50 text-violet-800";
    case "legendary":
      return "border-amber-400 bg-amber-50 text-amber-900";
    case "mythic":
      return "border-rose-500 bg-rose-50 text-rose-950";
  }
}

/** Soft outer glow for the highest rarities; other cards keep the default shadow. */
export function rarityGlowClass(rarity: CardRarity): string {
  switch (rarity) {
    case "legendary":
      return "shadow-amber-300/60";
    case "mythic":
      return "shadow-rose-400/70";
    default:
      return "";
  }
}

export function rarityFrameClass(rarity: CardRarity): string {
  switch (rarity) {
    case "common":
      return "ring-zinc-200";
    case "uncommon":
      return "ring-emerald-200";
    case "rare":
      return "ring-sky-300";
    case "epic":
      return "ring-violet-300";
    case "legendary":
      return "ring-amber-400 shadow-amber-200/60";
    case "mythic":
      return "ring-rose-500 shadow-rose-300/70";
  }
}
