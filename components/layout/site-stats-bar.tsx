import { getLocale, getTranslations } from "next-intl/server";
import { BoosterIcon, LeafIcon, UsersIcon } from "@/components/ui/icons";
import { getSiteStats } from "@/server/stats/site-stats";

export async function SiteStatsBar() {
  const t = await getTranslations("Layout");
  const locale = await getLocale();
  const stats = await getSiteStats().catch(() => null);
  if (!stats) return <SiteStatsBarShell />;

  const format = new Intl.NumberFormat(locale);
  const items = [
    {
      icon: <BoosterIcon className="size-3.5 text-secondary" />,
      value: stats.boostersOpenedToday,
      label: t("statsBoostersToday"),
    },
    {
      icon: <UsersIcon className="size-3.5 text-emerald-400" />,
      value: stats.players,
      label: t("statsPlayers"),
    },
    {
      icon: <LeafIcon className="size-3.5 text-violet-300" />,
      value: stats.species,
      label: t("statsSpecies"),
    },
  ];

  return (
    <SiteStatsBarShell>
      <ul aria-label={t("statsLabel")} className="flex items-center gap-6">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5 whitespace-nowrap">
            {item.icon}
            <span className="font-semibold tabular-nums text-white/90">{format.format(item.value)}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </li>
        ))}
      </ul>
    </SiteStatsBarShell>
  );
}

export function SiteStatsBarShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex h-8 shrink-0 items-center overflow-hidden border-b border-border bg-background px-4 text-[11px] text-muted sm:px-6">
      {children}
    </div>
  );
}
