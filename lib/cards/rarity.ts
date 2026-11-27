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
      return "bg-zinc-50 text-zinc-700";
    case "uncommon":
      return "bg-emerald-50 text-emerald-800";
    case "rare":
      return "bg-sky-50 text-sky-800";
    case "epic":
      return "bg-violet-50 text-violet-800";
    case "legendary":
      return "bg-amber-50 text-amber-900";
    case "mythic":
      return "bg-rose-50 text-rose-950";
  }
}

/** How the card face catches the light: matte, fixed reflections, or a sheen on hover. */
export type CardShine = "none" | "static" | "hover";

export function cardShine(rarity: CardRarity): CardShine {
  switch (rarity) {
    case "common":
    case "uncommon":
      return "none";
    case "rare":
    case "epic":
      return "static";
    case "legendary":
    case "mythic":
      return "hover";
  }
}