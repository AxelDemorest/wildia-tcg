export type ImageHit = {
  id: number;
  tags: string;
  likes: number;
};

export type ImageNames = {
  scientificName: string;
  english?: string;
  french?: string;
};

export type ImageScore = {
  score: number;
  matchedName: boolean;
  penalized: boolean;
};

/** Tags that point to drawings, objects or remains rather than a photo of the live animal. */
const REJECTED_TAGS = [
  "illustration",
  "drawing",
  "cartoon",
  "clipart",
  "clip art",
  "logo",
  "icon",
  "map",
  "skeleton",
  "skull",
  "fossil",
  "toy",
  "plush",
  "stamp",
  "diagram",
  "taxidermy",
  "statue",
  "sculpture",
  "dessin",
  "carte",
  "squelette",
  "jouet",
  "timbre",
];

/** Minimum score for a hit to be picked without human review. */
export const AUTO_PICK_MIN_SCORE = 4;

function splitTags(tags: string): string[] {
  return tags
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

export function scoreImageHit(hit: ImageHit, names: ImageNames): ImageScore {
  const tags = splitTags(hit.tags);
  const joined = ` ${tags.join(" ")} `;
  let score = 0;
  let matchedName = false;

  const [genus, epithet] = names.scientificName.toLowerCase().split(" ");
  if (tags.includes(names.scientificName.toLowerCase())) {
    score += 6;
    matchedName = true;
  } else if (genus && epithet && joined.includes(` ${genus} `) && joined.includes(` ${epithet} `)) {
    score += 5;
    matchedName = true;
  }

  // English head noun is the last word ("Eurasian otter"), French the first ("Loutre d'Europe").
  const vernaculars = [
    { name: names.english, head: names.english?.split(" ").at(-1) },
    { name: names.french, head: names.french?.split(" ")[0] },
  ];
  for (const { name, head } of vernaculars) {
    if (!name) continue;
    if (tags.includes(name.toLowerCase())) {
      score += 4;
      matchedName = true;
    } else if (head && head.length > 2 && tags.includes(head.toLowerCase())) {
      score += 2;
    }
  }

  const penalized = tags.some((tag) => {
    const words = tag.split(/\s+/);
    return REJECTED_TAGS.some((rejected) =>
      rejected.includes(" ")
        ? tag.includes(rejected)
        : words.includes(rejected) || words.includes(`${rejected}s`),
    );
  });
  if (penalized) score -= 10;

  score += Math.min(Math.log10(hit.likes + 1) * 0.1, 0.5);

  return { score: Math.round(score * 100) / 100, matchedName, penalized };
}

export type RankedHit<T extends ImageHit> = T & ImageScore;

export function rankImageHits<T extends ImageHit>(hits: readonly T[], names: ImageNames): RankedHit<T>[] {
  return hits
    .map((hit) => ({ ...hit, ...scoreImageHit(hit, names) }))
    .sort((a, b) => b.score - a.score);
}

/** A hit is auto-picked only when its tags name the species and nothing suggests a non-photo. */
export function isAutoPickable(hit: ImageScore): boolean {
  return hit.matchedName && !hit.penalized && hit.score >= AUTO_PICK_MIN_SCORE;
}
