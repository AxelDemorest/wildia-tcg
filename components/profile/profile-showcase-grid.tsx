import type { StaticImageData } from "next/image";
import { getTranslations } from "next-intl/server";
import brandLogo from "@/assets/brand/claws.png";
import { TradingCard } from "@/components/cards/trading-card";
import { Link } from "@/i18n/navigation";
import { SHOWCASE_SLOT_COUNT, type ShowcaseSlotView } from "@/lib/profiles/showcase";

type Props = {
  slots: ShowcaseSlotView[];
  isOwn: boolean;
  profileId: string;
};

const logo = brandLogo as StaticImageData;

export async function ProfileShowcaseGrid({ slots, isOwn, profileId }: Props) {
  const t = await getTranslations("Profile.showcase");

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold uppercase tracking-tight text-foreground">
            {t("title")}
          </h2>
          <p className="text-sm text-muted">{t("subtitle")}</p>
        </div>
        {isOwn && (
          <Link
            href={`/players/${profileId}/settings`}
            className="text-sm font-semibold text-secondary transition hover:text-white"
          >
            {t("edit")}
          </Link>
        )}
      </header>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: SHOWCASE_SLOT_COUNT }, (_, index) => {
          const entry = slots.find((s) => s.slot === index + 1) ?? { slot: index + 1, card: null };
          const card = entry.card;

          const slab = (
            <div className="showcase-slab-case">
              <div
                className="showcase-slab-label"
                style={{ "--slab-logo": `url(${logo.src})` } as React.CSSProperties}
                aria-hidden
              >
                <span className="showcase-slab-brand">Wildia</span>
              </div>

              <div className="showcase-slab-well">
                {card ? (
                  <TradingCard card={card} priorityImage={index < 2} />
                ) : (
                  <div className="showcase-slab-empty">
                    <p>{t("emptySlot")}</p>
                  </div>
                )}
              </div>

              <div className="showcase-slab-foot" aria-hidden />
            </div>
          );

          return (
            <li key={entry.slot} className="showcase-slab min-w-0" data-rarity={card?.rarity}>
              {card ? (
                <Link
                  href={`/cards/${card.slug}`}
                  className="showcase-slab-link block rounded-[5%] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {slab}
                </Link>
              ) : (
                slab
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
