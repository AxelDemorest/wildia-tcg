"use client";

import { Link, usePathname } from "@/i18n/navigation";

export type SiteNavItem = {
  href: string;
  label: string;
  /** When true, only exact path match (used for home). */
  exact?: boolean;
};

type Props = {
  items: SiteNavItem[];
};

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href || (href === "/" && pathname === "");
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNavPills({ items }: Props) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex items-center justify-center">
      <ul className="flex items-center gap-0.5 rounded-full bg-surface p-1 shadow-[0_8px_30px_-12px_rgb(19_35_26_/_0.18)] ring-1 ring-black/[0.06]">
        {items.map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:py-2 sm:text-sm ${
                  active
                    ? "bg-foreground text-white shadow-sm"
                    : "text-foreground/80 hover:bg-black/[0.04] hover:text-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
