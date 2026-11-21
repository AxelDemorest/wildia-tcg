import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OpeningCeremony } from "@/components/boosters/opening-ceremony";
import { PageHeader } from "@/components/ui/page-header";
import { openingPageAction } from "@/lib/boosters/opening-page-action";
import { shopNoticeHref } from "@/lib/boosters/shop-notice";
import { loadDrawForReveal } from "@/server/boosters/load-draw";

type Props = { params: Promise<{ locale: string; drawId: string }> };

export default async function OpeningPage({ params }: Props) {
  const { locale, drawId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Boosters");

  const outcome = await loadDrawForReveal(locale, drawId);
  // Decided on the server, before the ceremony looks for the shop's marker.
  if (!outcome.ok) {
    const leave = openingPageAction(outcome);
    if (leave.kind === "not-found") notFound();
    if (leave.kind === "login") redirect(`/${locale}/login`);
    redirect(shopNoticeHref(locale, leave.notice));
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <PageHeader title={t("openingTitle")} />
      <OpeningCeremony drawId={outcome.draw.drawId} cards={outcome.draw.cards} />
    </div>
  );
}
