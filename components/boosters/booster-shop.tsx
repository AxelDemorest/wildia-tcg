"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { TradingCard } from "@/components/cards/trading-card";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import type { CardRarity, IucnStatus } from "@/lib/cards/types";
import { openBooster, type OpenBoosterActionResult } from "@/server/actions/open-booster";

export type BoosterShopItem = {
  id: string;
  slug: string;
  costCoins: number;
  slots: number;
};

export type RevealedCard = {
  cardId: string;
  slug: string;
  rarity: CardRarity;
  name: string;
  scientific_name: string | null;
  iucn_status: IucnStatus | null;
  description: string;
  image_path: string | null;
  stats: { power: number; defense: number; speed: number };
};

type Props = {
  locale: string;
  boosters: BoosterShopItem[];
  isLoggedIn: boolean;
};

export function BoosterShop({ locale, boosters, isLoggedIn }: Props) {
  const t = useTranslations("Boosters");
  const [selectedId, setSelectedId] = useState(boosters[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<RevealedCard[] | null>(null);
  const [revealIndex, setRevealIndex] = useState(0);
  const [pending, startTransition] = useTransition();

  const selected = boosters.find((b) => b.id === selectedId) ?? boosters[0];

  const displayCards = useMemo(() => {
    if (!revealed) return [];
    const map = new Map<string, RevealedCard & { quantity: number }>();
    for (const card of revealed) {
      const existing = map.get(card.cardId);
      if (existing) {
        existing.quantity += 1;
      } else {
        map.set(card.cardId, { ...card, quantity: 1 });
      }
    }
    return Array.from(map.values());
  }, [revealed]);

  function handleOpen() {
    if (!selected || !isLoggedIn) return;
    setError(null);
    setRevealed(null);
    setRevealIndex(0);

    const formData = new FormData();
    formData.set("locale", locale);
    formData.set("boosterId", selected.id);

    startTransition(async () => {
      const res: OpenBoosterActionResult = await openBooster(formData);
      if (!res.ok) {
        setError(t(`error.${res.error}`));
        return;
      }
      setRevealed(res.cards);
      setRevealIndex(0);
    });
  }

  function showNextCard() {
    if (!revealed) return;
    if (revealIndex < revealed.length - 1) {
      setRevealIndex((i) => i + 1);
    }
  }

  if (boosters.length === 0) {
    return (
      <Surface className="p-8 text-center text-sm text-muted">{t("emptyBoosters")}</Surface>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
        {boosters.map((booster) => (
          <button
            key={booster.id}
            type="button"
            onClick={() => setSelectedId(booster.id)}
            className={`min-w-[min(100%,280px)] shrink-0 snap-center rounded-xl border p-4 text-left transition ${
              selected?.id === booster.id
                ? "border-brand bg-emerald-50 ring-2 ring-brand/30"
                : "border-border bg-surface hover:border-zinc-300"
            }`}
          >
            <p className="text-lg font-semibold text-brand-strong">
              {t(`pack.${booster.slug}.name`)}
            </p>
            <p className="mt-1 text-sm text-muted">{t(`pack.${booster.slug}.description`)}</p>
            <p className="mt-3 text-sm font-medium">
              {t("cost", { amount: booster.costCoins })} · {t("slots", { count: booster.slots })}
            </p>
          </button>
        ))}
      </div>

      {!isLoggedIn ? (
        <Surface className="p-6 text-center">
          <p className="text-muted">{t("loginRequired")}</p>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-md bg-brand px-4 py-2 text-sm font-medium text-white"
          >
            {t("loginCta")}
          </Link>
        </Surface>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <Button type="button" onClick={handleOpen} disabled={pending || !selected}>
            {pending ? t("opening") : t("open", { name: t(`pack.${selected.slug}.name`) })}
          </Button>
          {error && (
            <p className="text-sm text-red-600" role="alert">{error}</p>
          )}
        </div>
      )}

      {revealed && revealed.length > 0 && (
        <section className="space-y-4" aria-live="polite">
          <h2 className="text-lg font-semibold">{t("revealTitle")}</h2>
          <div className="mx-auto max-w-xs">
            <TradingCard
              card={{
                id: revealed[revealIndex].cardId,
                slug: revealed[revealIndex].slug,
                scientific_name: revealed[revealIndex].scientific_name,
                iucn_status: revealed[revealIndex].iucn_status,
                rarity: revealed[revealIndex].rarity,
                image_path: revealed[revealIndex].image_path,
                farm_rate_base: 0,
                stats: revealed[revealIndex].stats,
                name: revealed[revealIndex].name,
                description: revealed[revealIndex].description,
              }}
              priorityImage
            />
          </div>
          {revealIndex < revealed.length - 1 ? (
            <Button type="button" variant="secondary" onClick={showNextCard}>
              {t("revealNext", { current: revealIndex + 1, total: revealed.length })}
            </Button>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted">{t("revealDone")}</p>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {displayCards.map((card) => (
                  <li key={card.cardId}>
                    <TradingCard
                      card={{
                        id: card.cardId,
                        slug: card.slug,
                        scientific_name: card.scientific_name,
                        iucn_status: card.iucn_status,
                        rarity: card.rarity,
                        image_path: card.image_path,
                        farm_rate_base: 0,
                        stats: card.stats,
                        name: card.name,
                        description: card.description,
                      }}
                      quantity={card.quantity}
                    />
                  </li>
                ))}
              </ul>
              <Link
                href="/collection"
                className="inline-flex rounded-md bg-brand px-4 py-2 text-sm font-medium text-white"
              >
                {t("goCollection")}
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
