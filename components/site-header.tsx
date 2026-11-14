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
import { Link } from "@/i18n/navigation";
import { getUser } from "@/server/auth/require-user";

type Props = { locale: string };

export async function SiteHeader({ locale }: Props) {
  const t = await getTranslations("Home");
  const user = await getUser();

  const navItems: SiteNavItem[] = [
    { href: "/", label: t("navHome"), exact: true },
    { href: "/cards", label: t("catalog") },
    { href: "/boosters", label: t("boosters") },
    { href: "/collection", label: t("collection") },
  ];

  return (
    <header className="shrink-0 border-0 bg-transparent">
      <div className="relative mx-auto w-full max-w-7xl px-4 py-4 sm:px-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Link
            href="/"
            aria-label="WILDIA TCG"
            className="flex min-w-0 items-center gap-2.5 justify-self-start rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            <BrandLogo alt="" priority aria-hidden className="h-9 w-auto sm:h-10" />
            <span className="hidden min-[420px]:inline">
              <BrandWordmark />
            </span>
          </Link>

          <div className="hidden justify-self-center md:block">
            <SiteNavPills items={navItems} />
          </div>

          <div className="flex items-center justify-end gap-2 justify-self-end sm:gap-2.5">
            {user ? (
              <>
                <Suspense fallback={<HeaderCurrencyOrbSkeleton />}>
                  <HeaderCurrencyOrb userId={user.id} />
                </Suspense>
                <Suspense fallback={<HeaderProfileSkeleton />}>
                  <HeaderProfile userId={user.id} locale={locale} email={user.email} />
                </Suspense>
              </>
            ) : (
              <HeaderGuestActions />
            )}
          </div>
        </div>

        <div className="mt-3 flex justify-center md:hidden">
          <SiteNavPills items={navItems} />
        </div>
      </div>
    </header>
  );
}
