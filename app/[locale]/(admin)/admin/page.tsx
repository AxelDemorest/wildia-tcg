import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  AdminArrowRightIcon,
  AdminShieldIcon,
  AdminUserPlusIcon,
  AdminUsersIcon,
} from "@/components/admin/admin-icons";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { AdminRoleBadge } from "@/components/admin/admin-role-badge";
import { Link } from "@/i18n/navigation";
import { knownLocaleOrDefault } from "@/lib/auth/return-to";
import { loadAdminHome } from "@/server/admin/home";
import { requireStaff } from "@/server/auth/require-staff";
import { staffPageMetadata } from "@/server/auth/staff-metadata";

type Props = { params: Promise<{ locale: string }> };

const cardTitle = "font-display text-lg/6 font-semibold text-admin-ink";
const bigCard = "flex flex-col gap-3 rounded-xl border border-admin-line bg-white p-6";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return staffPageMetadata(locale, "home");
}

export default async function AdminHomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireStaff(locale, `/${locale}/admin`);
  const { role, indicators } = await loadAdminHome(session);
  const [t, tAccounts, tRoles] = await Promise.all([
    getTranslations("Admin.home"),
    getTranslations("Admin.accounts"),
    getTranslations("Admin.roles"),
  ]);
  const appLocale = knownLocaleOrDefault(locale);

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl/8 font-semibold text-admin-ink lg:text-[28px]/9">{t("title")}</h1>
        <p className="text-admin-muted">{t("subtitle")}</p>
      </header>

      <div className="flex flex-wrap gap-4">
        <AdminKpiCard
          label={t("kpi.accounts.label")}
          caption={t("kpi.accounts.caption")}
          value={indicators.accounts}
          unavailableLabel={t("unavailable")}
          locale={appLocale}
          icon={<AdminUsersIcon className="size-4" />}
        />
        <AdminKpiCard
          label={t("kpi.signups.label")}
          caption={t("kpi.signups.caption")}
          value={indicators.signups}
          unavailableLabel={t("unavailable")}
          locale={appLocale}
          icon={<AdminUserPlusIcon className="size-4" />}
        />
        <AdminKpiCard
          label={t("kpi.teamMembers.label")}
          caption={t("kpi.teamMembers.caption")}
          value={indicators.teamMembers}
          unavailableLabel={t("unavailable")}
          locale={appLocale}
          icon={<AdminShieldIcon className="size-4" />}
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <section className={`${bigCard} flex-[2_1_360px]`}>
          <h2 className={cardTitle}>{tAccounts("title")}</h2>
          <p className="text-admin-text">{t("registry.text")}</p>
          <Link
            href="/admin/accounts"
            className="mt-1 inline-flex h-10 items-center gap-2 self-start rounded-[8px] bg-brand px-4 font-semibold text-white"
          >
            {t("registry.open")}
            <AdminArrowRightIcon className="size-4" />
          </Link>
        </section>

        <section className={`${bigCard} flex-[1_1_280px]`}>
          <h2 className={cardTitle}>{t("role.title")}</h2>
          <AdminRoleBadge role={role} label={tRoles(role)} />
          <p className="text-admin-text">{t(`roleHelp.${role}`)}</p>
        </section>
      </div>
    </>
  );
}
