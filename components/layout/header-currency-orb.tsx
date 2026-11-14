import { getTranslations } from "next-intl/server";
import { syncUserEconomy } from "@/server/economy/sync-balance";

type Props = { userId: string };

function formatCompact(value: number): string {
  const n = Math.floor(value);
  if (n >= 100_000) return `${Math.round(n / 1000)}k`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return n.toLocaleString();
}

export async function HeaderCurrencyOrb({ userId }: Props) {
  const t = await getTranslations("Economy");

  try {
    const { balance } = await syncUserEconomy(userId);
    const formatted = formatCompact(balance);

    return (
      <div
        className="flex h-10 min-w-10 items-center justify-center rounded-full border-2 border-white bg-surface px-3 shadow-sm ring-1 ring-black/10"
        title={`${Math.floor(balance).toLocaleString()} ${t("currencyShort")}`}
      >
        <span className="text-sm font-bold tabular-nums tracking-tight text-foreground">{formatted}</span>
      </div>
    );
  } catch {
    return (
      <div
        className="flex h-10 min-w-10 items-center justify-center rounded-full border-2 border-white bg-surface px-3 text-xs text-muted shadow-sm ring-1 ring-black/10"
        title={t("balanceError")}
        aria-label={t("balanceUnavailable")}
      >
        —
      </div>
    );
  }
}
