import Image, { type StaticImageData } from "next/image";
import brandLogo from "@/assets/brand/claws.png";

type Props = {
  alt: string;
  className?: string;
  priority?: boolean;
  "aria-hidden"?: boolean | "true" | "false";
};

const logo = brandLogo as StaticImageData;

export function BrandLogo({ alt, className = "h-10 w-auto", priority, "aria-hidden": ariaHidden }: Props) {
  return (
    <Image
      src={logo}
      alt={alt}
      width={logo.width}
      height={logo.height}
      className={className}
      priority={priority}
      aria-hidden={ariaHidden}
    />
  );
}
