import { getTranslations, setRequestLocale } from "next-intl/server";
import { BoosterShop } from "@/components/boosters/booster-shop";
import { PageHeader } from "@/components/ui/page-header";
import { getUser } from "@/server/auth/require-user";
import { listActiveBoosters } from "@/server/boosters/queries";

type Props = { params: Promise<{ locale: string }> };

export default async function BoostersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Boosters");
  const user = await getUser();
  const boosters = await listActiveBoosters().catch(() => []);

  return (
    <div className="flex w-full flex-col gap-5">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <BoosterShop
        locale={locale}
        boosters={boosters.map((b) => ({
          id: b.id,
          slug: b.slug,
          costCoins: b.costCoins,
          slots: b.slots,
        }))}
        isLoggedIn={Boolean(user)}
      />
    </div>
  );
}
