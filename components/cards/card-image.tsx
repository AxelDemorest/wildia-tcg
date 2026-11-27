import Image from "next/image";
import { getCardArtPublicUrl } from "@/lib/cards/card-art-url";

type Props = {
  slug: string;
  name: string;
  imagePath: string | null;
  priority?: boolean;
};

/** Species art; fills its (positioned) parent edge to edge, the card face's preview window. */
export function CardImage({ slug, name, imagePath, priority }: Props) {
  const url = getCardArtPublicUrl(imagePath);

  if (!url) {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0b2a1f] via-[#10241c] to-[#1b4a37] p-4 text-center"
        aria-hidden
      >
        <span className="text-xs font-semibold uppercase tracking-widest text-white/50">
          {slug}
        </span>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0f1a15]">
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
