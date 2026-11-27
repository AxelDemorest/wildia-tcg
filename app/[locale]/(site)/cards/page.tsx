import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CatalogFilters } from "@/components/cards/catalog-filters";
import { TradingCard } from "@/components/cards/trading-card";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { CARD_RARITIES, type CardRarity } from "@/lib/cards/types";
import { listCatalogCards } from "@/server/cards/queries";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ rarity?: string }>;
};

function parseRarity(value: string | undefined): CardRarity | null {
  if (!value) return null;
  return CARD_RARITIES.includes(value as CardRarity) ? (value as CardRarity) : null;
}

export default async function CardsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { rarity: rarityParam } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Catalog");
  const rarity = parseRarity(rarityParam);

  let cards: Awaited<ReturnType<typeof listCatalogCards>> = [];
  let loadError: string | null = null;

  try {
    cards = await listCatalogCards(locale, { rarity });
  } catch (e) {
    loadError = e instanceof Error ? e.message : t("errorLoad");
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <Surface className="px-5 py-4">
        <Suspense fallback={<p className="text-sm text-muted">{t("loadingFilters")}</p>}>
          <CatalogFilters />
        </Suspense>
      </Surface>

      {loadError ? (
        <Surface className="p-6 text-center text-sm text-red-300">{loadError}</Surface>
      ) : cards.length === 0 ? (
        <Surface className="p-10 text-center">
          <p className="font-medium text-foreground">{t("emptyTitle")}</p>
          <p className="mt-2 text-sm text-muted">{t("emptyBody")}</p>
        </Surface>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-10">
          {cards.map((card, index) => (
            <li key={card.id} className="min-w-0">
              <TradingCard
                card={card}
                href={`/cards/${card.slug}`}
                priorityImage={index < 4}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
