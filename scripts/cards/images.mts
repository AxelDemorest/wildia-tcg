/**
 * Step 2 — card art from Pixabay.
 * Searches the scientific name, then the English and French names, scores hits on their
 * tags, and downloads a single photo only when the match is confident. Otherwise the
 * top candidates are kept for `cards:review`.
 */
import { isAutoPickable, rankImageHits, type RankedHit } from "@/lib/cards/import/image-score";
import { evaluateEntry, type ImageCandidate, type WorkEntry } from "@/lib/cards/import/work-entry";
import { requireEnv } from "./lib/env";
import { downloadPhoto, searchPhotos, type PixabayHit } from "./lib/pixabay";
import {
  entriesInSeedOrder,
  loadWorkFile,
  parseArgs,
  printCounts,
  readSeed,
  saveWorkFile,
} from "./lib/store";

const CANDIDATES_KEPT = 3;

type QueriedHit = PixabayHit & { query: string };

const args = parseArgs(process.argv.slice(2));
const force = args.has("force");
const only = new Set(args.get("only") ?? []);
const apiKey = requireEnv("PIXABAY_API_KEY", "Clé disponible sur https://pixabay.com/api/docs/.");

const seed = readSeed();
const work = loadWorkFile();

const targets = entriesInSeedOrder(work, seed).filter((entry) => {
  if (only.size > 0 && !only.has(entry.slug)) return false;
  const status = evaluateEntry(entry).status;
  if (status === "rejected" || !entry.fetchedAt) return false;
  if (entry.image?.source === "manual" && !force) return false;
  return force || (!entry.imageSearchedAt && !entry.image);
});
console.log(`${targets.length} carte(s) sans image à chercher.`);

function queriesFor(entry: WorkEntry): { q: string; lang: "en" | "fr" }[] {
  const queries: { q: string; lang: "en" | "fr" }[] = [{ q: entry.scientificName, lang: "en" }];
  const en = entry.translations.en?.name;
  const fr = entry.translations.fr?.name;
  if (en && en.toLowerCase() !== entry.scientificName.toLowerCase()) queries.push({ q: en, lang: "en" });
  if (fr && fr.toLowerCase() !== entry.scientificName.toLowerCase()) queries.push({ q: fr, lang: "fr" });
  return queries;
}

async function searchEntry(entry: WorkEntry): Promise<void> {
  const names = {
    scientificName: entry.scientificName,
    english: entry.translations.en?.name,
    french: entry.translations.fr?.name,
  };
  const seen = new Map<number, QueriedHit>();
  let best: RankedHit<QueriedHit> | undefined;

  for (const { q, lang } of queriesFor(entry)) {
    for (const hit of await searchPhotos(q, lang, apiKey)) {
      if (!seen.has(hit.id)) seen.set(hit.id, { ...hit, query: q });
    }
    best = rankImageHits([...seen.values()], names)[0];
    if (best && isAutoPickable(best)) break;
  }

  const ranked = rankImageHits([...seen.values()], names);
  entry.imageCandidates = ranked.slice(0, CANDIDATES_KEPT).map(
    (hit): ImageCandidate => ({
      pixabayId: hit.id,
      pageUrl: hit.pageURL,
      previewUrl: hit.previewURL,
      user: hit.user,
      tags: hit.tags,
      score: hit.score,
      query: hit.query,
    }),
  );
  entry.image = null;
  entry.imageSearchedAt = new Date().toISOString();
  entry.publishedAt = null;

  if (best && isAutoPickable(best)) {
    entry.image = await downloadPhoto(best.id, entry.slug, apiKey, "auto");
  }
}

for (const entry of targets) {
  try {
    await searchEntry(entry);
    const outcome = entry.image
      ? `photo ${entry.image.pixabayId} par ${entry.image.user}`
      : `${entry.imageCandidates.length} candidate(s) à revoir`;
    console.log(`  ${entry.slug} : ${outcome}`);
  } catch (error) {
    console.error(`  ${entry.slug} : erreur, reprise au prochain lancement — ${(error as Error).message}`);
  }
  saveWorkFile(work);
}

saveWorkFile(work);
printCounts(entriesInSeedOrder(work, seed));
