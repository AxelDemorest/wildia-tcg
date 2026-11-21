import { getTranslations } from "next-intl/server";
import { TradingCard } from "@/components/cards/trading-card";
import { Link } from "@/i18n/navigation";
import { SHOWCASE_SLOT_COUNT, type ShowcaseSlotView } from "@/lib/profiles/showcase";
import { Surface } from "@/components/ui/surface";

type Props = {
  slots: ShowcaseSlotView[];
  isOwn: boolean;
  profileId: string;
};

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
            className="text-sm font-semibold text-brand transition hover:text-secondary"
          >
            {t("edit")}
          </Link>
        )}
      </header>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 lg:gap-6">
        {Array.from({ length: SHOWCASE_SLOT_COUNT }, (_, index) => {
          const entry = slots.find((s) => s.slot === index + 1) ?? { slot: index + 1, card: null };
          return (
            <li key={entry.slot} className="min-w-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                {t("slotLabel", { slot: entry.slot })}
              </p>
              {entry.card ? (
                <TradingCard card={entry.card} href={`/cards/${entry.card.slug}`} priorityImage={index < 2} />
              ) : (
                <Surface className="flex aspect-[2/3] items-center justify-center border border-dashed border-white/15 bg-white/[0.02] p-4 text-center">
                  <p className="text-sm text-muted">{t("emptySlot")}</p>
                </Surface>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}