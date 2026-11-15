import { Link } from "@/i18n/navigation";
import { CardBack } from "@/components/cards/card-back";
import { CardImage } from "@/components/cards/card-image";
import { IucnSeal } from "@/components/cards/iucn-seal";
import { RarityBadge } from "@/components/cards/rarity-badge";
import { cardShine } from "@/lib/cards/rarity";
import type { CardSide, CatalogCard } from "@/lib/cards/types";

type Props = {
  card: CatalogCard;
  /** On the back, `card`, `href` and `quantity` are ignored: nothing about the species reaches the page. */
  side?: CardSide;
  href?: string;
  priorityImage?: boolean;
  quantity?: number;
};

/* Drawn on a 200×300 grid, the card's own 2:3 ratio, so nothing gets stretched. Echoes the bands of the back. */
function CornerBands() {
  return (
    <svg className="tcg-card-deco" viewBox="0 0 200 300" preserveAspectRatio="none" aria-hidden>
      <path d="M0 0H128C78 12 36 48 16 108C10 126 5 146 0 166Z" opacity="0.45" />
      <path d="M0 0H84C50 14 24 42 10 86C6 98 3 110 0 122Z" opacity="0.5" />
      <path d="M200 136C196 204 170 262 104 300H200Z" opacity="0.45" />
      <path d="M200 196C194 244 174 278 140 300H200Z" opacity="0.5" />
    </svg>
  );
}

function Divider() {
  return (
    <div className="tcg-card-divider" aria-hidden>
      <span />
    </div>
  );
}

export function TradingCard({ card, side = "front", href, priorityImage, quantity }: Props) {
  if (side === "back") return <CardBack priority={priorityImage} />;

  const content = (
    <article
      data-side="front"
      data-rarity={card.rarity}
      data-shine={cardShine(card.rarity)}
      className="tcg-card"
    >
      <CornerBands />
      <div className="tcg-card-frame" aria-hidden />

      <div className="tcg-card-body">
        <div className="tcg-card-art">
          <CardImage
            fill
            slug={card.slug}
            name={card.name}
            imagePath={card.image_path}
            priority={priorityImage}
          />
          {card.iucn_status && <IucnSeal status={card.iucn_status} />}
        </div>

        <Divider />
        <h2 className="tcg-card-name">
          <span>{card.name}</span>
        </h2>

        <footer className="tcg-card-footer">
          <RarityBadge rarity={card.rarity} />
          {quantity !== undefined && quantity > 1 && (
            <span className="tcg-card-quantity" aria-label={`×${quantity}`}>
              ×{quantity}
            </span>
          )}
        </footer>
      </div>

      <div className="tcg-card-shine" aria-hidden />
    </article>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="tcg-card-link block rounded-[6%/4%] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        {content}
      </Link>
    );
  }

  return content;
}
