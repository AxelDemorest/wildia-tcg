import { getTranslations } from "next-intl/server";
import type { CollectionStats } from "@/lib/inventory/collection-stats";

type Props = {
  stats: CollectionStats;
  isOwn: boolean;
};

export async function ProfileHubStatsPills({ stats, isOwn }: Props) {
  const t = await getTranslations("Profile.stats");

  const pills: { label: string; value: string }[] = [
    { label: t("species"), value: String(stats.uniqueSpecies) },
    { label: t("copies"), value: String(stats.totalCopies) },
    { label: t("catalogPercent"), value: `${stats.catalogPercent}%` },
  ];

  if (isOwn && stats.boosterOpenCount != null) {
    pills.push({ label: t("opens"), value: String(stats.boosterOpenCount) });
  }

  return (
    <dl
      className="grid shrink-0 grid-cols-2 gap-x-8 gap-y-4 sm:flex sm:flex-wrap sm:gap-x-10"
      aria-label={t("sidebarLabel")}
    >
      {pills.map((pill) => (
        <div key={pill.label} className="flex flex-col gap-1">
          <dt className="text-xs text-muted">{pill.label}</dt>
          <dd className="text-lg font-semibold tabular-nums text-foreground">{pill.value}</dd>
        </div>
      ))}
    </dl>
  );
}
