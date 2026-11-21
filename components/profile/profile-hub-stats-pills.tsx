import { getTranslations } from "next-intl/server";
import type { CollectionStats } from "@/lib/inventory/collection-stats";
import { chipClass } from "@/components/ui/chip";

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
    <ul className="flex flex-wrap gap-2" aria-label={t("sidebarLabel")}>
      {pills.map((pill) => (
        <li key={pill.label}>
          <span className={chipClass(false)}>
            <span className="text-muted">{pill.label}</span>{" "}
            <span className="font-semibold tabular-nums text-foreground">{pill.value}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}