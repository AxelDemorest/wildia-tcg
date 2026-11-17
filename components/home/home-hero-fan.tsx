import Image, { type StaticImageData } from "next/image";
import cardBackAsset from "@/assets/brand/back.png";
import { CardImage } from "@/components/cards/card-image";
import { SparkIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import type { CardRarity, CatalogCard } from "@/lib/cards/types";

const cardBack = cardBackAsset as StaticImageData;

const FAN_LAYOUT = [
  { x: -8.2, y: 1, r: -15, z: 2 },
  { x: 0, y: -0.6, r: 0, z: 3 },
  { x: 8.2, y: 1, r: 15, z: 2 },
] as const;

const RARITY_RING: Record<CardRarity, string> = {
  common: "ring-zinc-400/40",
  uncommon: "ring-emerald-400/50",
  rare: "ring-sky-400/60",
  epic: "ring-violet-400/60",
  legendary: "ring-amber-300/80",
  mythic: "ring-rose-400/80",
};

type Props = { cards: CatalogCard[] };

function CardBack() {
  return (
    <div className="relative aspect-[2/3] overflow-hidden rounded-xl shadow-[0_20px_40px_-18px_rgb(0_0_0_/_0.9)] ring-1 ring-amber-200/30">
      <Image src={cardBack} alt="" fill sizes="160px" className="scale-[1.04] object-cover" />
    </div>
  );
}

export function HomeHeroFan({ cards }: Props) {
  const display = cards.slice(0, FAN_LAYOUT.length);
  if (display.length === 0) return null;

  return (
    <div className="relative h-[19rem] w-full [perspective:1400px] lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[56%]">
      <div aria-hidden className="absolute left-[6%] top-[58%] hidden w-24 -rotate-[24deg] opacity-80 blur-[1.5px] lg:block">
        <CardBack />
      </div>
      <div aria-hidden className="absolute right-[3%] top-[4%] hidden w-16 rotate-[28deg] opacity-60 blur-[2px] lg:block">
        <CardBack />
      </div>
      <SparkIcon className="absolute left-[18%] top-[18%] size-5 text-white/80" />
      <SparkIcon className="absolute bottom-[16%] right-[18%] size-4 text-secondary" />
      <SparkIcon className="absolute bottom-[8%] left-[44%] size-3 text-white/60" />

      <div className="absolute left-1/2 top-1/2 h-[19rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 scale-[0.8] [transform-style:preserve-3d] [transform:rotateX(10deg)_rotateY(-14deg)] sm:scale-100">
        <div aria-hidden className="absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/35 blur-3xl" />

        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 w-[8rem]"
          style={{ transform: "translate(-50%, -50%) translate(-13rem, 2.2rem) rotate(-26deg)" }}
        >
          <CardBack />
        </div>

        {display.map((card, index) => {
          const layout = FAN_LAYOUT[index];
          return (
            <div
              key={card.id}
              className="group/fan absolute left-1/2 top-1/2 w-[9.25rem] origin-bottom hover:!z-30 focus-within:!z-30"
              style={{
                transform: `translate(-50%, -50%) translate(${layout.x}rem, ${layout.y}rem) rotate(${layout.r}deg)`,
                zIndex: layout.z,
              }}
            >
              <div className="transition-[translate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/fan:-translate-y-6 group-focus-within/fan:-translate-y-6 motion-reduce:transition-none">
                <Link
                  href={`/cards/${card.slug}`}
                  className={`relative block aspect-[2/3] overflow-hidden rounded-xl bg-[#0f1a15] p-1.5 shadow-[0_30px_50px_-20px_rgb(0_0_0_/_0.8)] ring-2 focus-visible:outline-none focus-visible:ring-brand ${RARITY_RING[card.rarity]}`}
                >
                  <CardImage slug={card.slug} name={card.name} imagePath={card.image_path} priority={index < 2} />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(130deg,rgb(255_255_255_/_0.28)_0%,transparent_35%,transparent_65%,rgb(95_208_255_/_0.18)_100%)]"
                  />
                  <span className="absolute inset-x-1.5 bottom-1.5 rounded-b-md bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-6 text-[11px] font-semibold text-white">
                    {card.name}
                  </span>
                </Link>
              </div>
            </div>
          );
        })}

        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 w-[8rem]"
          style={{ transform: "translate(-50%, -50%) translate(13rem, 2.2rem) rotate(26deg)", zIndex: 1 }}
        >
          <CardBack />
        </div>
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
