import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getUser } from "@/server/auth/require-user";

export async function HomeCta() {
  const t = await getTranslations("Home");
  const user = await getUser();

  return (
    <section className="border-t border-border/60 bg-background px-4 py-16 sm:px-6 sm:py-24">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[#14231a] px-6 py-14 text-center shadow-[var(--shadow-how-card)] sm:px-12 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-accent/20 blur-3xl"
        />

        <div className="relative mx-auto max-w-2xl">
          <p className="text-sm font-semibold tracking-wide text-accent sm:text-base">{t("ctaKicker")}</p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-[2.75rem] md:leading-[1.15]">
            {user ? t("ctaTitleUser") : t("ctaTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-white/65 sm:text-lg">
            {user ? t("ctaSubtitleUser") : t("ctaSubtitle")}
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              href={user ? "/boosters" : "/signup"}
              className="inline-flex rounded-full bg-white px-8 py-3.5 text-base font-semibold text-brand-strong shadow-[0_0_32px_-6px_rgb(255_255_255_/_0.45)] transition hover:bg-accent hover:text-ink"
            >
              {user ? t("heroCtaBooster") : t("heroCtaJoin")}
            </Link>
            <Link
              href="/cards"
              className="inline-flex rounded-full border border-white/30 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              {t("heroReadMore")}
            </Link>
          </div>

          {user ? null : <p className="mt-5 text-xs text-white/45 sm:text-sm">{t("ctaNote")}</p>}
        </div>
      </div>
    </section>
  );
}
