import { getTranslations } from "next-intl/server";
import { RarityBadge } from "@/components/cards/rarity-badge";
import type { CollectionStats } from "@/lib/inventory/collection-stats";
import type { CardRarity } from "@/lib/cards/types";
import { Surface } from "@/components/ui/surface";

const RARITIES: CardRarity[] = ["mythic", "legendary", "epic", "rare", "uncommon", "common"];

type Props = {
  stats: CollectionStats;
  isOwn: boolean;
};

export async function ProfileStatsPanel({ stats, isOwn }: Props) {
  const t = await getTranslations("Profile.stats");

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h2 className="text-2xl font-extrabold uppercase tracking-tight text-foreground">
          {t("title")}
        </h2>
        <p className="text-sm text-muted">{t("subtitle")}</p>
      </header>

      <dl className="grid gap-3 sm:grid-cols-2">
        <Surface className="p-4">
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{t("species")}</dt>
          <dd className="mt-1 text-3xl font-extrabold tabular-nums text-foreground">
            {stats.uniqueSpecies}
          </dd>
        </Surface>
        <Surface className="p-4">
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{t("copies")}</dt>
          <dd className="mt-1 text-3xl font-extrabold tabular-nums text-foreground">
            {stats.totalCopies}
          </dd>
        </Surface>
        <Surface className="p-4">
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{t("catalogPercent")}</dt>
          <dd className="mt-1 text-3xl font-extrabold tabular-nums text-foreground">
            {stats.catalogPercent}%
          </dd>
        </Surface>
        {isOwn && stats.boosterOpenCount != null && (
          <Surface className="p-4">
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{t("opens")}</dt>
            <dd className="mt-1 text-3xl font-extrabold tabular-nums text-foreground">
              {stats.boosterOpenCount}
            </dd>
          </Surface>
        )}
      </dl>

      {stats.rarestOwned && (
        <Surface className="space-y-2 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            {t("rarestOwned")}
          </h3>
          <p className="text-lg font-semibold text-foreground">{stats.rarestOwned.name}</p>
          <RarityBadge rarity={stats.rarestOwned.rarity} />
        </Surface>
      )}

      <Surface className="p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{t("rarityBreakdown")}</h3>
        <ul className="mt-3 space-y-2">
          {RARITIES.map((rarity) => (
            <li key={rarity} className="flex items-center justify-between gap-3 text-sm">
              <RarityBadge rarity={rarity} />
              <span className="font-semibold tabular-nums text-foreground">
                {stats.rarityCounts[rarity]}
              </span>
            </li>
          ))}
        </ul>
      </Surface>
    </div>
  );
}