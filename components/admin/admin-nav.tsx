"use client";

import type { ReactNode } from "react";
import { currentEntry, idleSidebarEntry, sidebarEntry } from "@/components/admin/admin-nav-styles";
import { Link, usePathname } from "@/i18n/navigation";

export type AdminNavItem = {
  /** Without the locale prefix, e.g. `/admin/accounts`. */
  href: string;
  label: string;
  icon: ReactNode;
};

const tab = "flex h-9 items-center rounded-[8px] px-3";

const variants = {
  sidebar: {
    list: "flex flex-col gap-1",
    item: undefined,
    current: `${sidebarEntry} ${currentEntry}`,
    idle: idleSidebarEntry,
  },
  // Scrolls sideways under the phone top bar. `-mt-1 pt-1` leaves the focus ring room above the
  // tabs, which the scroll would clip, without moving them.
  tabs: {
    list: "-mt-1 flex gap-1 overflow-x-auto px-3 pt-1 pb-2",
    item: "shrink-0",
    current: `${tab} ${currentEntry}`,
    idle: `${tab} font-medium text-admin-text`,
  },
};

type Props = {
  items: AdminNavItem[];
  /** The desktop sidebar's list, or the phone top bar's tabs (labels only). */
  variant: keyof typeof variants;
};

/** The espace administration's links; the current page is the one whose path matches exactly. */
export function AdminNav({ items, variant }: Props) {
  const pathname = usePathname();
  const styles = variants[variant];

  return (
    <ul className={styles.list}>
      {items.map((item) => {
        const current = pathname === item.href;
        return (
          <li key={item.href} className={styles.item}>
            <Link
              href={item.href}
              aria-current={current ? "page" : undefined}
              className={current ? styles.current : styles.idle}
            >
              {variant === "sidebar" && item.icon}
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
