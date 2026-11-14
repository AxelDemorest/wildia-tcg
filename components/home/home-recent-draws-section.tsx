import { getTranslations } from "next-intl/server";
import { HomeRecentDraws } from "@/components/home/home-recent-draws";
import { listCatalogCards } from "@/server/cards/queries";
import { listRecentDrawnCards } from "@/server/boosters/recent-draws";

type Props = { locale: string };

export async function HomeRecentDrawsSection({ locale }: Props) {
  const t = await getTranslations("Home");
  const cards = await listCatalogCards(locale);
  const recentDraws = await listRecentDrawnCards(cards, 10);

  return (
    <section className="border-t border-border/70 bg-surface/40 py-12 sm:py-16">
      <HomeRecentDraws
        cards={recentDraws}
        kicker={t("recentDrawsKicker")}
        title={t("recentDrawsTitle")}
        cta={t("recentDrawsCta")}
        empty={t("recentDrawsEmpty")}
      />
    </section>
  );
}
