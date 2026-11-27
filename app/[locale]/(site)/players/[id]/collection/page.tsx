import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CollectionEconomyBanner } from "@/components/collection/collection-economy-banner";
import { CollectionPagination } from "@/components/collection/collection-pagination";
import { CollectionSort } from "@/components/collection/collection-sort";
import { TradingCard } from "@/components/cards/trading-card";
import { Surface } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import {
  COLLECTION_PAGE_SIZE,
  paginateCollection,
  parseCollectionPage,
  type CollectionSortOption,
} from "@/lib/inventory/collection";
import { PLAYER_ID_RE } from "@/lib/profiles/hub";
import { getUser } from "@/server/auth/require-user";
import { listUserCollection } from "@/server/inventory/queries";
import { getPublicProfileForViewer } from "@/server/profiles/queries";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ sort?: string; page?: string }>;
};

function parseSort(value: string | undefined): CollectionSortOption {
  if (value === "name" || value === "quantity") return value;
  return "rarity";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!PLAYER_ID_RE.test(id)) return { title: "Collection" };
  return { title: "Collection" };
}

export default async function PlayerCollectionPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const { sort: sortParam, page: pageParam } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Collection");
  const tProfile = await getTranslations("Profile");

  if (!PLAYER_ID_RE.test(id)) notFound();

  const viewer = await getUser();
  const profile = await getPublicProfileForViewer(id, viewer?.id ?? null).catch(() => null);
  if (!profile) notFound();

  const isOwn = viewer?.id === profile.id;
  const sort = parseSort(sortParam);

  let cards: Awaited<ReturnType<typeof listUserCollection>> = [];
  let loadError: string | null = null;

  try {
    cards = await listUserCollection(profile.id, locale, sort);
  } catch (e) {
    loadError = e instanceof Error ? e.message : t("errorLoad");
  }

  const pageCount = Math.max(1, Math.ceil(cards.length / COLLECTION_PAGE_SIZE));
  const page = parseCollectionPage(pageParam, pageCount);
  const { items: pageItems } = paginateCollection(cards, page);

  const displayName = profile.display_name ?? tProfile("anonymousName");

  return (
    <div className="flex w-full flex-col gap-5">
      <header className="space-y-1">
        <h2 className="text-2xl font-extrabold uppercase tracking-tight text-foreground">
          {isOwn ? t("title") : t("titleVisitor", { name: displayName })}
        </h2>
        <p className="text-sm text-muted">
          {isOwn ? t("subtitle") : t("subtitleVisitor")}
        </p>
      </header>

      {isOwn && <CollectionEconomyBanner userId={profile.id} />}

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
          <p className="text-lg font-medium text-foreground">
            {isOwn ? t("emptyTitle") : t("emptyTitleVisitor")}
          </p>
          <p className="mt-2 text-sm text-muted">{isOwn ? t("emptyBody") : t("emptyBodyVisitor")}</p>
          {isOwn && (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/cards"
                className="rounded-md border border-border bg-white/[0.03] px-4 py-2 text-sm font-medium transition hover:border-border-strong hover:bg-white/[0.06]"
              >
                {t("ctaCatalog")}
              </Link>
              <Link
                href="/boosters"
                className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong"
              >
                {t("ctaBoosters")}
              </Link>
            </div>
          )}
        </Surface>
      ) : (
        <>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-10">
            {pageItems.map((card, index) => (
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
          <Suspense fallback={null}>
            <CollectionPagination page={page} pageCount={pageCount} />
          </Suspense>
        </>
      )}
    </div>
  );
}