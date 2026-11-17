import type { StaticImageData } from "next/image";
import brandLogo from "@/assets/brand/claws.png";

type Props = {
  alt: string;
  className?: string;
  priority?: boolean;
  "aria-hidden"?: boolean | "true" | "false";
};

const logo = brandLogo as StaticImageData;

/** The claws artwork is used as an alpha mask so it takes the brand gradient on dark surfaces. */
export function BrandLogo({ alt, className = "h-10 w-auto", "aria-hidden": ariaHidden }: Props) {
  return (
    <span
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={ariaHidden}
      className={`block aspect-square shrink-0 bg-gradient-to-br from-secondary to-brand ${className}`}
      style={{
        maskImage: `url(${logo.src})`,
        WebkitMaskImage: `url(${logo.src})`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}
