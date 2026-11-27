import { getTranslations, setRequestLocale } from "next-intl/server";
import { BoosterShop } from "@/components/boosters/booster-shop";
import { ShopExplainer } from "@/components/boosters/shop-explainer";
import { PageHeader } from "@/components/ui/page-header";
import { getUser } from "@/server/auth/require-user";
import { getBoosterShopOffer } from "@/server/boosters/shop";

type Props = { params: Promise<{ locale: string }> };

/** Server clock against the window's horizon; the client counts down from this, not from its own clock. */
function secondsUntil(isoDate: string): number {
  return (Date.parse(isoDate) - Date.now()) / 1000;
}

export default async function BoostersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Boosters");
  const user = await getUser();
  const offer = user ? await getBoosterShopOffer().catch(() => null) : null;

  const secondsLeft = offer ? secondsUntil(offer.endsAt) : 0;

  return (
    <div className="flex w-full flex-col gap-5">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <ShopExplainer />
      <BoosterShop
        locale={locale}
        offer={offer}
        secondsLeft={secondsLeft}
        isLoggedIn={Boolean(user)}
        userId={user?.id ?? null}
      />
    </div>
  );
}
