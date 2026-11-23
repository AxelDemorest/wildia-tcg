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
    "shrink-0 whitespace-nowrap border-b-2 pb-3 text-sm font-medium text-white transition",
    active ? "border-white" : "border-transparent opacity-80 hover:opacity-100",
  ].join(" ");

export function ProfileHubNav({ profileId, isOwn }: Props) {
  const t = useTranslations("Profile.hub");
  const pathname = usePathname();
  const current = activeTab(pathname, profileId);

  const tabs = PROFILE_HUB_TABS.filter((tab) => tab !== "settings" || isOwn);

  return (
    <nav
      aria-label={t("navLabel")}
      className="mt-8 flex gap-6 overflow-x-auto px-5 shadow-[inset_0_-1px_0_rgb(255_255_255/0.15)] [scrollbar-width:none] sm:mt-10 sm:gap-8 sm:px-8"
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