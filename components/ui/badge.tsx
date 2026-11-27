import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export function Badge({ children, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${className}`}
    >
      {children}
    </span>
  );
}
