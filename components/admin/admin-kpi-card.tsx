import type { AppLocale } from "@/i18n/routing";
import { formatIndicator, type Indicator } from "@/lib/admin/home-indicators";

type Props = {
  label: string;
  value: Indicator;
  caption: string;
  /** Said to screen readers in place of the dash when the count could not be read. */
  unavailableLabel: string;
  locale: AppLocale;
  icon: React.ReactNode;
};

/** One read-only indicator of the admin home: label, count, caption. */
export function AdminKpiCard({ label, value, caption, unavailableLabel, locale, icon }: Props) {
  return (
    <section className="flex basis-[220px] flex-1 flex-col gap-2 rounded-xl border border-admin-line bg-white px-6 py-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-sans text-[13px]/[18px] font-medium text-admin-muted">{label}</h2>
        <span
          aria-hidden
          className="flex size-8 items-center justify-center rounded-[8px] bg-admin-subtle text-admin-text"
        >
          {icon}
        </span>
      </div>
      <p className="font-display text-[36px]/[44px] font-semibold text-admin-ink tabular-nums">
        {value === null ? (
          <>
            <span aria-hidden>{formatIndicator(value, locale)}</span>
            <span className="sr-only">{unavailableLabel}</span>
          </>
        ) : (
          formatIndicator(value, locale)
        )}
      </p>
      <p className="text-xs/4 text-admin-muted">{caption}</p>
    </section>
  );
}
