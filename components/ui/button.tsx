import { type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

const variantClass: Record<Variant, string> = {
  primary:
    "bg-brand font-semibold text-white hover:bg-brand-strong focus-visible:ring-brand disabled:bg-white/10 disabled:text-white/40",
  secondary:
    "border border-border bg-white/[0.03] text-foreground hover:border-border-strong hover:bg-white/[0.06] focus-visible:ring-brand",
  ghost: "text-secondary hover:bg-brand/10 focus-visible:ring-brand",
};

const sizeClass: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm font-medium",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  children,
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed ${variantClass[variant]} ${sizeClass[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
