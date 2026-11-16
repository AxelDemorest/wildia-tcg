import { Link } from "@/i18n/navigation";
import { CardImage } from "@/components/cards/card-image";
import { RarityBadge } from "@/components/cards/rarity-badge";
import { ArrowRightIcon } from "@/components/ui/icons";
import { rarityFrameClass } from "@/lib/cards/rarity";
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
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand">
            <span className="relative flex size-2" aria-hidden>
              <span className="absolute inset-0 animate-ping rounded-full bg-brand/60 motion-reduce:animate-none" />
              <span className="relative size-2 rounded-full bg-brand" />
            </span>
            {kicker}
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h2>
        </div>
        <Link
          href="/boosters"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand transition hover:text-secondary"
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
            <li key={card.id} className="min-w-[7.5rem] flex-1 basis-0 sm:min-w-[8.5rem]">
              <Link
                href={`/cards/${card.slug}`}
                className={`group relative block overflow-hidden rounded-xl bg-[#0f1a15] p-1.5 shadow-[var(--shadow-card)] ring-2 transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 ${rarityFrameClass(card.rarity)}`}
              >
                <CardImage slug={card.slug} name={card.name} imagePath={card.image_path} />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-2 pb-2 pt-10">
                  <p className="truncate text-xs font-semibold text-white">{card.name}</p>
                  <div className="mt-1 origin-left scale-90">
                    <RarityBadge rarity={card.rarity} />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
