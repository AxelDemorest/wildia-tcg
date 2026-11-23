import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { BrandLogo } from "@/components/layout/brand-logo";
import { BrandWordmark } from "@/components/layout/brand-wordmark";
import { HeaderCurrencyOrb } from "@/components/layout/header-currency-orb";
import { HeaderCurrencyOrbSkeleton } from "@/components/layout/header-currency-orb-skeleton";
import { HeaderGuestActions } from "@/components/layout/header-guest-actions";
import { HeaderProfile } from "@/components/layout/header-profile";
import { HeaderProfileSkeleton } from "@/components/layout/header-profile-skeleton";
import { SiteNavPills, type SiteNavItem } from "@/components/layout/site-nav-pills";
import { LocaleSelect } from "@/components/locale-switcher";
import { BellIcon, BinderIcon, BoosterIcon, CatalogIcon, HomeIcon, ProfileIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { getUser } from "@/server/auth/require-user";

type Props = { locale: string };

export async function SiteHeader({ locale }: Props) {
  const t = await getTranslations("Home");
  const tLayout = await getTranslations("Layout");
  const user = await getUser();

  const navItems: SiteNavItem[] = [
    { href: "/", label: t("navHome"), icon: <HomeIcon />, exact: true },
    { href: "/cards", label: t("catalog"), icon: <CatalogIcon /> },
    { href: "/boosters", label: t("boosters"), icon: <BoosterIcon /> },
    ...(user
      ? [{ href: `/players/${user.id}/collection`, label: t("collection"), icon: <BinderIcon /> }]
      : []),
    { href: user ? `/players/${user.id}` : "/login", label: t("profile"), icon: <ProfileIcon /> },
  ];

  return (
    <header className="sticky top-0 z-40 shrink-0 bg-[#141414]">
      <div className="flex min-h-[4.5rem] items-center gap-4 px-4 py-2 sm:px-6 xl:gap-5">
        <Link
          href="/"
          aria-label="WILDIA TCG"
          className="flex shrink-0 items-center gap-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <BrandLogo alt="" aria-hidden className="h-8 w-auto" />
          <span className="hidden min-[420px]:inline">
            <BrandWordmark className="origin-left scale-[0.82]" />
          </span>
        </Link>

        <div className="ml-2 hidden min-w-0 lg:block">
          <SiteNavPills items={navItems} label={tLayout("mainNavLabel")} />
        </div>

        <div className="ml-auto flex items-center gap-2.5 sm:gap-3 xl:gap-4">
          <div className="hidden items-center gap-4 text-[11px] font-medium uppercase tracking-wider text-muted 2xl:flex">
            <Link href="/#faq" className="transition hover:text-white">
              {tLayout("faq")}
            </Link>
            <Link href="/#how-it-works" className="transition hover:text-white">
              {tLayout("rules")}
            </Link>
          </div>

          <span className="hidden sm:inline-flex">
            <LocaleSelect label={tLayout("language")} />
          </span>

          {user ? (
            <>
              <Suspense fallback={<HeaderCurrencyOrbSkeleton />}>
                <HeaderCurrencyOrb userId={user.id} />
              </Suspense>
              <span
                title={tLayout("notifications")}
                aria-hidden
                className="hidden size-9 place-items-center rounded-xl bg-surface text-muted sm:grid"
              >
                <BellIcon />
              </span>
              <Suspense fallback={<HeaderProfileSkeleton />}>
                <HeaderProfile userId={user.id} locale={locale} email={user.email} />
              </Suspense>
            </>
          ) : (
            <HeaderGuestActions />
          )}
        </div>
      </div>

      <div className="px-4 pb-3 pt-0.5 sm:px-6 lg:hidden">
        <SiteNavPills items={navItems} label={tLayout("mainNavLabel")} />
      </div>
    </header>
  );
}
