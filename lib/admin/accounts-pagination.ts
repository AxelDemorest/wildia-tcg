/** Accounts on one page of the registre des comptes inscrits. */
export const ACCOUNTS_PAGE_SIZE = 50;

/** The query of a link to a registry page: `q` only with a search, `page` only past page 1. */
export type AccountsPageQuery = { q?: string; page?: string };

export type AccountsPagination = {
  /** The rows the page shows, from 1. */
  from: number;
  to: number;
  pageCount: number;
  /** The query of the previous page's link, null on the first page. */
  previous: AccountsPageQuery | null;
  /** The query of the next page's link, null on the last page. */
  next: AccountsPageQuery | null;
};

/** How many pages the search's accounts fill. A search with no match still has its page 1. */
export function accountsPageCount(total: number): number {
  return Math.max(1, Math.ceil(total / ACCOUNTS_PAGE_SIZE));
}

/** The query of page `page` of the search: the registry's links and redirects keep the search. */
export function accountsPageQuery(search: string, page: number): AccountsPageQuery {
  const query: AccountsPageQuery = {};
  if (search) query.q = search;
  if (page > 1) query.page = String(page);
  return query;
}

/** The footer of a registry page: the rows it shows and where its previous and next links go. */
export function accountsPagination({
  page,
  total,
  search,
}: {
  page: number;
  total: number;
  search: string;
}): AccountsPagination {
  const pageCount = accountsPageCount(total);

  return {
    from: (page - 1) * ACCOUNTS_PAGE_SIZE + 1,
    to: Math.min(page * ACCOUNTS_PAGE_SIZE, total),
    pageCount,
    previous: page > 1 ? accountsPageQuery(search, page - 1) : null,
    next: page < pageCount ? accountsPageQuery(search, page + 1) : null,
  };
}
