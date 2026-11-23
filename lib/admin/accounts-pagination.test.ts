import { describe, expect, it } from "vitest";
import { accountsPagination } from "@/lib/admin/accounts-pagination";

// The contract under test (slice 3; the plan names the module, not the function):
//   accountsPagination({ page, total, search }) ->
//     { from, to, pageCount, previous, next }
//   from/to: the 1-based range of rows on the page; pageCount: pages of 50.
//   previous/next: null when there is no such page, else the query of its link as a record of
//   strings: `q` only when there is a search, `page` only when it is not page 1.

describe("accountsPagination", () => {
  it("on the first of 26 pages: rows 1 to 50, no previous page, next is page 2", () => {
    expect(accountsPagination({ page: 1, total: 1284, search: "" })).toEqual({
      from: 1,
      to: 50,
      pageCount: 26,
      previous: null,
      next: { page: "2" },
    });
  });

  it("on the last page: the rows left, previous is the page before, no next page", () => {
    expect(accountsPagination({ page: 26, total: 1284, search: "" })).toEqual({
      from: 1251,
      to: 1284,
      pageCount: 26,
      previous: { page: "25" },
      next: null,
    });
  });

  it("keeps the search in the links, and leaves page 1 implicit", () => {
    expect(accountsPagination({ page: 2, total: 51, search: "léa" })).toEqual({
      from: 51,
      to: 51,
      pageCount: 2,
      previous: { q: "léa" },
      next: null,
    });
  });
});
