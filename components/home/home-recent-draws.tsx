import { Link } from "@/i18n/navigation";
import { TradingCard } from "@/components/cards/trading-card";
import type { CatalogCard } from "@/lib/cards/types";

type Props = {
  cards: CatalogCard[];
  kicker: string;
  title: string;
  cta: string;
  empty: string;
};

export function HomeRecentDraws({ cards, kicker, title, cta, empty }: Props) {
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <div className="mx-auto flex w-full max-w-7xl items-end justify-between gap-4 px-4 sm:px-6">
        <div className="min-w-0">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-brand">
            {kicker}
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h2>
        </div>
        <Link
          href="/boosters"
          className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-brand-strong transition hover:text-brand"
        >
          {cta}
          <span aria-hidden>→</span>
        </Link>
      </div>

      {cards.length === 0 ? (
        <p className="mx-auto w-full max-w-7xl px-4 text-center text-sm text-muted sm:px-6">
          {empty}
        </p>
      ) : (
        <ul
          className="flex w-full gap-3 overflow-x-auto px-4 pb-1 sm:gap-4 sm:px-6 lg:px-8"
          aria-label={title}
        >
          {cards.map((card) => (
            <li key={card.id} className="min-w-[7.5rem] flex-1 basis-0 pt-2 sm:min-w-[8.5rem]">
              <TradingCard card={card} href={`/cards/${card.slug}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
