"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
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
        className={`rounded-full border px-3 py-1 text-sm transition ${!current ? "border-brand bg-emerald-50 text-brand-strong" : "border-border bg-surface text-muted hover:border-zinc-300"}`}
      >
        {t("filterAll")}
      </button>
      {CARD_RARITIES.map((rarity) => (
        <button
          key={rarity}
          type="button"
          onClick={() => setRarity(rarity)}
          className={`rounded-full border px-3 py-1 text-sm capitalize transition ${current === rarity ? "border-brand bg-emerald-50 text-brand-strong" : "border-border bg-surface text-muted hover:border-zinc-300"}`}
        >
          {t(`rarity.${rarity}`)}
        </button>
      ))}
    </div>
  );
}
