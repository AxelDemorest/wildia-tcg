import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

const FEATURES = ["species", "boosters", "farm", "binder", "profile", "rarity"] as const;

type FeatureKey = (typeof FEATURES)[number];

type IconProps = { className?: string };

function iconProps(className?: string) {
  return {
    "aria-hidden": true,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };
}

function SpeciesIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.6 2.6 4 5.6 4 9s-1.4 6.4-4 9c-2.6-2.6-4-5.6-4-9s1.4-6.4 4-9Z" />
    </svg>
  );
}

function BoosterIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M7 3h10l2 3v15H5V6l2-3Z" />
      <path d="M5 6h14M12 10l1.1 2.4 2.6.3-1.9 1.8.5 2.6L12 15.8 9.7 17.1l.5-2.6-1.9-1.8 2.6-.3L12 10Z" />
    </svg>
  );
}

function FarmIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M14.5 9.5c-.4-.9-1.4-1.5-2.5-1.5-1.4 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1.1 0-2.1-.6-2.5-1.5" />
    </svg>
  );
}

function BinderIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M9 3v18M13 8h4M13 12h4" />
    </svg>
  );
}

function ProfileIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.9 3.6-7 8-7s8 3.1 8 7" />
    </svg>
  );
}

function RarityIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M12 3 4 6v6c0 4.4 3.2 7.6 8 9 4.8-1.4 8-4.6 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

const ICONS: Record<FeatureKey, (props: IconProps) => ReactNode> = {
  species: SpeciesIcon,
  boosters: BoosterIcon,
  farm: FarmIcon,
  binder: BinderIcon,
  profile: ProfileIcon,
  rarity: RarityIcon,
};

/** Bento layout on large screens: the first and the last tiles span two columns. */
const SPANS: Record<FeatureKey, string> = {
  species: "lg:col-span-2",
  boosters: "",
  farm: "",
  binder: "",
  profile: "",
  rarity: "lg:col-span-2",
};

const RARITY_DOTS = [
  "bg-zinc-400",
  "bg-lime-500",
  "bg-sky-500",
  "bg-purple-500",
  "bg-accent",
  "bg-rose-500",
] as const;

function FeatureCard({
  featureKey,
  title,
  description,
}: {
  featureKey: FeatureKey;
  title: string;
  description: string;
}) {
  const Icon = ICONS[featureKey];
  const highlighted = featureKey === "farm";

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-3xl p-6 transition duration-300 hover:-translate-y-1 sm:p-7 ${
        highlighted
          ? "bg-[linear-gradient(135deg,#0b4a33_0%,#17684a_100%)] text-white"
          : "bg-white/[0.03] text-foreground hover:bg-white/[0.05]"
      } ${SPANS[featureKey]}`}
    >
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
          highlighted ? "bg-white/12 text-accent" : "bg-brand/10 text-brand"
        }`}
      >
        <Icon className="h-6 w-6" />
      </span>

      <h3 className="mt-5 text-lg font-bold tracking-tight sm:text-xl">{title}</h3>
      <p
        className={`mt-2 max-w-md text-pretty text-sm leading-relaxed sm:text-[0.95rem] ${
          highlighted ? "text-white/70" : "text-muted"
        }`}
      >
        {description}
      </p>

      {featureKey === "rarity" ? (
        <div className="mt-6 flex items-center gap-1.5" aria-hidden>
          {RARITY_DOTS.map((dot, i) => (
            <span key={dot} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
              {i < RARITY_DOTS.length - 1 ? <span className="h-px w-5 bg-white/15 sm:w-8" /> : null}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export async function HomeFeatures() {
  const t = await getTranslations("Home");

  return (
    <section
      id="features"
      className="scroll-mt-4 rounded-2xl bg-surface/80 py-12 backdrop-blur-md sm:py-16"
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <header className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand sm:text-sm">
            {t("featuresKicker")}
          </p>
          <h2 className="mt-3 text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl md:leading-[1.15]">
            {t("featuresTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-muted sm:text-lg">
            {t("featuresSubtitle")}
          </p>
        </header>

        <div className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {FEATURES.map((key) => (
            <FeatureCard
              key={key}
              featureKey={key}
              title={t(`feature_${key}_title`)}
              description={t(`feature_${key}_description`)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
