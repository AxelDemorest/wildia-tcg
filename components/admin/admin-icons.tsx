import { CoinIcon } from "@/components/ui/icons";

/** Icons of the espace administration, with the admin mockup's paths and stroke. */
type IconProps = { className?: string };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function AdminHomeIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M10 21v-6h4v6" />
    </svg>
  );
}

export function AdminUsersIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function AdminUserPlusIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M22 11h-6" />
    </svg>
  );
}

export function AdminShieldIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function AdminArrowRightIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2} aria-hidden>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export function AdminArrowLeftIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

export function AdminLogOutIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function AdminSearchIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2} aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function AdminArrowDownIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2} aria-hidden>
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </svg>
  );
}

export function AdminLockIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2} aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function AdminEyeOffIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

export function AdminChevronLeftIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2} aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function AdminChevronRightIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2} aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function AdminSettingsIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function AdminCheckIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2} aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function AdminAlertCircleIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

export function AdminRotateCcwIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2} aria-hidden>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

/** The game's coin with a small green "+" badge in its top-right corner: coins are added. */
export function AdminCoinPlusIcon() {
  return (
    <span className="relative inline-flex size-5" aria-hidden>
      <CoinIcon className="size-5" />
      <svg viewBox="0 0 10 10" className="absolute -top-1 -right-1 size-2.5">
        <circle cx="5" cy="5" r="5" className="fill-brand" />
        <path d="M5 2.5v5M2.5 5h5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}
