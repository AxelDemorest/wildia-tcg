import { getTranslations } from "next-intl/server";

const QUESTIONS = ["free", "getCards", "rarity", "farm", "duplicates", "fairness", "profile"] as const;

export async function HomeFaq() {
  const t = await getTranslations("Home");

  return (
    <section
      id="faq"
      className="scroll-mt-4 rounded-2xl border border-border bg-surface/80 py-12 backdrop-blur-md sm:py-16"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <header className="text-center lg:sticky lg:top-8 lg:self-start lg:text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand sm:text-sm">{t("faqKicker")}</p>
          <h2 className="mt-3 text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl md:leading-[1.15]">
            {t("faqTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-pretty text-base text-muted lg:mx-0">{t("faqSubtitle")}</p>
        </header>

        <div className="space-y-3">
          {QUESTIONS.map((key) => (
            <details
              key={key}
              name="home-faq"
              className="group rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] transition hover:bg-white/[0.05] open:bg-white/[0.05] open:ring-brand/40"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left text-base font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:px-6 sm:py-5 [&::-webkit-details-marker]:hidden">
                <span>{t(`faq_${key}_q`)}</span>
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/20 transition duration-300 group-open:rotate-45 group-open:bg-brand group-open:text-white"
                >
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M8 2v12M2 8h12" />
                  </svg>
                </span>
              </summary>
              <p className="px-5 pb-5 text-pretty text-sm leading-relaxed text-muted sm:px-6 sm:pb-6 sm:text-[0.95rem]">
                {t(`faq_${key}_a`)}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
