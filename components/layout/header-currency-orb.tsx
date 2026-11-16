import { getTranslations } from "next-intl/server";
import { CoinIcon } from "@/components/ui/icons";
import { syncUserEconomy } from "@/server/economy/sync-balance";

type Props = { userId: string };

function formatCompact(value: number): string {
  const n = Math.floor(value);
  if (n >= 100_000) return `${Math.round(n / 1000)}k`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return n.toLocaleString();
}

const pillClass =
  "inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-surface py-1.5 pl-2 pr-3 text-sm font-bold tabular-nums";

export async function HeaderCurrencyOrb({ userId }: Props) {
  const t = await getTranslations("Economy");
  const economy = await syncUserEconomy(userId).catch(() => null);

  if (!economy) {
    return (
      <div className={`${pillClass} text-muted`} title={t("balanceError")} aria-label={t("balanceUnavailable")}>
        <CoinIcon className="size-5 opacity-50" />—
      </div>
    );
  }

  return (
    <div className={pillClass} title={`${Math.floor(economy.balance).toLocaleString()} ${t("currencyShort")}`}>
      <CoinIcon className="size-5" />
      {formatCompact(economy.balance)}
      <span className="hidden text-xs font-medium text-muted sm:inline">{t("currencyShort")}</span>
    </div>
  );
}
