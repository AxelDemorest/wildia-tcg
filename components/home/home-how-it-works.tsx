import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

const STEPS = [1, 2, 3] as const;

type StepKey = (typeof STEPS)[number];

type Tilt = "left" | "center" | "right";

const TILTS: Record<StepKey, Tilt> = {
  1: "left",
  2: "center",
  3: "right",
};

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M8 1.2 9.1 6.9 14.8 8 9.1 9.1 8 14.8 6.9 9.1 1.2 8 6.9 6.9Z" />
    </svg>
  );
}

function StepCard({
  step,
  title,
  caption,
  illustration,
  tilt,
}: {
  step: number;
  title: string;
  caption: string;
  illustration: ReactNode;
  tilt: Tilt;
}) {
  const label = String(step).padStart(2, "0");
  const tiltClass =
    tilt === "left"
      ? "lg:-rotate-6 lg:origin-bottom lg:translate-y-8"
      : tilt === "right"
        ? "lg:rotate-6 lg:origin-bottom lg:translate-y-8"
        : "lg:z-10 lg:-translate-y-3";

  return (
    <div className="relative w-full max-w-[22rem] transition-[translate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform hover:z-20 hover:-translate-y-5">
      <article
        className={`relative flex w-full flex-col overflow-hidden rounded-3xl bg-[linear-gradient(160deg,#1b2a23_0%,#18201c_55%,#16161b_100%)] px-7 pb-8 pt-8 text-left transition-[translate,rotate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-8 sm:pb-9 sm:pt-9 ${tiltClass}`}
      >
        <div className="relative w-fit">
          <span className="font-display text-[2.75rem] font-bold leading-none tracking-tight text-secondary sm:text-[3.15rem]">
            {label}
          </span>
          <SparkIcon className="absolute -right-3.5 -top-1 h-3 w-3 text-secondary" />
        </div>

        <h3 className="mt-5 text-xl font-bold tracking-tight text-white sm:text-[1.35rem]">
          {title}
        </h3>
        <p className="mt-2 max-w-[16rem] text-sm leading-relaxed text-white/55">
          {caption}
        </p>

        <div className="mt-8 flex min-h-[11rem] flex-1 items-center justify-center">
          {illustration}
        </div>
      </article>
    </div>
  );
}

function SignupIllustration() {
  return (
    <div className="w-full max-w-[11.5rem] rounded-2xl bg-white/5 p-3.5">
      <div className="space-y-2.5">
        <div className="h-2 w-16 rounded-full bg-white/20" />
        <div className="h-9 rounded-xl bg-white/10 px-3 text-[0.7rem] leading-9 text-white/50">
          email@…
        </div>
        <div className="h-9 rounded-xl bg-white/15" />
        <div className="rounded-xl bg-brand py-2 text-center text-xs font-bold text-white">
          OK
        </div>
      </div>
    </div>
  );
}

function BoosterIllustration() {
  return (
    <div className="relative flex items-end gap-3">
      <div className="relative h-28 w-[4.5rem] -rotate-6 rounded-xl bg-gradient-to-b from-brand to-[#3fb985]">
        <div className="absolute inset-x-2.5 top-4 h-1 rounded-full bg-white/35" />
        <div className="absolute inset-x-1.5 bottom-2.5 top-10 rounded-lg bg-black/40" />
      </div>
      <div className="flex flex-col gap-2 pb-1">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-[4.25rem] w-12 rounded-lg bg-white/95"
            style={{
              transform: `rotate(${i === 0 ? 8 : 14}deg) translateY(${i * 4}px)`,
            }}
          >
            <div className="mx-auto mt-2.5 h-5 w-5 rounded-full bg-brand/70" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FarmCollectIllustration() {
  return (
    <div className="w-full max-w-[12rem] overflow-hidden rounded-2xl bg-white/5">
      <div className="h-9 bg-gradient-to-r from-secondary via-brand to-[#3fb985]" />
      <div className="-mt-5 flex flex-col items-center px-3 pb-3.5">
        <div className="h-11 w-11 rounded-full bg-gradient-to-br from-brand to-[#3fb985]" />
        <div className="mt-2.5 h-2 w-20 rounded-full bg-white/25" />
        <div className="mt-3 flex w-full items-center justify-between rounded-lg bg-black/25 px-2.5 py-1.5 text-[0.65rem]">
          <span className="text-white/60">Solde</span>
          <span className="font-bold text-accent">+42</span>
        </div>
        <div className="mt-2.5 flex gap-1.5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-9 w-7 rounded-md bg-white/90" />
          ))}
        </div>
      </div>
    </div>
  );
}

const ILLUSTRATIONS: Record<StepKey, ReactNode> = {
  1: <SignupIllustration />,
  2: <BoosterIllustration />,
  3: <FarmCollectIllustration />,
};

export async function HomeHowItWorks() {
  const t = await getTranslations("Home");

  const steps = STEPS.map((n) => ({
    step: n,
    title: t(`howItWorksStep${n}Title`),
    caption: t(`howItWorksStep${n}Caption`),
    illustration: ILLUSTRATIONS[n],
    tilt: TILTS[n],
  }));

  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-4 overflow-hidden rounded-2xl bg-surface/80 pb-16 pt-12 backdrop-blur-md sm:pb-20 sm:pt-16"
    >
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" />
      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <header className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand sm:text-sm">
            {t("howItWorksKicker")}
          </p>
          <h2 className="mt-3 text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl md:leading-[1.15]">
            {t("howItWorksTitle")}
          </h2>
        </header>

        <div className="mt-14 flex flex-col items-center gap-8 sm:mt-16 lg:mt-20 lg:flex-row lg:items-end lg:justify-center lg:gap-1 lg:px-4 lg:pb-6 xl:gap-3">
          {steps.map(({ step, title, caption, illustration, tilt }) => (
            <StepCard
              key={step}
              step={step}
              title={title}
              caption={caption}
              illustration={illustration}
              tilt={tilt}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
