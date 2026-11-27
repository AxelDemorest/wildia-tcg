import { AdminArrowDownIcon, AdminLockIcon } from "@/components/admin/admin-icons";
import { GrantCoinsButton, type GrantCoinsLabels } from "@/components/admin/grant-coins-button";
import { CoinIcon } from "@/components/ui/icons";
import type { AppLocale } from "@/i18n/routing";
import { formatAdminDate, formatAdminDateTime } from "@/lib/admin/admin-dates";
import { formatCount } from "@/lib/admin/format-count";
import type { RegistryAccount } from "@/lib/admin/list-accounts";
import { initials } from "@/lib/profiles/initials";

export type AccountsTableLabels = {
  caption: string;
  name: string;
  email: string;
  signedUp: string;
  lastSignIn: string;
  locale: string;
  profile: string;
  balance: string;
  /** The balance header's tooltip: what "at its last calculation" means. */
  balanceHelp: string;
  noDisplayName: string;
  never: string;
  public: string;
  private: string;
  /** The one row of a search with no match. */
  empty: string;
};

/** The super administrateur's column: its hidden header, and the texts of a row's button. */
type GrantCoinsColumn = {
  header: string;
  /** The texts of the button of an account, given the name that designates it. */
  labelsFor: (name: string) => GrantCoinsLabels;
};

type Props = {
  accounts: RegistryAccount[];
  locale: AppLocale;
  labels: AccountsTableLabels;
  /** Null for a rôle d’équipe that does not add coins: the registry is read-only for it. */
  grantCoins: GrantCoinsColumn | null;
};

// Below 1024 px a line sets the sticky name column apart from the cells scrolling under it. Chrome
// paints no shadow on a cell of a collapsed-border table, hence the table's separate borders.
const stickyLine = "max-lg:shadow-[1px_0_0_var(--color-admin-line)]";
const head =
  "h-11 border-b border-admin-line bg-admin-table-head px-3 text-left text-xs/4 font-semibold whitespace-nowrap";
// The first row leaves the line under the header alone. The whole row lights up on hover, sticky
// name cell included (approved over the mockup).
const cell =
  "h-[52px] border-t border-admin-neutral-soft px-3 whitespace-nowrap group-first:border-t-0 group-hover:bg-admin-row-hover";
// 12 px of padding either side (not 16) keeps the eight columns of the super administrateur within
// the 944 px the table has at 1280 px. With the button column the e-mail, the widest cell, wraps
// from 1024 px (two lines fit the row's 52 px): a 54-character address would push the table past.
const wrappingEmail = "lg:whitespace-normal lg:[overflow-wrap:anywhere]";

/**
 * The registre des comptes inscrits, newest first: read-only, but for the super administrateur's
 * last column, an "Ajouter des pièces" button per account, named after the account's display name,
 * else its e-mail, an icon-only square. It scrolls sideways when narrower than 880 px, the name
 * column staying in view.
 * Phone variants of the mockup below 1024 px: no avatar, a text arrow on the sort column, plain
 * profile text. An account without e-mail shows a dash. With no account, one cell across all the
 * columns says the search matched nothing.
 */
export function AccountsTable({ accounts, locale, labels, grantCoins }: Props) {
  return (
    // Relative: the hidden header of the last column is positioned within the scroller, not past
    // the page.
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[880px] border-separate border-spacing-0">
        <caption className="sr-only">{labels.caption}</caption>
        <thead>
          <tr>
            <th scope="col" className={`${head} sticky left-0 z-1 text-admin-muted ${stickyLine}`}>
              {labels.name}
            </th>
            <th scope="col" className={`${head} text-admin-muted`}>
              {labels.email}
            </th>
            <th scope="col" aria-sort="descending" className={`${head} text-admin-ink`}>
              <span className="inline-flex items-center gap-1">
                {labels.signedUp}
                <AdminArrowDownIcon className="size-3.5 max-lg:hidden" />
                <span aria-hidden className="lg:hidden">
                  ↓
                </span>
              </span>
            </th>
            <th scope="col" className={`${head} text-admin-muted`}>
              {labels.lastSignIn}
            </th>
            <th scope="col" className={`${head} text-admin-muted`}>
              {labels.locale}
            </th>
            <th scope="col" className={`${head} text-admin-muted`}>
              {labels.profile}
            </th>
            <th
              scope="col"
              title={labels.balanceHelp}
              className={`${head} text-right text-admin-muted`}
            >
              {labels.balance}
            </th>
            {grantCoins && (
              <th scope="col" className={head}>
                <span className="sr-only">{grantCoins.header}</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {accounts.length === 0 && (
            <tr>
              <td colSpan={grantCoins ? 8 : 7} className="h-[52px] px-4 text-admin-muted">
                {labels.empty}
              </td>
            </tr>
          )}
          {accounts.map((account) => (
            <tr key={account.id} className="group">
              <th
                scope="row"
                className={`${cell} sticky left-0 bg-white text-left font-medium text-admin-ink ${stickyLine}`}
              >
                <span className="inline-flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className="hidden size-7 shrink-0 items-center justify-center rounded-full bg-admin-subtle text-xs font-semibold text-admin-text lg:inline-flex"
                  >
                    {account.displayName ? initials(account.displayName) : "?"}
                  </span>
                  {account.displayName ?? (
                    <span className="text-admin-muted">{labels.noDisplayName}</span>
                  )}
                </span>
              </th>
              <td className={grantCoins ? `${cell} ${wrappingEmail}` : cell}>
                {account.email ?? <span className="text-admin-muted">—</span>}
              </td>
              <td className={`${cell} tabular-nums`}>
                {formatAdminDate(account.signedUpAt, locale)}
              </td>
              <td className={`${cell} tabular-nums`}>
                {account.lastSignInAt
                  ? formatAdminDateTime(account.lastSignInAt, locale)
                  : labels.never}
              </td>
              <td className={cell}>
                <span className="inline-flex h-[22px] items-center rounded-[6px] bg-admin-subtle px-2 text-xs font-semibold tracking-[0.04em]">
                  {account.locale.toUpperCase()}
                </span>
              </td>
              <td className={cell}>
                {account.isPublic ? (
                  <span className="inline-flex items-center gap-1.5 lg:font-medium lg:text-brand-strong">
                    <span aria-hidden className="hidden size-2 rounded-full bg-brand lg:block" />
                    {labels.public}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 lg:font-medium lg:text-admin-muted">
                    <AdminLockIcon className="hidden size-3.5 lg:block" />
                    {labels.private}
                  </span>
                )}
              </td>
              <td className={`${cell} text-right tabular-nums`}>
                <span className="inline-flex items-center gap-1.5">
                  <CoinIcon className="size-4 shrink-0" />
                  {formatCount(account.balance, locale)}
                </span>
              </td>
              {grantCoins && (
                <td className={cell}>
                  <GrantCoinsButton
                    userId={account.id}
                    locale={locale}
                    labels={grantCoins.labelsFor(
                      account.displayName ?? account.email ?? labels.noDisplayName,
                    )}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
