import { getTranslations } from "next-intl/server";
import { CardImage } from "@/components/cards/card-image";
import { ChevronDownIcon, CoinIcon, SendIcon } from "@/components/ui/icons";
import { compareRarity } from "@/lib/cards/rarity";
import type { CatalogCard } from "@/lib/cards/types";
import { listCatalogCards } from "@/server/cards/queries";

type Props = { locale: string };

const MESSAGE_KEYS = ["m1", "m2", "m3", "m4", "m5", "m6", "m7"] as const;

/** Where the rare-pull highlight sits in the message list. */
const PULL_POSITION = 3;

const AVATAR_GRADIENTS = [
  "from-emerald-400 to-teal-600",
  "from-sky-400 to-indigo-600",
  "from-amber-300 to-orange-600",
  "from-fuchsia-400 to-violet-600",
  "from-rose-400 to-red-600",
  "from-lime-300 to-emerald-600",
];

function pickShowcaseCard(cards: CatalogCard[]): CatalogCard | null {
  const withArt = cards.filter((card) => card.image_path);
  const sorted = [...withArt].sort((a, b) => compareRarity(b.rarity, a.rarity));
  return sorted[1] ?? sorted[0] ?? null;
}

function Avatar({ name, index }: { name: string; index: number }) {
  return (
    <span
      aria-hidden
      className={`grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br text-xs font-bold text-white ring-2 ring-panel ${AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length]}`}
    >
      {name[0]?.toUpperCase()}
    </span>
  );
}

/** Visual-only player chat: messages are static placeholders until a real chat exists. */
export async function SiteChat({ locale }: Props) {
  const t = await getTranslations("Chat");
  const tRarity = await getTranslations("Catalog.rarity");
  const cards = await listCatalogCards(locale).catch(() => []);
  const showcase = pickShowcaseCard(cards);

  const messages = MESSAGE_KEYS.map((key, index) => (
    <li key={key} className="flex gap-2.5">
      <Avatar name={t(`${key}_user`)} index={index} />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-white">{t(`${key}_user`)}</p>
        <p className="text-xs leading-snug text-muted">{t(`${key}_text`)}</p>
      </div>
    </li>
  ));

  return (
    <aside
      aria-label={t("label")}
      className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-panel"
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.05] px-4">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          {t("title")}
          <ChevronDownIcon className="size-3 text-muted" />
        </span>
      </div>

      <ul className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 [mask-image:linear-gradient(180deg,transparent,black_4%,black_94%,transparent)] [scrollbar-width:thin]">
        {messages.slice(0, PULL_POSITION)}

        {showcase && (
          <li className="relative shrink-0 overflow-hidden rounded-xl bg-[linear-gradient(120deg,#3b2205_0%,#7a4308_55%,#c47a12_100%)] p-3">
            <div aria-hidden className="absolute -right-6 -top-6 size-24 rounded-full bg-amber-300/30 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <Avatar name={t("pullUser")} index={3} />
                  {t("pullUser")}
                </p>
                <p className="mt-2 whitespace-nowrap text-[13px] font-extrabold uppercase text-amber-200">
                  {t("rarePull", { rarity: tRarity(showcase.rarity).toLowerCase() })}
                </p>
                <p className="truncate text-[11px] text-amber-100/80">{showcase.name}</p>
                <p className="mt-1.5 flex items-center gap-1 text-xs font-bold tabular-nums text-white">
                  <CoinIcon className="size-3.5" />+{(showcase.farm_rate_base * 3600).toFixed(1)} {t("perHour")}
                </p>
              </div>
              <span className="relative block h-[5.5rem] w-[3.7rem] shrink-0 rotate-6 overflow-hidden rounded-lg shadow-[0_10px_24px_-8px_rgb(0_0_0_/_0.8)] ring-2 ring-amber-200/80">
                <CardImage slug={showcase.slug} name={showcase.name} imagePath={showcase.image_path} />
              </span>
            </div>
          </li>
        )}

        {messages.slice(PULL_POSITION)}
      </ul>

      <div className="shrink-0 border-t border-white/[0.05] p-3">
        <div className="flex items-center gap-2 rounded-xl bg-[#16161b] px-3 py-1.5">
          <input
            type="text"
            disabled
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
            className="min-w-0 flex-1 bg-transparent py-1 text-xs text-white placeholder:text-muted disabled:cursor-not-allowed"
          />
          <button type="button" disabled aria-label={t("send")} className="text-brand disabled:opacity-70">
            <SendIcon />
          </button>
        </div>
      </div>
    </aside>
  );
}
