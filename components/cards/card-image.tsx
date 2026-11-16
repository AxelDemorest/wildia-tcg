import Image from "next/image";
import { getCardArtPublicUrl } from "@/lib/cards/card-art-url";

type Props = {
  slug: string;
  name: string;
  imagePath: string | null;
  priority?: boolean;
  /** Fills its (positioned) parent edge to edge, without aspect ratio or rounding. */
  fill?: boolean;
};

export function CardImage({ slug, name, imagePath, priority, fill }: Props) {
  const url = getCardArtPublicUrl(imagePath);
  const boxClass = fill ? "absolute inset-0" : "aspect-[2/3] w-full rounded-md";

  if (!url) {
    return (
      <div
        className={`flex ${boxClass} items-center justify-center bg-gradient-to-br from-[#0b2a1f] via-[#10241c] to-[#1b4a37] p-4 text-center`}
        aria-hidden
      >
        <span className="text-xs font-semibold uppercase tracking-widest text-white/50">
          {slug}
        </span>
      </div>
    );
  }

  return (
    <div className={`${fill ? "absolute inset-0" : "relative aspect-[2/3] w-full rounded-md"} overflow-hidden bg-[#0f1a15]`}>
      <Image
        src={url}
        alt={name}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        className="object-cover"
        priority={priority}
      />
    </div>
  );
}
