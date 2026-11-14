"use client";

import { useLocale } from "next-intl";
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
            className={`flex h-9 w-9 items-center justify-center rounded-full text-lg leading-none transition ${
              active
                ? "bg-surface shadow-sm ring-2 ring-brand/35"
                : "opacity-75 hover:bg-black/5 hover:opacity-100"
            }`}
          >
            <span aria-hidden>{flags[loc]}</span>
          </button>
        );
      })}
    </div>
  );
}
