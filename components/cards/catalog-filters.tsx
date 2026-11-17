"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { chipClass } from "@/components/ui/chip";
import { CARD_RARITIES, type CardRarity } from "@/lib/cards/types";

export function CatalogFilters() {
  const t = useTranslations("Catalog");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("rarity") as CardRarity | null;

  function setRarity(value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) {
      params.delete("rarity");
    } else {
      params.set("rarity", value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-muted">{t("filterLabel")}</span>
      <button
        type="button"
        onClick={() => setRarity(null)}
        className={chipClass(!current)}
      >
        {t("filterAll")}
      </button>
      {CARD_RARITIES.map((rarity) => (
        <button
          key={rarity}
          type="button"
          onClick={() => setRarity(rarity)}
          className={`capitalize ${chipClass(current === rarity)}`}
        >
          {t(`rarity.${rarity}`)}
        </button>
      ))}
    </div>
  );
}
