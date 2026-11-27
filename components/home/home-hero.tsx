import { getTranslations } from "next-intl/server";
import { HomeHeroFan, pickHeroFanCards } from "@/components/home/home-hero-fan";
import { BrandLogo } from "@/components/layout/brand-logo";
import { ArrowRightIcon, BoosterIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { getUser } from "@/server/auth/require-user";
import { listCatalogCards } from "@/server/cards/queries";

type Props = { locale: string };

export async function HomeHero({ locale }: Props) {
  const t = await getTranslations("Home");
  const user = await getUser();
  const cards = await listCatalogCards(locale);
  const fanCards = pickHeroFanCards(cards, 3);

  return (
    <section className="relative isolate overflow-hidden rounded-lg border border-white/[0.06] bg-[linear-gradient(115deg,#04211a_0%,#0b4a33_38%,#17684a_72%,#0a2a1f_100%)] lg:h-[23rem]">
      <div aria-hidden className="absolute -left-20 -top-32 size-[28rem] rounded-full bg-brand/20 blur-3xl" />
      <div aria-hidden className="absolute -bottom-40 right-40 size-[30rem] rounded-full bg-[#2fa876]/30 blur-3xl" />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(90deg,transparent,black_60%)]"
      />

      <div className="relative z-10 flex h-full max-w-[36rem] flex-col justify-center px-6 pb-4 pt-10 sm:px-10 lg:py-0 lg:pl-12">
        <span className="mb-4 inline-flex w-fit items-center gap-2 text-xs font-medium text-white/80">
          <BrandLogo alt="" aria-hidden className="h-4 w-auto" />
          {t("heroKicker")}
        </span>
        <h1 className="text-balance text-[2rem] font-extrabold uppercase leading-[1.02] tracking-tight text-white [text-shadow:0_4px_30px_rgb(0_0_0_/_0.35)] sm:text-[2.6rem]">
          {t("heroTitle")}
        </h1>
        <p className="mt-4 max-w-md text-pretty text-sm leading-relaxed text-white/70 sm:text-[0.95rem]">
          {t("heroSubtitle")}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href={user ? "/boosters" : "/signup"}
            className="inline-flex items-center gap-2 rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong"
          >
            <BoosterIcon />
            {user ? t("heroCtaBooster") : t("heroCtaJoin")}
          </Link>
          <Link
            href="/cards"
            className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-black/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-black/30"
          >
            {t("heroReadMore")}
            <ArrowRightIcon />
          </Link>
        </div>
      </div>

      <HomeHeroFan cards={fanCards} />
    </section>
  );
}
