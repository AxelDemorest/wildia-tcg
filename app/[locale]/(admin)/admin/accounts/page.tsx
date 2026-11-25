import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountsPagination } from "@/components/admin/accounts-pagination";
import { AccountsSearch } from "@/components/admin/accounts-search";
import { AccountsTable } from "@/components/admin/accounts-table";
import type { AppLocale } from "@/i18n/routing";
import { accountsPageQuery, accountsPagination } from "@/lib/admin/accounts-pagination";
import { parsePage, parseSearchTerm } from "@/lib/admin/accounts-query";
import { formatCount } from "@/lib/admin/format-count";
import { GRANT_COINS_ROLE, GRANTED_AMOUNT_PLACEHOLDER } from "@/lib/admin/grant-coins";
import type { AccountsPage } from "@/lib/admin/list-accounts";
import { knownLocaleOrDefault } from "@/lib/auth/return-to";
import { listAccounts } from "@/server/admin/list-accounts";
import { requireStaff } from "@/server/auth/require-staff";
import { staffPageMetadata } from "@/server/auth/staff-metadata";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** The footer's links, and the numbers of its texts written for the locale. */
function footerOf({ page, total, pageCount }: AccountsPage, search: string, locale: AppLocale) {
  const { from, to, previous, next } = accountsPagination({ page, total, search });
  const write = (value: number) => formatCount(value, locale);

  return {
    previous,
    next,
    range: { count: total, from: write(from), to: write(to), total: write(total) },
    pages: { page: write(page), pageCount: write(pageCount) },
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return staffPageMetadata(locale, "accounts");
}

export default async function AdminAccountsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const path = `/${locale}/admin/accounts`;
  const session = await requireStaff(locale, path);
  const { q, page: pageParam } = await searchParams;
  const search = parseSearchTerm(q);
  const page = parsePage(pageParam);
  const registry = await listAccounts(session, { search, page });

  // Past the last page: the last page of the same search.
  if (registry.kind === "redirect") {
    const query = new URLSearchParams(accountsPageQuery(search, registry.page)).toString();
    redirect(query ? `${path}?${query}` : path);
  }

  const t = await getTranslations("Admin.accounts");
  const appLocale = knownLocaleOrDefault(locale);
  // The registry is read-only but for the super administrateur, who adds coins from it.
  const canGrantCoins = session.role === GRANT_COINS_ROLE;
  // No footer under a search with no match.
  const footer =
    registry.kind === "page" && registry.accounts.length > 0
      ? footerOf(registry, search, appLocale)
      : null;

  return (
    // The registry's own spacing (admin mockup): 16 px on a phone, 20 px from 1024 px.
    <div className="flex flex-col gap-4 lg:gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl/8 font-semibold text-admin-ink lg:text-[28px]/9">{t("title")}</h1>
        {registry.kind === "page" && (
          <p className="text-admin-muted">
            {t(canGrantCoins ? "subtitle" : "subtitleReadOnly", {
              count: registry.total,
              total: formatCount(registry.total, appLocale),
            })}
          </p>
        )}
      </header>

      <AccountsSearch
        action={path}
        term={search}
        page={page}
        label={t(registry.emailsMasked ? "search.name" : "search.nameOrEmail")}
        submitLabel={t("search.submit")}
        hint={registry.emailsMasked ? t("search.emailsMasked") : null}
      />

      <div className="overflow-hidden rounded-xl border border-admin-line bg-white">
        {registry.kind === "failed" ? (
          <p className="p-4">{t("loadFailed")}</p>
        ) : (
          <AccountsTable
            accounts={registry.accounts}
            locale={appLocale}
            labels={{
              caption: t("table.caption"),
              name: t("table.name"),
              email: t("table.email"),
              signedUp: t("table.signedUp"),
              lastSignIn: t("table.lastSignIn"),
              locale: t("table.locale"),
              profile: t("table.profile"),
              balance: t("table.balance"),
              balanceHelp: t("table.balanceHelp"),
              noDisplayName: t("table.noDisplayName"),
              never: t("table.never"),
              public: t("table.public"),
              private: t("table.private"),
              empty: t("table.empty"),
            }}
            grantCoins={
              canGrantCoins
                ? {
                    header: t("coins.column"),
                    labelsFor: (name) => ({
                      tooltip: t("coins.open"),
                      openAccessibleName: t("coins.openAccessibleName", { name }),
                      title: t("coins.title"),
                      text: t.rich("coins.text", {
                        name,
                        strong: (chunks) => (
                          <strong className="font-semibold text-admin-ink">{chunks}</strong>
                        ),
                      }),
                      amount: t("coins.amount"),
                      unit: t("coins.unit"),
                      reason: t("coins.reason"),
                      amountOutOfRange: t("coins.amountOutOfRange"),
                      reasonTooLong: t("coins.reasonTooLong"),
                      unknownAccount: t("coins.unknownAccount"),
                      failed: t("coins.failed"),
                      cancel: t("coins.cancel"),
                      confirm: t("coins.confirm"),
                      granted: t("coins.granted", { amount: GRANTED_AMOUNT_PLACEHOLDER, name }),
                    }),
                  }
                : null
            }
          />
        )}
        {footer && (
          <AccountsPagination
            previous={footer.previous}
            next={footer.next}
            labels={{
              range: t("pagination.range", footer.range),
              page: t("pagination.page", footer.pages),
              rangeAndPage: t("pagination.rangeAndPage", { ...footer.range, ...footer.pages }),
              previous: t("pagination.previous"),
              next: t("pagination.next"),
            }}
          />
        )}
      </div>
    </div>
  );
}
