"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { chipClass } from "@/components/ui/chip";
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
    params.delete("page");
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
          className={chipClass(current === sort)}
        >
          {t(`sort.${sort}`)}
        </button>
      ))}
    </div>
  );
}
