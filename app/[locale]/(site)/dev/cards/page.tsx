import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TradingCard } from "@/components/cards/trading-card";
import { CARD_RARITIES, type CatalogCard } from "@/lib/cards/types";
import { listCatalogCards } from "@/server/cards/queries";

type Props = { params: Promise<{ locale: string }> };

/** One card of each rarity, face and dos, to check the card chrome by eye. */
export default async function DevCardsPage({ params }: Props) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("DevCards");
  const tRarity = await getTranslations("Catalog.rarity");
  const cards = await listCatalogCards(locale);
  const samples = CARD_RARITIES.map((rarity) => cards.find((c) => c.rarity === rarity)).filter(
    (card): card is CatalogCard => card !== undefined,
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-brand-strong">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted">{t("subtitle")}</p>
      <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3">
        {samples.map((card, index) => (
          <li key={card.id} className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">
              {tRarity(card.rarity)}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <TradingCard card={card} quantity={index + 1} priorityImage={index < 3} />
              <TradingCard card={card} side="back" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
