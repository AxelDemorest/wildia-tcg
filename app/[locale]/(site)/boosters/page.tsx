import { getTranslations, setRequestLocale } from "next-intl/server";
import { BoosterShop } from "@/components/boosters/booster-shop";
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
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-brand-strong">{t("title")}</h1>
        <p className="max-w-2xl text-muted">{t("subtitle")}</p>
      </header>
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
