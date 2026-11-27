"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  PROFILE_HUB_TABS,
  profileHubPath,
  type ProfileHubTab,
} from "@/lib/profiles/hub";

type Props = {
  profileId: string;
  isOwn: boolean;
};

function activeTab(pathname: string, profileId: string): ProfileHubTab {
  const base = `/players/${profileId}`;
  for (const tab of PROFILE_HUB_TABS) {
    if (pathname.includes(`${base}/${tab}`)) return tab;
  }
  return "collection";
}

const tabClass = (active: boolean) =>
  [
    "relative shrink-0 whitespace-nowrap py-4 text-sm transition-colors",
    "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:transition-colors",
    active
      ? "font-semibold text-foreground after:bg-secondary"
      : "font-medium text-muted after:bg-transparent hover:text-foreground/85",
  ].join(" ");

export function ProfileHubNav({ profileId, isOwn }: Props) {
  const t = useTranslations("Profile.hub");
  const pathname = usePathname();
  const current = activeTab(pathname, profileId);

  const tabs = PROFILE_HUB_TABS.filter((tab) => tab !== "settings" || isOwn);

  return (
    <nav
      aria-label={t("navLabel")}
      className="flex gap-7 overflow-x-auto border-b border-border px-1 [scrollbar-width:none] sm:gap-10"
    >
      {tabs.map((tab) => (
        <Link
          key={tab}
          href={profileHubPath(profileId, tab)}
          className={tabClass(current === tab)}
          aria-current={current === tab ? "page" : undefined}
        >
          {t(`tabs.${tab}`)}
        </Link>
      ))}
    </nav>
  );
}