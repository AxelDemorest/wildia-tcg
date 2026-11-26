import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { IucnBadge } from "@/components/cards/iucn-badge";
import { RarityBadge } from "@/components/cards/rarity-badge";
import { TradingCard } from "@/components/cards/trading-card";
import { Badge } from "@/components/ui/badge";
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
    <div className="flex w-full flex-col gap-5">
      <Link
        href="/cards"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted transition hover:text-white"
      >
        <span aria-hidden>←</span> {t("backToCatalog")}
      </Link>

      <section className="relative isolate overflow-hidden rounded-lg border border-border bg-surface p-5 sm:p-8">
        <div aria-hidden className="absolute -left-20 -top-20 size-80 rounded-full bg-brand/15 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 right-0 size-80 rounded-full bg-[#2fa876]/15 blur-3xl" />

        <div className="relative grid gap-8 md:grid-cols-[minmax(0,280px)_1fr]">
          <div className="mx-auto w-full max-w-[280px] md:mx-0">
            <TradingCard card={card} priorityImage />
          </div>
          <div className="space-y-5">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-extrabold uppercase tracking-tight text-foreground">{card.name}</h1>
                <RarityBadge rarity={card.rarity} />
                {owns && (
                  <Badge className="bg-emerald-400/10 text-emerald-300">
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
            <p className="leading-relaxed text-white/85">{card.description}</p>
            <div className="rounded-md border border-border bg-background/60 p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{t("stats")}</h2>
              <dl className="mt-3 grid grid-cols-3 gap-4 text-center">
                <div>
                  <dt className="text-xs uppercase text-muted">PWR</dt>
                  <dd className="text-2xl font-bold tabular-nums">{card.stats.power}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted">DEF</dt>
                  <dd className="text-2xl font-bold tabular-nums">{card.stats.defense}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted">SPD</dt>
                  <dd className="text-2xl font-bold tabular-nums">{card.stats.speed}</dd>
                </div>
              </dl>
            </div>
            {!owns && (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-brand/25 bg-brand/[0.06] p-4">
                <p className="text-sm text-white/75">{t("notOwnedHint")}</p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/boosters"
                    className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong"
                  >
                    {t("ctaBoosters")}
                  </Link>
                  {user && (
                    <Link
                      href={`/players/${user.id}/collection`}
                      className="rounded-md border border-border bg-white/[0.03] px-4 py-2 text-sm font-medium transition hover:border-border-strong hover:bg-white/[0.06]"
                    >
                      {t("ctaCollection")}
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
