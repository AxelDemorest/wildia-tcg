import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getUser } from "@/server/auth/require-user";

export async function HomeCta() {
  const t = await getTranslations("Home");
  const user = await getUser();

  return (
    <section>
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[linear-gradient(115deg,#04211a_0%,#0b4a33_38%,#17684a_72%,#0a2a1f_100%)] px-6 py-14 text-center sm:px-12 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-[#2fa876]/30 blur-3xl"
        />

        <div className="relative mx-auto max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-secondary sm:text-sm">{t("ctaKicker")}</p>
          <h2 className="mt-3 text-balance text-2xl font-extrabold uppercase tracking-tight text-white sm:text-3xl md:text-4xl md:leading-[1.1]">
            {user ? t("ctaTitleUser") : t("ctaTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-white/65 sm:text-lg">
            {user ? t("ctaSubtitleUser") : t("ctaSubtitle")}
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              href={user ? "/boosters" : "/signup"}
              className="inline-flex rounded-xl bg-brand px-7 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong"
            >
              {user ? t("heroCtaBooster") : t("heroCtaJoin")}
            </Link>
            <Link
              href="/cards"
              className="inline-flex rounded-xl border border-white/20 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
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
