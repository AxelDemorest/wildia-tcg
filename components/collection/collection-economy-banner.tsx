import { getTranslations } from "next-intl/server";
import { Surface } from "@/components/ui/surface";
import { syncUserEconomy } from "@/server/economy/sync-balance";

type Props = { userId: string };

export async function CollectionEconomyBanner({ userId }: Props) {
  const t = await getTranslations("Economy");
  const economy = await syncUserEconomy(userId).catch(() => null);
  if (!economy) return null;

  const { balance, accrued } = economy;

  return (
    <Surface className="mb-6 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div>
        <p className="text-sm text-muted">{t("yourBalance")}</p>
        <p className="text-2xl font-bold text-amber-900">
          {Math.floor(balance).toLocaleString()}{" "}
          <span className="text-base font-medium">{t("currencyShort")}</span>
        </p>
      </div>
      {accrued > 0 && (
        <p className="text-sm text-brand">{t("justFarmed", { amount: Math.floor(accrued) })}</p>
      )}
    </Surface>
  );
}
