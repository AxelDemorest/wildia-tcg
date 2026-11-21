import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Generic panel / card container (not a trading card). */
export function Surface({ children, className = "" }: Props) {
  return (
    <div
      className={`rounded-2xl bg-surface/80 backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}
