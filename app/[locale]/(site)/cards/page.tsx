import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CatalogFilters } from "@/components/cards/catalog-filters";
import { TradingCard } from "@/components/cards/trading-card";
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
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-brand-strong">{t("title")}</h1>
        <p className="max-w-2xl text-muted">{t("subtitle")}</p>
      </header>

      <Suspense fallback={<p className="text-sm text-muted">{t("loadingFilters")}</p>}>
        <CatalogFilters />
      </Suspense>

      {loadError ? (
        <Surface className="mt-8 p-6 text-center text-sm text-red-700">{loadError}</Surface>
      ) : cards.length === 0 ? (
        <Surface className="mt-8 p-10 text-center">
          <p className="font-medium text-foreground">{t("emptyTitle")}</p>
          <p className="mt-2 text-sm text-muted">{t("emptyBody")}</p>
        </Surface>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
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
