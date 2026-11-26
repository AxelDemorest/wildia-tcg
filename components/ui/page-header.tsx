import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Rendered under the subtitle (links, badges, actions). */
  children?: ReactNode;
};

/** Page title: a large centered heading with a one-line description, straight on the page background. */
export function PageHeader({ title, subtitle, children }: Props) {
  return (
    <header className="flex flex-col items-center gap-3 px-4 pb-2 pt-6 text-center sm:pt-10">
      <h1 className="text-balance text-4xl font-extrabold uppercase tracking-tight text-foreground sm:text-5xl lg:text-6xl">
        {title}
      </h1>
      {subtitle ? <p className="max-w-xl text-pretty text-sm text-muted sm:text-base">{subtitle}</p> : null}
      {children}
    </header>
  );
}
