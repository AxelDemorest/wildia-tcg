import type { CardRarity, IucnStatus } from "@/lib/cards/types";
import { isCardArtWebpPath } from "@/lib/cards/import/card-art-webp";

export const CARD_LOCALES = ["fr", "en"] as const;

export type CardLocale = (typeof CARD_LOCALES)[number];

export type TaxonData = {
  qid: string;
  scientificName: string;
  iucnStatus: IucnStatus | null;
  /** Wikidata item of the P141 value, kept to trace unmapped statuses. */
  iucnStatusQid: string | null;
  iucnAssessedAt: string | null;
  iucnTaxonId: string | null;
  sitelinks: Partial<Record<CardLocale, string>>;
};

export type TranslationDraft = {
  wikipediaTitle: string;
  name: string;
  extract: string;
  description: string;
};

export type ImageCandidate = {
  pixabayId: number;
  pageUrl: string;
  previewUrl: string;
  user: string;
  tags: string;
  score: number;
  query: string;
};

export type SelectedImage = {
  pixabayId: number;
  pageUrl: string;
  user: string;
  tags: string;
  source: "auto" | "manual";
  /** Relative to the repo root once downloaded. */
  localPath: string | null;
  contentType: string | null;
};

export type EntryStatus = "pending" | "ready" | "needs_review" | "rejected" | "published";

export type WorkEntry = {
  slug: string;
  scientificName: string;
  /** Wikidata item forced from the seed file when the name is ambiguous. */
  pinnedQid: string | null;
  fetchedAt: string | null;
  taxon: TaxonData | null;
  rarity: CardRarity | null;
  translations: Partial<Record<CardLocale, TranslationDraft>>;
  /** Card names set during review; they survive a refetch. */
  nameOverrides: Partial<Record<CardLocale, string>>;
  imageSearchedAt: string | null;
  imageCandidates: ImageCandidate[];
  image: SelectedImage | null;
  approved: boolean;
  flags: string[];
  status: EntryStatus;
  /** Reset to null whenever card content changes, so the card is published again. */
  publishedAt: string | null;
};

export type WorkFile = {
  version: 1;
  entries: Record<string, WorkEntry>;
};

/**
 * Flags from fetching that make the card impossible to build. Fixed by editing the
 * seed (pin a QID, change species), never by approval.
 */
const BLOCKING_FLAG_PREFIXES = ["taxon_", "iucn_", "wiki_"];

/** Flags a human can accept with `--approve`. */
const APPROVABLE_FLAGS = new Set(["name_is_scientific"]);

export function isBlockingFlag(flag: string): boolean {
  return BLOCKING_FLAG_PREFIXES.some((prefix) => flag.startsWith(prefix));
}

export function createWorkEntry(slug: string, scientificName: string, pinnedQid: string | null): WorkEntry {
  return {
    slug,
    scientificName,
    pinnedQid,
    fetchedAt: null,
    taxon: null,
    rarity: null,
    translations: {},
    nameOverrides: {},
    imageSearchedAt: null,
    imageCandidates: [],
    image: null,
    approved: false,
    flags: [],
    status: "pending",
    publishedAt: null,
  };
}

/** Image flags are derived from the current selection, so they never go stale. */
function imageFlags(entry: WorkEntry): string[] {
  if (!entry.imageSearchedAt && !entry.image) return [];
  if (!entry.image) return [entry.imageCandidates.length > 0 ? "image_uncertain" : "image_missing"];
  if (!entry.image.localPath) return ["image_not_downloaded"];
  if (!isCardArtWebpPath(entry.image.localPath)) return ["image_not_webp"];
  return [];
}

/** Wikipedia sometimes titles the article with the binomial (common on frwiki). */
function nameFlags(entry: WorkEntry): string[] {
  const scientific = entry.scientificName.toLowerCase();
  return CARD_LOCALES.some((locale) => entry.translations[locale]?.name.toLowerCase() === scientific)
    ? ["name_is_scientific"]
    : [];
}

export function applyNameOverrides(entry: WorkEntry): void {
  for (const locale of CARD_LOCALES) {
    const name = entry.nameOverrides[locale];
    const translation = entry.translations[locale];
    if (name && translation) translation.name = name;
  }
}

export function evaluateEntry(entry: WorkEntry): Pick<WorkEntry, "flags" | "status"> {
  const dataFlags = entry.flags.filter((f) => !f.startsWith("image_") && f !== "name_is_scientific");
  const flags = [...dataFlags, ...nameFlags(entry), ...imageFlags(entry)];

  if (!entry.fetchedAt) return { flags, status: "pending" };
  if (flags.some(isBlockingFlag)) return { flags, status: "rejected" };
  if (entry.publishedAt) return { flags, status: "published" };

  const imageReady =
    entry.image?.localPath != null && isCardArtWebpPath(entry.image.localPath);
  const unresolved = flags.filter((f) => !(entry.approved && APPROVABLE_FLAGS.has(f)));
  const complete =
    entry.rarity !== null && CARD_LOCALES.every((locale) => entry.translations[locale]) && imageReady;

  if (!entry.imageSearchedAt && !entry.image) return { flags, status: "pending" };
  return { flags, status: complete && unresolved.length === 0 ? "ready" : "needs_review" };
}
