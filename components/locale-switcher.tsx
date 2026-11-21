"use client";

import { useLocale } from "next-intl";
import { ChevronDownIcon } from "@/components/ui/icons";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

const flags: Record<AppLocale, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
};

const labels: Record<AppLocale, string> = {
  fr: "Français",
  en: "English",
};

export function LocaleSwitcher() {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Language">
      {routing.locales.map((loc) => {
        const active = loc === locale;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => router.replace(pathname, { locale: loc })}
            aria-label={labels[loc]}
            aria-pressed={active}
            title={labels[loc]}
            className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg leading-none transition ${
              active
                ? "bg-white/[0.06]"
                : "opacity-60 hover:bg-white/[0.04] hover:opacity-100"
            }`}
          >
            <span aria-hidden>{flags[loc]}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Compact dropdown for the header. */
export function LocaleSelect({ label }: { label: string }) {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="relative inline-flex items-center rounded-lg bg-surface text-[11px] font-semibold uppercase text-muted transition focus-within:ring-2 focus-within:ring-brand hover:text-white">
      <span className="sr-only">{label}</span>
      <select
        value={locale}
        onChange={(event) => router.replace(pathname, { locale: event.target.value as AppLocale })}
        className="appearance-none bg-transparent py-1.5 pl-2.5 pr-6 uppercase focus:outline-none"
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc} className="bg-surface text-white">
            {loc}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2 size-3" />
    </label>
  );
}
