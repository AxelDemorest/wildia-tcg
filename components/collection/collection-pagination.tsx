"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { chipClass } from "@/components/ui/chip";

type Props = {
  page: number;
  pageCount: number;
};

export function CollectionPagination({ page, pageCount }: Props) {
  const t = useTranslations("Collection");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (pageCount <= 1) return null;

  function goTo(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(next));
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <nav
      aria-label={t("paginationLabel")}
      className="flex flex-wrap items-center justify-center gap-2"
    >
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => goTo(page - 1)}
        className={chipClass(false)}
      >
        {t("paginationPrev")}
      </button>
      <span className="px-2 text-sm tabular-nums text-muted">
        {t("paginationStatus", { page, pageCount })}
      </span>
      <button
        type="button"
        disabled={page >= pageCount}
        onClick={() => goTo(page + 1)}
        className={chipClass(false)}
      >
        {t("paginationNext")}
      </button>
    </nav>
  );
}