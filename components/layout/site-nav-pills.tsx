"use client";

import type { ReactNode } from "react";
import { Link, usePathname } from "@/i18n/navigation";

export type SiteNavItem = {
  href: string;
  label: string;
  icon?: ReactNode;
  /** When true, only exact path match (used for home). */
  exact?: boolean;
};

type Props = {
  items: SiteNavItem[];
  label: string;
};

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href || (href === "/" && pathname === "");
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNavPills({ items, label }: Props) {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className="flex min-w-0 items-center py-0.5">
      <ul className="flex items-center gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none]">
        {items.map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                className={`inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-md px-3.5 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-4 ${
                  active
                    ? "bg-white/[0.06] font-semibold text-foreground shadow-[inset_0_-2px_0_var(--color-secondary)] hover:bg-white/[0.08] [&>svg]:text-secondary"
                    : "font-medium text-muted hover:bg-white/[0.04] hover:text-white"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
