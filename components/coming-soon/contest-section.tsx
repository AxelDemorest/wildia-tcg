import { getTranslations } from "next-intl/server";
import { ContestForm } from "@/components/coming-soon/contest-form";
import { TiltCard } from "@/components/coming-soon/tilt-card";
import { TradingCard } from "@/components/cards/trading-card";
import { CONTEST } from "@/lib/contest/config";
import type { CatalogCard } from "@/lib/cards/types";
import { getCatalogCardBySlug } from "@/server/cards/queries";

type Props = { locale: string };

/** The prize card is configured in `lib/contest/config.ts`; a missing card never breaks the page. */
async function loadContestCard(locale: string): Promise<CatalogCard | null> {
  try {
    return await getCatalogCardBySlug(locale, CONTEST.cardSlug);
  } catch {
    return null;
  }
}

export async function ContestSection({ locale }: Props) {
  const t = await getTranslations("ComingSoon");
  const card = await loadContestCard(locale);
  return (
    <section aria-labelledby="contest-title" className="mt-auto pt-10">
      <div
        className={`relative grid gap-7 overflow-hidden rounded-[2rem] border border-white/[0.06] bg-[linear-gradient(115deg,#04211a_0%,#0b4a33_38%,#17684a_72%,#0a2a1f_100%)] p-6 sm:p-8 ${card ? "xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start xl:gap-10" : ""}`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-[#2fa876]/30 blur-3xl"
        />

        <div className="relative min-w-0 max-w-lg self-start">
          <h2
            id="contest-title"
            className="mt-2 text-balance text-2xl font-bold leading-[1.15] tracking-tight text-white sm:text-2xl"
          >
            {t("contestTitle")}
          </h2>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-white/65 sm:text-sm">
            {t("contestLead")}
          </p>

          <div className="mt-4">
            <ContestForm />
          </div>

          <p className="mt-3 text-xs leading-relaxed text-white/45">{t("contestNote")}</p>
        </div>

        {card ? (
          <div className="relative flex justify-center self-start xl:justify-end">
            <TiltCard className="w-[clamp(9rem,26dvh,13.5rem)] p-1">
              <TradingCard card={card} priorityImage />
            </TiltCard>
          </div>
        ) : null}
      </div>
    </section>
  );
}
