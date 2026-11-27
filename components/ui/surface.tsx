import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Generic panel / card container (not a trading card). */
export function Surface({ children, className = "" }: Props) {
  return (
    <div
      className={`rounded-lg border border-border bg-surface ${className}`}
    >
      {children}
    </div>
  );
}
