import { describe, expect, it, vi } from "vitest";
import { runListAccounts } from "@/lib/admin/list-accounts";
import type { StaffSession } from "@/lib/auth/staff-session";

const session: StaffSession = { id: "staff-1", email: "boss@example.test", role: "super_admin" };

const rpcRows = [
  {
    id: "a-2",
    display_name: "Léa Martin",
    email: "lea.martin@example.com",
    signed_up_at: "2026-11-21T13:32:00+00:00",
    last_sign_in_at: "2026-11-22T08:00:00+00:00",
    locale: "fr",
    is_public: true,
  },
  {
    id: "a-1",
    display_name: null,
    email: "bob@example.com",
    signed_up_at: "2026-11-20T09:00:00+00:00",
    last_sign_in_at: null,
    locale: "en",
    is_public: false,
  },
];

function deps(total = 120) {
  return { fetchAccounts: vi.fn(async () => ({ total, accounts: rpcRows })) };
}

describe("runListAccounts", () => {
  it("asks the first page, with no search, as the first 50 rows", async () => {
    const d = deps();

    await runListAccounts(session, { search: "", page: 1 }, d);

    expect(d.fetchAccounts).toHaveBeenCalledTimes(1);
    expect(d.fetchAccounts).toHaveBeenCalledWith(
      expect.objectContaining({ search: null, limit: 50, offset: 0 }),
    );
  });

  it("asks page 3 of a search as rows 100 to 149", async () => {
    const d = deps();

    await runListAccounts(session, { search: "léa", page: 3 }, d);

    expect(d.fetchAccounts).toHaveBeenCalledWith(
      expect.objectContaining({ search: "léa", limit: 50, offset: 100 }),
    );
  });

  it("returns the search total and the rows in the function's order, camelCased", async () => {
    const result = await runListAccounts(session, { search: "", page: 1 }, deps(120));

    expect(result).toMatchObject({ kind: "page", total: 120, page: 1 });
    if (result.kind !== "page") throw new Error("expected a page");
    expect(result.accounts).toEqual([
      {
        id: "a-2",
        displayName: "Léa Martin",
        email: "lea.martin@example.com",
        signedUpAt: "2026-11-21T13:32:00+00:00",
        lastSignInAt: "2026-11-22T08:00:00+00:00",
        locale: "fr",
        isPublic: true,
      },
      {
        id: "a-1",
        displayName: null,
        email: "bob@example.com",
        signedUpAt: "2026-11-20T09:00:00+00:00",
        lastSignInAt: null,
        locale: "en",
        isPublic: false,
      },
    ]);
  });
});

// Slice 2: what each rôle d'équipe sees and searches.
const sessionOf = (role: StaffSession["role"]): StaffSession => ({ ...session, role });

describe("runListAccounts by rôle d'équipe", () => {
  it.each(["super_admin", "moderator"] as const)(
    "%s searches e-mails and gets them in clear",
    async (role) => {
      const d = deps();

      const result = await runListAccounts(sessionOf(role), { search: "bob", page: 1 }, d);

      expect(d.fetchAccounts).toHaveBeenCalledWith(expect.objectContaining({ searchEmail: true }));
      if (result.kind !== "page") throw new Error("expected a page");
      expect(result.emailsMasked).toBe(false);
      expect(result.accounts.map((account) => account.email)).toEqual([
        "lea.martin@example.com",
        "bob@example.com",
      ]);
    },
  );

  it("viewer: no e-mail search, masked e-mails, no clear e-mail anywhere in the result", async () => {
    const d = deps();

    const result = await runListAccounts(sessionOf("viewer"), { search: "bob", page: 1 }, d);

    expect(d.fetchAccounts).toHaveBeenCalledWith(expect.objectContaining({ searchEmail: false }));
    if (result.kind !== "page") throw new Error("expected a page");
    expect(result.emailsMasked).toBe(true);
    expect(result.accounts.map((account) => account.email)).toEqual([
      "l•••@e•••.com",
      "b•••@e•••.com",
    ]);
    const json = JSON.stringify(result);
    expect(json).not.toContain("lea.martin");
    expect(json).not.toContain("bob@example.com");
  });
});

// Slice 3: pages, redirects and failures.
describe("runListAccounts paging", () => {
  it("gives the page count of the search", async () => {
    const result = await runListAccounts(session, { search: "", page: 1 }, deps(120));

    expect(result).toMatchObject({ kind: "page", pageCount: 3 });
  });

  it("redirects a page past the last one to the last page", async () => {
    const d = { fetchAccounts: vi.fn(async () => ({ total: 120, accounts: [] })) };

    const result = await runListAccounts(session, { search: "léa", page: 4 }, d);

    expect(result).toEqual({ kind: "redirect", page: 3 });
  });

  it("redirects page 2 of a search with no match to page 1", async () => {
    const d = { fetchAccounts: vi.fn(async () => ({ total: 0, accounts: [] })) };

    const result = await runListAccounts(session, { search: "zzz", page: 2 }, d);

    expect(result).toEqual({ kind: "redirect", page: 1 });
  });

  it("shows page 1 of a search with no match as an empty page, not a redirect", async () => {
    const d = { fetchAccounts: vi.fn(async () => ({ total: 0, accounts: [] })) };

    const result = await runListAccounts(session, { search: "zzz", page: 1 }, d);

    expect(result).toMatchObject({ kind: "page", total: 0, page: 1, accounts: [] });
  });

  it("gives a failed result when the read throws", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const d = {
      fetchAccounts: vi.fn(async () => {
        throw new Error("database unavailable");
      }),
    };

    const result = await runListAccounts(session, { search: "", page: 1 }, d);

    expect(result).toEqual({ kind: "failed", emailsMasked: false });
    logged.mockRestore();
  });

  it("tells a viewer's failed read that e-mails are masked, for the search label", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const d = {
      fetchAccounts: vi.fn(async () => {
        throw new Error("database unavailable");
      }),
    };

    const result = await runListAccounts(sessionOf("viewer"), { search: "", page: 1 }, d);

    expect(result).toEqual({ kind: "failed", emailsMasked: true });
    logged.mockRestore();
  });

  it("redirects page 2 of an empty registry, with no search, to page 1", async () => {
    const d = { fetchAccounts: vi.fn(async () => ({ total: 0, accounts: [] })) };

    const result = await runListAccounts(session, { search: "", page: 2 }, d);

    expect(result).toEqual({ kind: "redirect", page: 1 });
  });
});

// An account the SQL function gives with no e-mail.
describe("runListAccounts with an account without e-mail", () => {
  const noEmailRows = [{ ...rpcRows[0], email: null }, rpcRows[1]];
  const noEmailDeps = () => ({
    fetchAccounts: vi.fn(async () => ({ total: 2, accounts: noEmailRows })),
  });

  it("gives a null e-mail to a super_admin", async () => {
    const result = await runListAccounts(session, { search: "", page: 1 }, noEmailDeps());

    if (result.kind !== "page") throw new Error("expected a page");
    expect(result.accounts.map((account) => account.email)).toEqual([null, "bob@example.com"]);
  });

  it("gives a null e-mail to a viewer, without masking it, and masks the others", async () => {
    const result = await runListAccounts(
      sessionOf("viewer"),
      { search: "", page: 1 },
      noEmailDeps(),
    );

    if (result.kind !== "page") throw new Error("expected a page");
    expect(result.accounts.map((account) => account.email)).toEqual([null, "b•••@e•••.com"]);
  });
});
