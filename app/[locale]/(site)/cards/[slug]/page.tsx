import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { IucnBadge } from "@/components/cards/iucn-badge";
import { RarityBadge } from "@/components/cards/rarity-badge";
import { TradingCard } from "@/components/cards/trading-card";
import { Badge } from "@/components/ui/badge";
import { Surface } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { getUser } from "@/server/auth/require-user";
import { getCatalogCardBySlug } from "@/server/cards/queries";
import { getUserCardQuantity } from "@/server/inventory/queries";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const card = await getCatalogCardBySlug(locale, slug).catch(() => null);
  if (!card) {
    return { title: "Card not found" };
  }
  return {
    title: card.name,
    description: card.description,
  };
}

export default async function CardDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Catalog");

  const card = await getCatalogCardBySlug(locale, slug).catch(() => null);
  if (!card) notFound();

  const user = await getUser();
  const quantity =
    user != null ? await getUserCardQuantity(user.id, card.id).catch(() => 0) : 0;
  const owns = quantity > 0;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/cards" className="text-sm font-medium text-brand hover:underline">
        ← {t("backToCatalog")}
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,280px)_1fr]">
        <div className="mx-auto w-full max-w-[280px] md:mx-0">
          <TradingCard card={card} priorityImage />
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-brand-strong">{card.name}</h1>
              <RarityBadge rarity={card.rarity} />
              {owns && (
                <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800">
                  {t("ownedBadge", { count: quantity })}
                </Badge>
              )}
            </div>
            {card.scientific_name && (
              <p className="mt-1 text-lg italic text-muted">{card.scientific_name}</p>
            )}
          </div>
          {card.iucn_status && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <span>{t("iucn.title")}</span>
              <IucnBadge status={card.iucn_status} withLabel />
            </div>
          )}
          <p className="leading-relaxed text-foreground">{card.description}</p>
          <Surface className="p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("stats")}</h2>
            <dl className="mt-3 grid grid-cols-3 gap-4 text-center">
              <div>
                <dt className="text-xs uppercase text-muted">PWR</dt>
                <dd className="text-2xl font-semibold">{card.stats.power}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted">DEF</dt>
                <dd className="text-2xl font-semibold">{card.stats.defense}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted">SPD</dt>
                <dd className="text-2xl font-semibold">{card.stats.speed}</dd>
              </div>
            </dl>
          </Surface>
          {!owns && (
            <Surface className="flex flex-wrap items-center justify-between gap-4 p-4">
              <p className="text-sm text-muted">{t("notOwnedHint")}</p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/boosters"
                  className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong"
                >
                  {t("ctaBoosters")}
                </Link>
                <Link
                  href="/collection"
                  className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-zinc-50"
                >
                  {t("ctaCollection")}
                </Link>
              </div>
            </Surface>
          )}
        </div>
      </div>
    </div>
  );
}
