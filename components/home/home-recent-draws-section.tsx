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
    <section className="rounded-2xl border border-border bg-surface/80 py-5 backdrop-blur-md">
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
