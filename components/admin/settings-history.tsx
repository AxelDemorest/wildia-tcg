import { getTranslations } from "next-intl/server";
import type { BoosterRefusals } from "@/components/admin/booster-settings-card";
import { RestoreSettingButton } from "@/components/admin/restore-setting-button";
import type { AppLocale } from "@/i18n/routing";
import { formatAdminDateTime } from "@/lib/admin/admin-dates";
import { boosterName } from "@/lib/admin/booster-name";
import {
  boosterFieldValues,
  type BoosterField,
  type BoosterSettings,
} from "@/lib/admin/booster-values";
import { formatCount } from "@/lib/admin/format-count";
import type { RestoreError } from "@/lib/admin/restore-setting";
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
  /** The booster définitions, with the current values of a booster row's restore dialog. */
  boosters: BoosterSettings[];
  /** What a restore dialog says when a row's Avant is refused, for each setting. */
  valueErrors: Record<EditableSetting, Record<SettingValueError, string>>;
  /** What a booster row's restore dialog says when the server refuses its value. */
  boosterRefusals: BoosterRefusals;
  locale: AppLocale;
};

/** A row's setting as the table names it, and its restore dialog's text and messages. */
type RowDescription = {
  label: string;
  /** None for a booster no longer defined: there is nothing to put the value back into. */
  restore?: { text: React.ReactNode; refusals: Partial<Record<RestoreError, string>> };
};

/** The message of a booster row whose Avant is out of its field's bounds; a flag has none. */
function outOfRangeMessage(field: BoosterField, refusals: BoosterRefusals): string | undefined {
  if (field === "is_active") return undefined;
  if (field === "cost_coins") return refusals.costCoins;
  if (field === "slots") return refusals.slots;
  if (field === "shop_weight") return refusals.shopWeight;
  return refusals.chance;
}

const TITLE_ID = "settings-history-title";

const head =
  "h-11 border-y border-admin-line bg-admin-table-head px-4 text-xs/4 font-semibold whitespace-nowrap text-admin-muted";
const cell =
  "h-[52px] border-t border-admin-neutral-soft px-4 whitespace-nowrap group-hover:bg-admin-row-hover";

/**
 * The historique des paramètres under the cards: the latest changes, newest first, with dates in
 * Paris time and values written for the locale, each with its "Restaurer" button (none for a
 * booster no longer defined). It scrolls sideways when narrower than 820 px.
 */
export async function SettingsHistory({
  changes,
  values,
  boosters,
  valueErrors,
  boosterRefusals,
  locale,
}: Props) {
  const [t, tAdmin, tPack] = await Promise.all([
    getTranslations("Admin.settings"),
    getTranslations("Admin"),
    getTranslations("Boosters.pack"),
  ]);
  const authorName = (author: SettingChangeAuthor) =>
    author.kind === "deleted"
      ? t("history.deletedAuthor")
      : (author.name ?? tAdmin("fallbackMemberName"));
  const strong = (chunks: React.ReactNode) => (
    <strong className="font-semibold text-admin-ink">{chunks}</strong>
  );
  const formatValue = (value: number | boolean) =>
    typeof value === "boolean"
      ? t(value ? "history.yes" : "history.no")
      : formatCount(value, locale);

  const describe = (change: SettingChange, before: string): RowDescription => {
    if ("setting" in change) {
      const { setting } = change;
      return {
        label: t(`fields.${setting}.label`),
        restore: {
          text: t.rich(`fields.${setting}.restoreText`, {
            from: formatCount(values[setting], locale),
            to: before,
            strong,
          }),
          refusals: valueErrors[setting],
        },
      };
    }
    const { slug, field } = change.booster;
    const booster = boosterName(slug, tPack);
    const current = boosters.find((candidate) => candidate.slug === slug);
    return {
      label: t(`boosters.fields.${field}.historyLabel`, { booster }),
      restore: current && {
        text: t.rich(`boosters.fields.${field}.restoreText`, {
          booster,
          from: formatValue(boosterFieldValues(current)[field]),
          to: before,
          strong,
        }),
        refusals: {
          out_of_range: outOfRangeMessage(field, boosterRefusals),
          no_available_booster: boosterRefusals.noAvailableBooster,
          no_positive_chance: boosterRefusals.noPositiveChance,
        },
      },
    };
  };

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
              const before = formatValue(change.before);
              const { label: setting, restore } = describe(change, before);
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
                    {formatValue(change.after)}
                  </td>
                  <td className={`${cell} pr-6 text-right`}>
                    {restore && (
                      <RestoreSettingButton
                        changeId={change.id}
                        text={restore.text}
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
                        refusals={restore.refusals}
                      />
                    )}
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
