import { Link } from "@/i18n/navigation";
import { TradingCard } from "@/components/cards/trading-card";
import { ArrowRightIcon } from "@/components/ui/icons";
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
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex w-full items-end justify-between gap-4 px-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-secondary">
            <span className="relative flex size-2" aria-hidden>
              <span className="absolute inset-0 animate-ping rounded-full bg-secondary/60 motion-reduce:animate-none" />
              <span className="relative size-2 rounded-full bg-secondary" />
            </span>
            {kicker}
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h2>
        </div>
        <Link
          href="/boosters"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-secondary transition hover:text-white"
        >
          {cta}
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </div>

      {cards.length === 0 ? (
        <p className="w-full px-5 text-center text-sm text-muted">{empty}</p>
      ) : (
        <ul
          className="flex w-full gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:thin] sm:gap-4"
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
