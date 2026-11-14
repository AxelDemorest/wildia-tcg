import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { HomeHeroFan, pickHeroFanCards } from "@/components/home/home-hero-fan";
import { listCatalogCards } from "@/server/cards/queries";
import { getUser } from "@/server/auth/require-user";

type Props = { locale: string };

export async function HomeHero({ locale }: Props) {
  const t = await getTranslations("Home");
  const user = await getUser();
  const cards = await listCatalogCards(locale);
  const fanCards = pickHeroFanCards(cards, 4);

  return (
    <section className="relative overflow-hidden pb-16 pt-16 sm:pb-24 sm:pt-20 lg:pt-24">
      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14">
        <div className="min-w-0 text-left">
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-[3.25rem] md:leading-[1.1]">
            {t("heroTitle")}
          </h1>
          <p className="mt-4 max-w-xl text-pretty text-base text-muted sm:mt-5 sm:text-lg">{t("heroSubtitle")}</p>

          <div className="mt-10 flex flex-wrap items-center gap-3 sm:mt-12 sm:gap-4">
            <Link
              href={user ? "/boosters" : "/signup"}
              className="inline-flex rounded-full bg-brand px-8 py-3.5 text-base font-semibold text-white shadow-[0_0_0_4px_rgb(13_122_78_/_0.18),0_0_28px_-4px_rgb(13_122_78_/_0.55)] ring-1 ring-brand/40 transition hover:bg-brand-strong hover:shadow-[0_0_0_5px_rgb(13_122_78_/_0.22),0_0_36px_-2px_rgb(13_122_78_/_0.6)]"
            >
              {user ? t("heroCtaBooster") : t("heroCtaJoin")}
            </Link>
            <Link
              href="/cards"
              className="inline-flex rounded-full border border-zinc-400/80 bg-white/50 px-6 py-2.5 text-sm font-medium text-foreground backdrop-blur-sm transition hover:bg-white/80"
            >
              {t("heroReadMore")}
            </Link>
          </div>
        </div>

        <div className="flex min-h-0 items-center justify-center lg:justify-center">
          <HomeHeroFan cards={fanCards} />
        </div>
      </div>
    </section>
  );
}
