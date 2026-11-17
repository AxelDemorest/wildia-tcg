type IconProps = { className?: string };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function HomeIcon({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

export function CatalogIcon({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="9" rx="1.5" />
      <rect x="3" y="15" width="7" height="6" rx="1.5" />
      <rect x="14" y="15" width="7" height="6" rx="1.5" />
    </svg>
  );
}

export function BoosterIcon({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M6 3h12l-1 3 1 3-1 3 1 3-1 3 1 3H6l1-3-1-3 1-3-1-3 1-3-1-3Z" />
      <path d="M10 11.5 12 9l2 2.5-2 2.5-2-2.5Z" />
    </svg>
  );
}

export function BinderIcon({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M5 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5Z" />
      <path d="M9 3v18" />
      <path d="M3 7h3M3 12h3M3 17h3" />
    </svg>
  );
}

export function ProfileIcon({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  );
}

export function BellIcon({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function GlobeIcon({ className = "size-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.6 2.6 4 5.6 4 9s-1.4 6.4-4 9c-2.6-2.6-4-5.6-4-9s1.4-6.4 4-9Z" />
    </svg>
  );
}

export function ChevronDownIcon({ className = "size-3" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2.4} aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function ArrowRightIcon({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2.2} aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function UsersIcon({ className = "size-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .6 3 2.2 3.5 5" />
    </svg>
  );
}

export function LeafIcon({ className = "size-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M20 4C9 4 4 9 4 16c0 2 .5 3 1 4 1-5 5-9 10-10-4 2-7 6-8 11 9 0 13-6 13-17Z" />
    </svg>
  );
}

export function SparkIcon({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2c.6 4.6 2.4 7.4 7 8-4.6.6-6.4 3.4-7 8-.6-4.6-2.4-7.4-7-8 4.6-.6 6.4-3.4 7-8Z" />
    </svg>
  );
}

export function SendIcon({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden>
      <path d="M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z" />
    </svg>
  );
}

/** Gold coin used for the in-game currency. */
export function CoinIcon({ className = "size-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id="coin-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset="1" stopColor="#d99a12" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#coin-fill)" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="#a86f00" strokeWidth="1.4" opacity="0.6" />
      <path d="M8.5 9.5 10 15l2-4 2 4 1.5-5.5" fill="none" stroke="#7a4f00" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
