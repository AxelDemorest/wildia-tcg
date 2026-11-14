export const DESCRIPTION_MAX_LENGTH = 500;

/** `Lutra lutra` → `lutra-lutra`. */
export function slugFromScientificName(scientificName: string): string {
  return scientificName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Normalizes spacing and capitalisation of a binomial: `lutra  LUTRA` → `Lutra lutra`. */
export function normalizeScientificName(raw: string): string {
  const words = raw.trim().split(/\s+/).filter(Boolean);
  return words
    .map((word, i) => (i === 0 ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word.toLowerCase()))
    .join(" ");
}

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntity(entity: string, body: string): string {
  if (body.startsWith("#")) {
    const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : Number(body.slice(1));
    return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
  }
  return HTML_ENTITIES[body.toLowerCase()] ?? entity;
}

/** Wikipedia `titles.display` may contain markup (`<i>`) and a disambiguation suffix. */
export function cleanDisplayTitle(displayTitle: string): string {
  return displayTitle
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, decodeEntity)
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cuts a plain-text extract at the last sentence end that fits, else at a word boundary. */
export function truncateExtract(extract: string, maxLength = DESCRIPTION_MAX_LENGTH): string {
  const text = extract.replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;

  const head = text.slice(0, maxLength);
  const sentenceEnds = [...head.matchAll(/[.!?…](?=\s)/g)];
  const lastSentenceEnd = sentenceEnds.at(-1);
  if (lastSentenceEnd?.index !== undefined && lastSentenceEnd.index >= maxLength / 3) {
    return head.slice(0, lastSentenceEnd.index + 1);
  }

  const lastSpace = head.slice(0, maxLength - 1).lastIndexOf(" ");
  return `${head.slice(0, lastSpace > 0 ? lastSpace : maxLength - 1).trimEnd()}…`;
}
