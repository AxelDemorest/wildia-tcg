import type { AppLocale } from "@/i18n/routing";
import type { BoosterSettings } from "@/lib/admin/booster-values";
import type { CardRarity } from "@/lib/cards/types";

/** The sum of a booster's six chances: each is relative to it. */
export function rarityTotal(weights: Record<CardRarity, number>): number {
  return Object.values(weights).reduce((sum, weight) => sum + weight, 0);
}

/**
 * `part` out of `total` as a percentage written for the locale, one decimal at most: fr "33,3 %"
 * (narrow no-break space), en "33.3%". A total of 0 gives 0 %.
 */
export function formatShare(part: number, total: number, locale: AppLocale): string {
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(
    total > 0 ? part / total : 0,
  );
}

/**
 * Each booster's share of the boutique's emplacements, by slug. The offer draws among the active
 * boosters of positive weight only: any other has 0 % and is left out of the total.
 */
export function slotShares(
  boosters: Pick<BoosterSettings, "slug" | "shopWeight" | "isActive">[],
  locale: AppLocale,
): Record<string, string> {
  const weightOf = (booster: (typeof boosters)[number]) =>
    booster.isActive ? booster.shopWeight : 0;
  const total = boosters.reduce((sum, booster) => sum + weightOf(booster), 0);
  return Object.fromEntries(
    boosters.map((booster) => [booster.slug, formatShare(weightOf(booster), total, locale)]),
  );
}
