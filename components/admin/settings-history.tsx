import { getTranslations } from "next-intl/server";
import { RestoreSettingButton } from "@/components/admin/restore-setting-button";
import type { AppLocale } from "@/i18n/routing";
import { formatAdminDateTime } from "@/lib/admin/admin-dates";
import { formatCount } from "@/lib/admin/format-count";
import type { EditableSetting, SettingValueError } from "@/lib/admin/setting-values";
import {
  SETTINGS_HISTORY_LIMIT,
  type SettingChange,
  type SettingChangeAuthor,
} from "@/lib/admin/settings-page";

type Props = {
  changes: SettingChange[];
  /** The current value of each setting: a restore dialog says what it changes from. */
  values: Record<EditableSetting, number>;
  /** What a restore dialog says when a row's Avant is refused, for each setting. */
  valueErrors: Record<EditableSetting, Record<SettingValueError, string>>;
  locale: AppLocale;
};

const TITLE_ID = "settings-history-title";

const head =
  "h-11 border-y border-admin-line bg-admin-table-head px-4 text-xs/4 font-semibold whitespace-nowrap text-admin-muted";
const cell =
  "h-[52px] border-t border-admin-neutral-soft px-4 whitespace-nowrap group-hover:bg-admin-row-hover";

/**
 * The historique des paramètres under the cards: the latest changes, newest first, with dates in
 * Paris time and values written for the locale, each with its "Restaurer" button. It scrolls
 * sideways when narrower than 820 px.
 */
export async function SettingsHistory({ changes, values, valueErrors, locale }: Props) {
  const [t, tAdmin] = await Promise.all([
    getTranslations("Admin.settings"),
    getTranslations("Admin"),
  ]);
  const authorName = (author: SettingChangeAuthor) =>
    author.kind === "deleted"
      ? t("history.deletedAuthor")
      : (author.name ?? tAdmin("fallbackMemberName"));
  const strong = (chunks: React.ReactNode) => (
    <strong className="font-semibold text-admin-ink">{chunks}</strong>
  );

  return (
    <section className="overflow-hidden rounded-xl border border-admin-line bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-6 py-5">
        <h2 id={TITLE_ID} className="text-lg/6 font-semibold text-admin-ink">
          {t("history.title")}
        </h2>
        <p className="text-[13px]/[18px] text-admin-muted">
          {t("history.note", { count: SETTINGS_HISTORY_LIMIT })}
        </p>
      </div>
      {/* Relative: the hidden "Action" header is positioned within the scroller, not past the page. */}
      <div className="relative overflow-x-auto">
        <table aria-labelledby={TITLE_ID} className="w-full min-w-[820px] border-collapse">
          <thead>
            <tr>
              <th scope="col" className={`${head} pl-6 text-left`}>
                {t("history.date")}
              </th>
              <th scope="col" className={`${head} text-left`}>
                {t("history.author")}
              </th>
              <th scope="col" className={`${head} text-left`}>
                {t("history.setting")}
              </th>
              <th scope="col" className={`${head} text-right`}>
                {t("history.before")}
              </th>
              <th scope="col" className={`${head} text-right`}>
                {t("history.after")}
              </th>
              <th scope="col" className={`${head} pr-6`}>
                <span className="sr-only">{t("history.action")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {changes.length === 0 && (
              <tr>
                <td colSpan={6} className={`${cell} pl-6 text-admin-muted`}>
                  {t("history.empty")}
                </td>
              </tr>
            )}
            {changes.map((change) => {
              const setting = t(`fields.${change.setting}.label`);
              const before = formatCount(change.before, locale);
              return (
                <tr key={change.id} className="group">
                  <td className={`${cell} pl-6 text-admin-text tabular-nums`}>
                    {formatAdminDateTime(change.changedAt, locale)}
                  </td>
                  <td className={`${cell} text-admin-text`}>{authorName(change.author)}</td>
                  <td className={`${cell} text-admin-ink`}>
                    <span className="inline-flex items-center gap-2">
                      {setting}
                      {change.isRestore && (
                        <span className="inline-flex h-[22px] items-center rounded-[6px] bg-admin-subtle px-2 text-[12px] font-semibold text-admin-text">
                          {t("history.restored")}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className={`${cell} text-right text-admin-muted tabular-nums`}>{before}</td>
                  <td className={`${cell} text-right font-medium text-admin-ink tabular-nums`}>
                    {formatCount(change.after, locale)}
                  </td>
                  <td className={`${cell} pr-6 text-right`}>
                    <RestoreSettingButton
                      changeId={change.id}
                      text={t.rich(`fields.${change.setting}.restoreText`, {
                        from: formatCount(values[change.setting], locale),
                        to: before,
                        strong,
                      })}
                      labels={{
                        restoreText: t("history.restoreText"),
                        restoreAccessibleName: t("history.restoreAccessibleName", {
                          setting,
                          value: before,
                        }),
                        title: t("restoreDialog.title"),
                        cancel: t("restoreDialog.cancel"),
                        confirm: t("restoreDialog.confirm"),
                        failed: t("restoreFailed"),
                      }}
                      valueErrors={valueErrors[change.setting]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
