import { Link } from "@/i18n/navigation";
import { CardImage } from "@/components/cards/card-image";
import { rarityFrameClass } from "@/lib/cards/rarity";
import type { CatalogCard } from "@/lib/cards/types";

const FAN_SIZE = 4;

const FAN_LAYOUT = [
  { rotate: -21, translateX: -8, translateY: 1.75, zClass: "z-[1]" },
  { rotate: -7, translateX: -2.7, translateY: 0.25, zClass: "z-[2]" },
  { rotate: 7, translateX: 2.7, translateY: 0.25, zClass: "z-[3]" },
  { rotate: 21, translateX: 8, translateY: 1.75, zClass: "z-[4]" },
] as const;

type Props = { cards: CatalogCard[] };

export function HomeHeroFan({ cards }: Props) {
  const display = cards.slice(0, FAN_SIZE);
  if (display.length === 0) return null;

  return (
    <div className="relative mx-auto flex h-[26rem] w-full max-w-[36rem] items-center justify-center sm:h-[30rem] sm:max-w-[42rem] lg:h-[32rem] lg:max-w-[48rem]">
      <div className="relative h-full w-full">
        {display.map((card, index) => {
          const layout = FAN_LAYOUT[index];
          return (
            // The outer wrapper holds the fan position and never moves, so hover stays stable.
            <div
              key={card.id}
              className={`group/fan absolute left-1/2 top-[52%] w-[11.5rem] origin-bottom ${layout.zClass} hover:z-30 focus-within:z-30 sm:w-[13rem] lg:w-[14.5rem]`}
              style={{
                transform: `translate(-50%, -50%) translate(${layout.translateX}rem, ${layout.translateY}rem) rotate(${layout.rotate}deg)`,
              }}
            >
              {/* Lifts along the card's own axis: it slides out of the fan, keeping its tilt. */}
              <div className="transition-[translate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/fan:-translate-y-8 group-focus-within/fan:-translate-y-8 motion-reduce:transition-none sm:group-hover/fan:-translate-y-10 sm:group-focus-within/fan:-translate-y-10">
                <Link
                  href={`/cards/${card.slug}`}
                  className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                >
                  <div
                    className={`aspect-[2/3] w-full overflow-hidden rounded-xl bg-surface p-1.5 shadow-[var(--shadow-card)] ring-2 transition-shadow duration-500 group-hover/fan:shadow-[0_24px_40px_-16px_rgb(19_35_26_/_0.5)] ${rarityFrameClass(card.rarity)}`}
                  >
                    <CardImage
                      slug={card.slug}
                      name={card.name}
                      imagePath={card.image_path}
                      priority={index < 2}
                    />
                  </div>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function pickHeroFanCards(cards: CatalogCard[], count: number): CatalogCard[] {
  const withArt = cards.filter((c) => c.image_path);
  if (withArt.length <= count) return withArt;
  const step = Math.max(1, Math.floor(withArt.length / count));
  return Array.from({ length: count }, (_, i) => withArt[Math.min(i * step, withArt.length - 1)]);
}
