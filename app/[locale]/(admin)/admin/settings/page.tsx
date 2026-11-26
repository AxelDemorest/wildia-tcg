import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SettingCard } from "@/components/admin/setting-card";
import { SettingsHistory } from "@/components/admin/settings-history";
import {
  SETTING_RULES,
  SETTINGS_ROLE,
  type EditableSetting,
  type SettingValueError,
} from "@/lib/admin/setting-values";
import { knownLocaleOrDefault } from "@/lib/auth/return-to";
import { loadSettings } from "@/server/admin/settings";
import { requireStaff } from "@/server/auth/require-staff";
import { staffPageMetadata } from "@/server/auth/staff-metadata";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return staffPageMetadata(locale, "settings");
}

export default async function AdminSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireStaff(locale, `/${locale}/admin/settings`, SETTINGS_ROLE);
  const [settings, t] = await Promise.all([
    loadSettings(session),
    getTranslations("Admin.settings"),
  ]);
  // requireStaff has already sent any other rôle d’équipe away: the same outcome if one got here.
  if (settings.kind === "forbidden") redirect(`/${locale}/admin`);

  const header = (
    <header className="flex flex-col gap-1">
      <h1 className="text-2xl/8 font-semibold text-admin-ink lg:text-[28px]/9">{t("title")}</h1>
      <p className="text-admin-muted">{t("subtitle")}</p>
    </header>
  );

  if (settings.kind === "failed") {
    return (
      <>
        {header}
        <p className="rounded-xl border border-admin-line bg-white p-4">{t("loadFailed")}</p>
      </>
    );
  }

  const { values, history } = settings;
  const slotsOutOfRange = t("fields.booster_shop_slot_count.outOfRange");
  const valueErrors: Record<EditableSetting, Record<SettingValueError, string>> = {
    farm_global_multiplier: {
      out_of_range: t("fields.farm_global_multiplier.outOfRange"),
      too_precise: t("fields.farm_global_multiplier.tooPrecise"),
    },
    // A whole number: a decimal is out of range too, and its message says so.
    booster_shop_slot_count: { out_of_range: slotsOutOfRange, too_precise: slotsOutOfRange },
  };
  const labels = { save: t("save"), saved: t("saved"), failed: t("saveFailed") };
  const multiplier = SETTING_RULES.farm_global_multiplier;
  const slots = SETTING_RULES.booster_shop_slot_count;

  return (
    <>
      {header}

      {/* One card per group of settings, side by side while each has 360 px. */}
      <div className="flex flex-wrap gap-4">
        <SettingCard
          setting="farm_global_multiplier"
          value={values.farm_global_multiplier}
          title={t("economy")}
          label={t("fields.farm_global_multiplier.label")}
          help={t("fields.farm_global_multiplier.help")}
          unit="×"
          min={multiplier.min}
          max={multiplier.max}
          step={0.1}
          labels={labels}
          valueErrors={valueErrors.farm_global_multiplier}
        />
        <SettingCard
          setting="booster_shop_slot_count"
          value={values.booster_shop_slot_count}
          title={t("shop")}
          label={t("fields.booster_shop_slot_count.label")}
          help={t("fields.booster_shop_slot_count.help")}
          min={slots.min}
          max={slots.max}
          step={1}
          labels={labels}
          valueErrors={valueErrors.booster_shop_slot_count}
        />
      </div>

      <SettingsHistory
        changes={history}
        values={values}
        valueErrors={valueErrors}
        locale={knownLocaleOrDefault(locale)}
      />
    </>
  );
}
