import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Rendered under the subtitle (links, badges, actions). */
  children?: ReactNode;
};

/** Page banner: a smaller take on the home hero gradient. */
export function PageHeader({ title, subtitle, children }: Props) {
  return (
    <header className="relative isolate overflow-hidden rounded-2xl border border-white/[0.06] bg-[linear-gradient(115deg,#06261b_0%,#0e4733_45%,#15604a_100%)] px-6 py-7 sm:px-8">
      <div aria-hidden className="absolute -right-16 -top-24 size-72 rounded-full bg-[#2fa876]/30 blur-3xl" />
      <div aria-hidden className="absolute -bottom-24 -left-10 size-64 rounded-full bg-brand/20 blur-3xl" />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(90deg,transparent,black_70%)]"
      />
      <div className="relative space-y-2">
        <h1 className="text-balance text-2xl font-extrabold uppercase tracking-tight text-white sm:text-3xl">{title}</h1>
        {subtitle ? <p className="max-w-2xl text-pretty text-sm text-white/70 sm:text-[0.95rem]">{subtitle}</p> : null}
        {children}
      </div>
    </header>
  );
}
