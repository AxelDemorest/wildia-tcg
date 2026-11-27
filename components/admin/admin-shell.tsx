import { getTranslations } from "next-intl/server";
import {
  AdminArrowLeftIcon,
  AdminHomeIcon,
  AdminSettingsIcon,
  AdminUsersIcon,
} from "@/components/admin/admin-icons";
import { AdminNav, type AdminNavItem } from "@/components/admin/admin-nav";
import { idleSidebarEntry, topBarIconButton } from "@/components/admin/admin-nav-styles";
import { AdminNotifications } from "@/components/admin/admin-notifications";
import { AdminSignOut } from "@/components/admin/admin-sign-out";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Link } from "@/i18n/navigation";
import { SETTINGS_ROLE } from "@/lib/admin/setting-values";
import type { StaffSession } from "@/lib/auth/staff-session";
import { displayLabel } from "@/lib/profiles/display-label";
import { initials } from "@/lib/profiles/initials";
import { getOwnProfile } from "@/server/profiles/queries";

type Props = {
  locale: string;
  session: StaffSession;
  children: React.ReactNode;
};

/**
 * The espace administration's frame, apart from the site: no player header, footer, stats bar or
 * chat. `data-admin-shell` turns the whole canvas light (app/globals.css) while it is in the page.
 * From 1024 px a sidebar fixed on screen, below it a top bar that scrolls with the page.
 */
export async function AdminShell({ locale, session, children }: Props) {
  const t = await getTranslations("Admin");
  // A failed profile read only costs the display name, as in the site header.
  const profile = await getOwnProfile(session.id).catch(() => null);
  const memberName = displayLabel(profile?.display_name, session.email, t("fallbackMemberName"));

  const navItems: AdminNavItem[] = [
    { href: "/admin", label: t("nav.home"), icon: <AdminHomeIcon /> },
    { href: "/admin/accounts", label: t("nav.accounts"), icon: <AdminUsersIcon /> },
    // Hidden from the other rôles d’équipe, which the page sends to the admin home.
    ...(session.role === SETTINGS_ROLE
      ? [{ href: "/admin/settings", label: t("nav.settings"), icon: <AdminSettingsIcon /> }]
      : []),
  ];

  return (
    <div data-admin-shell className="flex flex-1 flex-col text-sm text-admin-text lg:flex-row">
      <nav
        aria-label={t("area")}
        className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-7 overflow-y-auto border-r border-admin-line bg-white px-4 py-5 lg:flex"
      >
        <div className="flex items-center gap-2.5 px-2 py-1">
          <BrandLogo alt="" aria-hidden className="size-7" />
          <div className="flex flex-col">
            <span className="font-display text-base/5 font-bold tracking-[0.04em] text-admin-ink">
              WILDIA
            </span>
            <span className="text-xs text-admin-muted">{t("area")}</span>
          </div>
        </div>

        <AdminNav items={navItems} variant="sidebar" />

        <div className="grow" />

        <div className="flex flex-col gap-1 border-t border-admin-line pt-4">
          <div className="flex min-w-0 items-center gap-2.5 px-3 py-2">
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-admin-brand-soft text-[13px] font-semibold text-brand-strong"
            >
              {initials(memberName)}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span title={memberName} className="truncate font-semibold text-admin-ink">
                {memberName}
              </span>
              <span className="text-xs text-admin-muted">{t(`roles.${session.role}`)}</span>
            </div>
          </div>
          <Link href="/" className={idleSidebarEntry}>
            <AdminArrowLeftIcon />
            {t("nav.backToSite")}
          </Link>
          <AdminSignOut locale={locale} label={t("nav.signOut")} variant="sidebar" />
        </div>
      </nav>

      <header className="border-b border-admin-line bg-white lg:hidden">
        <div className="flex h-14 items-center justify-between gap-2 pr-2 pl-4">
          <div className="flex min-w-0 items-center gap-2">
            <BrandLogo alt="" aria-hidden className="size-6" />
            <div className="flex min-w-0 flex-col">
              <span className="font-display text-[15px]/[18px] font-bold tracking-[0.04em] text-admin-ink">
                WILDIA
              </span>
              <span className="text-[11px]/[14px] text-admin-muted">{t("area")}</span>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <Link href="/" aria-label={t("nav.backToSite")} className={topBarIconButton}>
              <AdminArrowLeftIcon className="size-5" />
            </Link>
            <AdminSignOut locale={locale} label={t("nav.signOut")} variant="icon" />
          </div>
        </div>
        <nav aria-label={t("area")}>
          <AdminNav items={navItems} variant="tabs" />
        </nav>
      </header>

      <main className="min-w-0 flex-1 px-4 pt-5 pb-8 lg:px-10 lg:pt-8 lg:pb-12">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-4 lg:gap-6">
          <AdminNotifications>{children}</AdminNotifications>
        </div>
      </main>
    </div>
  );
}
