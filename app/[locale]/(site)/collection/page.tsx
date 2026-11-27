import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CollectionEconomyBanner } from "@/components/collection/collection-economy-banner";
import { CollectionSort } from "@/components/collection/collection-sort";
import { TradingCard } from "@/components/cards/trading-card";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/server/auth/require-user";
import type { CollectionSortOption } from "@/lib/inventory/collection";
import { listUserCollection } from "@/server/inventory/queries";

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
  const user = await requireUser(locale, `/${locale}/collection`);
  const sort = parseSort(sortParam);

  let cards: Awaited<ReturnType<typeof listUserCollection>> = [];
  let loadError: string | null = null;

  try {
    cards = await listUserCollection(user.id, locale, sort);
  } catch (e) {
    loadError = e instanceof Error ? e.message : t("errorLoad");
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <CollectionEconomyBanner userId={user.id} />

      {cards.length > 0 && (
        <Surface className="px-5 py-4">
          <Suspense fallback={<p className="text-sm text-muted">{t("loadingSort")}</p>}>
            <CollectionSort />
          </Suspense>
        </Surface>
      )}

      {loadError ? (
        <Surface className="p-6 text-center text-sm text-red-300">{loadError}</Surface>
      ) : cards.length === 0 ? (
        <Surface className="p-10 text-center">
          <p className="text-lg font-medium text-foreground">{t("emptyTitle")}</p>
          <p className="mt-2 text-sm text-muted">{t("emptyBody")}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/cards"
              className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-medium transition hover:bg-white/[0.08]"
            >
              {t("ctaCatalog")}
            </Link>
            <Link
              href="/boosters"
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong"
            >
              {t("ctaBoosters")}
            </Link>
          </div>
        </Surface>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6 2xl:grid-cols-5">
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
