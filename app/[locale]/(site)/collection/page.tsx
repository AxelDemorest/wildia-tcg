import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CollectionEconomyBanner } from "@/components/collection/collection-economy-banner";
import { CollectionSort } from "@/components/collection/collection-sort";
import { TradingCard } from "@/components/cards/trading-card";
import { Surface } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/server/auth/require-user";
import { listUserCollection, type CollectionSortOption } from "@/server/inventory/queries";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sort?: string }>;
};

function parseSort(value: string | undefined): CollectionSortOption {
  if (value === "name" || value === "quantity") return value;
  return "rarity";
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { sort: sortParam } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Collection");
  const user = await requireUser(locale);
  const sort = parseSort(sortParam);

  let cards: Awaited<ReturnType<typeof listUserCollection>> = [];
  let loadError: string | null = null;

  try {
    cards = await listUserCollection(user.id, locale, sort);
  } catch (e) {
    loadError = e instanceof Error ? e.message : t("errorLoad");
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-brand-strong">{t("title")}</h1>
        <p className="max-w-2xl text-muted">{t("subtitle")}</p>
      </header>

      <CollectionEconomyBanner userId={user.id} />

      {cards.length > 0 && (
        <Suspense fallback={<p className="text-sm text-muted">{t("loadingSort")}</p>}>
          <CollectionSort />
        </Suspense>
      )}

      {loadError ? (
        <Surface className="mt-8 p-6 text-center text-sm text-red-700">{loadError}</Surface>
      ) : cards.length === 0 ? (
        <Surface className="mt-8 p-10 text-center">
          <p className="text-lg font-medium text-foreground">{t("emptyTitle")}</p>
          <p className="mt-2 text-sm text-muted">{t("emptyBody")}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/cards"
              className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              {t("ctaCatalog")}
            </Link>
            <Link
              href="/boosters"
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong"
            >
              {t("ctaBoosters")}
            </Link>
          </div>
        </Surface>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
          {cards.map((card, index) => (
            <li key={card.id} className="min-w-0">
              <TradingCard
                card={card}
                href={`/cards/${card.slug}`}
                quantity={card.quantity}
                priorityImage={index < 4}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
