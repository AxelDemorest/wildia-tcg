import { getTranslations } from "next-intl/server";
import { syncUserEconomy } from "@/server/economy/sync-balance";

type Props = { userId: string };

export async function CurrencyBalance({ userId }: Props) {
  const t = await getTranslations("Economy");
  const economy = await syncUserEconomy(userId).catch(() => null);

  if (!economy) {
    return (
      <span className="text-xs text-muted" title={t("balanceError")}>
        {t("balanceUnavailable")}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-sm font-semibold text-amber-900 ring-1 ring-amber-200"
      title={t("balanceTitle")}
    >
      <span aria-hidden>🪙</span>
      {Math.floor(economy.balance).toLocaleString()}
      <span className="font-normal text-amber-800/80">{t("currencyShort")}</span>
    </span>
  );
}
