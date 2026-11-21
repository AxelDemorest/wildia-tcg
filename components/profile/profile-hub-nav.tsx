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
  if (pathname === base || pathname.endsWith(base)) return "overview";
  for (const tab of PROFILE_HUB_TABS) {
    if (tab === "overview") continue;
    if (pathname.includes(`${base}/${tab}`)) return tab;
  }
  return "overview";
}

const tabClass = (active: boolean) =>
  [
    "block rounded-xl px-3 py-2 text-sm font-semibold transition",
    active
      ? "bg-brand/15 text-brand"
      : "text-muted hover:bg-white/[0.04] hover:text-foreground",
  ].join(" ");

export function ProfileHubNav({ profileId, isOwn }: Props) {
  const t = useTranslations("Profile.hub");
  const pathname = usePathname();
  const current = activeTab(pathname, profileId);

  const tabs = PROFILE_HUB_TABS.filter((tab) => tab !== "settings" || isOwn);

  return (
    <nav aria-label={t("navLabel")} className="flex flex-col gap-1">
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