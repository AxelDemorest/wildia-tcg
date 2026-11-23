import { AdminArrowDownIcon, AdminLockIcon } from "@/components/admin/admin-icons";
import type { AppLocale } from "@/i18n/routing";
import { formatAdminDate, formatAdminDateTime } from "@/lib/admin/admin-dates";
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
  noDisplayName: string;
  never: string;
  public: string;
  private: string;
  /** The one row of a search with no match. */
  empty: string;
};

type Props = { accounts: RegistryAccount[]; locale: AppLocale; labels: AccountsTableLabels };

// Below 1024 px a line sets the sticky name column apart from the cells scrolling under it. Chrome
// paints no shadow on a cell of a collapsed-border table, hence the table's separate borders.
const stickyLine = "max-lg:shadow-[1px_0_0_var(--color-admin-line)]";
const head =
  "h-11 border-b border-admin-line bg-admin-table-head px-4 text-left text-xs/4 font-semibold whitespace-nowrap";
// The first row leaves the line under the header alone. The whole row lights up on hover, sticky
// name cell included (approved over the mockup).
const cell =
  "h-[52px] border-t border-admin-neutral-soft px-4 whitespace-nowrap group-first:border-t-0 group-hover:bg-admin-row-hover";

/**
 * The registre des comptes inscrits, read-only, newest first. It scrolls sideways when narrower
 * than 880 px, the name column staying in view. Phone variants of the mockup below 1024 px: no
 * avatar, a text arrow on the sort column, plain profile text. An account without e-mail shows a
 * dash. With no account, one cell across the six columns says the search matched nothing.
 */
export function AccountsTable({ accounts, locale, labels }: Props) {
  return (
    <div className="overflow-x-auto">
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
          </tr>
        </thead>
        <tbody>
          {accounts.length === 0 && (
            <tr>
              <td colSpan={6} className="h-[52px] px-4 text-admin-muted">
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
              <td className={cell}>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
