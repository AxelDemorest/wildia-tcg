import type { ReactNode } from "react";
import { AdminChevronLeftIcon, AdminChevronRightIcon } from "@/components/admin/admin-icons";
import { Link } from "@/i18n/navigation";
import type { AccountsPageQuery } from "@/lib/admin/accounts-pagination";

export type AccountsPaginationLabels = {
  /** "1–50 sur 1 284 comptes", from 1024 px. */
  range: string;
  /** "Page 1 sur 26", from 1024 px. */
  page: string;
  /** Both on one line below 1024 px: "1–50 sur 1 284 comptes · page 1 sur 26". */
  rangeAndPage: string;
  previous: string;
  next: string;
};

type Props = {
  /** The query of each link, search kept; null when there is no such page. */
  previous: AccountsPageQuery | null;
  next: AccountsPageQuery | null;
  labels: AccountsPaginationLabels;
};

// Below 1024 px both controls share the width, 44 px high; from 1024 px they fit their label.
const control =
  "inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[8px] border bg-white font-medium lg:h-9 lg:flex-none lg:px-3";

/** A link to the page, or the same control greyed out when there is none (first or last page). */
function PageControl({
  query,
  children,
}: {
  query: AccountsPageQuery | null;
  children: ReactNode;
}) {
  return query ? (
    <Link
      href={{ pathname: "/admin/accounts", query }}
      className={`${control} border-admin-line-strong text-admin-ink`}
    >
      {children}
    </Link>
  ) : (
    <span aria-disabled className={`${control} border-admin-line text-admin-disabled`}>
      {children}
    </span>
  );
}

/** The registry's footer: the rows shown, and links to the previous and next pages. */
export function AccountsPagination({ previous, next, labels }: Props) {
  return (
    <div className="flex flex-col gap-3 border-t border-admin-line px-4 py-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
      <p className="text-admin-muted tabular-nums max-lg:hidden">{labels.range}</p>
      <p className="text-admin-muted tabular-nums lg:hidden">{labels.rangeAndPage}</p>
      <div className="flex items-center gap-2">
        <PageControl query={previous}>
          <AdminChevronLeftIcon className="size-4" />
          {labels.previous}
        </PageControl>
        <span className="px-1 text-admin-text tabular-nums max-lg:hidden">{labels.page}</span>
        <PageControl query={next}>
          {labels.next}
          <AdminChevronRightIcon className="size-4" />
        </PageControl>
      </div>
    </div>
  );
}
