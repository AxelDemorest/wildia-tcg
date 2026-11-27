import Image, { type StaticImageData } from "next/image";
import girafeAsset from "@/assets/brand/girafe.png";
import { momoTrustDisplay } from "@/app/fonts/momo-trust-display";

type Props = {
  className?: string;
  size?: "md" | "xl";
};

const sizeClasses = {
  md: {
    root: "text-[1.65rem] sm:text-[1.85rem]",
    badge: "text-[0.48rem] sm:text-[0.52rem]",
    girafe: "mx-[-0.16em] h-[1.12em] w-[1.12em] translate-y-[0.02em] translate-x-[0.06em]",
  },
  xl: {
    root: "text-[clamp(2.25rem,5vw,3rem)]",
    badge: "text-[clamp(0.6rem,1.1vw,0.9rem)]",
    girafe: "mx-[-0.19em] h-[1.12em] w-[1.12em] translate-y-[0.02em] translate-x-[0.06em]",
  },
} as const;

const girafe = girafeAsset as StaticImageData;

/** Logo lockup: Wildia (girafe for the first i) + TCG badge. */
export function BrandWordmark({ className = "", size = "md" }: Props) {
  const sizes = sizeClasses[size];

  return (
    <span
      aria-hidden
      className={`${momoTrustDisplay.className} relative isolate inline-block pr-3 font-normal leading-none text-brand-strong ${sizes.root} ${className}`}
    >
      <span className="inline-flex items-baseline">
        <span>W</span>
        <Image
          src={girafe}
          alt=""
          width={girafe.width}
          height={girafe.height}
          className={`inline-block shrink-0 object-contain object-bottom ${sizes.girafe}`}
        />
        <span>ldia</span>
      </span>
      <span
        className={`absolute right-0 top-0 translate-x-[18%] font-sans font-bold uppercase leading-none tracking-normal ${sizes.badge}`}
      >
        TCG
      </span>
    </span>
  );
}
