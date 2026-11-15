"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { CollectionSortOption } from "@/lib/inventory/collection";

const SORTS: CollectionSortOption[] = ["rarity", "name", "quantity"];

export function CollectionSort() {
  const t = useTranslations("Collection");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = (searchParams.get("sort") as CollectionSortOption | null) ?? "rarity";

  function setSort(value: CollectionSortOption) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "rarity") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-muted">{t("sortLabel")}</span>
      {SORTS.map((sort) => (
        <button
          key={sort}
          type="button"
          onClick={() => setSort(sort)}
          className={`rounded-full border px-3 py-1 text-sm transition ${current === sort ? "border-brand bg-emerald-50 text-brand-strong" : "border-border bg-surface text-muted hover:border-zinc-300"}`}
        >
          {t(`sort.${sort}`)}
        </button>
      ))}
    </div>
  );
}
