import { Link } from "@/i18n/navigation";
import { CardImage } from "@/components/cards/card-image";
import { IucnSeal } from "@/components/cards/iucn-seal";
import { RarityBadge } from "@/components/cards/rarity-badge";
import { rarityGlowClass } from "@/lib/cards/rarity";
import type { CatalogCard } from "@/lib/cards/types";

type Props = {
  card: CatalogCard;
  href?: string;
  priorityImage?: boolean;
  quantity?: number;
};

/* Drawn on a 200×300 grid, the card's own 2:3 ratio, so nothing gets stretched. */
function CornerSwoosh() {
  return (
    <svg className="tcg-card-deco" viewBox="0 0 200 300" aria-hidden>
      <path d="M0 0H66C44 6 28 20 19 42C14 56 9 72 0 88Z" fill="var(--card-leaf-light)" />
      <path d="M0 0H46C31 5 19 15 13 29C9 37 5 45 0 52Z" fill="var(--card-leaf-dark)" />
    </svg>
  );
}

function ArtOrnament() {
  return <div className="tcg-card-ornament" aria-hidden />;
}

function CornerWaves() {
  return (
    <svg className="tcg-card-deco tcg-card-deco-front" viewBox="0 0 200 300" aria-hidden>
      <path d="M92 300C138 294 178 262 200 204V300Z" fill="var(--card-leaf-light)" />
      <path d="M118 300C154 293 183 270 200 228V300Z" fill="var(--card-leaf-mid)" />
      <path d="M140 300C170 292 190 275 200 246V300Z" fill="var(--card-leaf-dark)" />
    </svg>
  );
}

export function TradingCard({ card, href, priorityImage, quantity }: Props) {
  const content = (
    <article
      data-rarity={card.rarity}
      className={`tcg-card shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-lg ${rarityGlowClass(card.rarity)}`}
    >
      <div className="tcg-card-face" aria-hidden />
      <CornerSwoosh />

      <div className="tcg-card-body">
        <header className="tcg-card-header">
          <h2 className="tcg-card-name">{card.name}</h2>
          {card.iucn_status && <IucnSeal status={card.iucn_status} />}
        </header>

        <div className="tcg-card-art">
          <CardImage
            fill
            slug={card.slug}
            name={card.name}
            imagePath={card.image_path}
            priority={priorityImage}
          />
          <ArtOrnament />
          <svg className="tcg-card-art-wave" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <path d="M76 100C89 99 97 94 100 85V100Z" />
          </svg>
        </div>

        <footer className="tcg-card-footer">
          <RarityBadge rarity={card.rarity} />
          {quantity !== undefined && quantity > 1 && (
            <span className="tcg-card-quantity" aria-label={`×${quantity}`}>
              ×{quantity}
            </span>
          )}
        </footer>
      </div>

      <CornerWaves />
    </article>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        {content}
      </Link>
    );
  }

  return content;
}
