import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Generic panel / card container (not a trading card). */
export function Surface({ children, className = "" }: Props) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface/80 shadow-[var(--shadow-card)] backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}
