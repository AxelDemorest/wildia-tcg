import { getTranslations } from "next-intl/server";
import { CoinIcon } from "@/components/ui/icons";
import { Surface } from "@/components/ui/surface";
import { syncUserEconomy } from "@/server/economy/sync-balance";

type Props = { userId: string };

export async function CollectionEconomyBanner({ userId }: Props) {
  const t = await getTranslations("Economy");
  const economy = await syncUserEconomy(userId).catch(() => null);
  if (!economy) return null;

  const { balance, accrued } = economy;

  return (
    <Surface className="relative flex flex-wrap items-center justify-between gap-3 overflow-hidden px-5 py-4">
      <div aria-hidden className="absolute -left-10 -top-16 size-48 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="relative flex items-center gap-3">
        <CoinIcon className="size-9" />
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">{t("yourBalance")}</p>
          <p className="text-2xl font-extrabold tabular-nums text-white">
            {Math.floor(balance).toLocaleString()}{" "}
            <span className="text-sm font-medium text-muted">{t("currencyShort")}</span>
          </p>
        </div>
      </div>
      {accrued > 0 && (
        <p className="relative rounded-md bg-amber-300/10 px-3 py-1.5 text-sm font-semibold text-amber-300">
          {t("justFarmed", { amount: Math.floor(accrued) })}
        </p>
      )}
    </Surface>
  );
}
