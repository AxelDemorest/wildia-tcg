import { getTranslations } from "next-intl/server";
import { BrandLogo } from "@/components/layout/brand-logo";
import { BrandWordmark } from "@/components/layout/brand-wordmark";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";

type FooterLink = { href: string; label: string };
type FooterColumn = { title: string; links: FooterLink[] };

export async function SiteFooter() {
  const t = await getTranslations("Layout");
  const home = await getTranslations("Home");

  const columns: FooterColumn[] = [
    {
      title: t("footerGameTitle"),
      links: [
        { href: "/cards", label: home("catalog") },
        { href: "/boosters", label: home("boosters") },
        { href: "/collection", label: home("collection") },
      ],
    },
    {
      title: t("footerDiscoverTitle"),
      links: [
        { href: "/#how-it-works", label: home("howItWorksKicker") },
        { href: "/#features", label: home("featuresKicker") },
        { href: "/#faq", label: home("faqKicker") },
      ],
    },
    {
      title: t("footerAccountTitle"),
      links: [
        { href: "/login", label: home("login") },
        { href: "/signup", label: home("signup") },
        { href: "/settings/profile", label: home("profile") },
      ],
    },
  ];

  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto rounded-2xl border border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto w-full max-w-7xl px-5 pb-6 pt-10 sm:px-8 sm:pt-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)] lg:gap-16">
          <div className="max-w-sm">
            <Link
              href="/"
              aria-label="WILDIA TCG"
              className="inline-flex items-center gap-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <BrandLogo alt="" aria-hidden className="h-9 w-auto" />
              <BrandWordmark />
            </Link>
            <p className="mt-4 text-pretty text-sm leading-relaxed text-muted">{t("footerTagline")}</p>
          </div>

          <nav aria-label={t("footerNavLabel")} className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.title}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">{column.title}</h2>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted transition hover:text-brand focus-visible:outline-none focus-visible:text-brand"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/[0.05] pt-5 text-sm text-muted sm:flex-row">
          <p className="text-center sm:text-left">{t("footerCopyright", { year })}</p>
          <LocaleSwitcher />
        </div>
      </div>
    </footer>
  );
}
