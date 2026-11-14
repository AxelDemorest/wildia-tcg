/**
 * Step 1 — identity, IUCN status and texts.
 * Wikidata: species item, scientific name (P225), global IUCN status (P141), fr/en articles.
 * Wikipedia: display title (card name) and lead extract (card description).
 */
import { rarityFromIucnStatus } from "@/lib/cards/iucn";
import { applyNameOverrides, CARD_LOCALES, type WorkEntry } from "@/lib/cards/import/work-entry";
import { wikimediaUserAgent } from "./lib/env";
import { sleep } from "./lib/http";
import {
  entriesInSeedOrder,
  loadWorkFile,
  parseArgs,
  printCounts,
  readSeed,
  saveWorkFile,
  syncWithSeed,
} from "./lib/store";
import { fetchSummary } from "./lib/wikipedia";
import { lookupTaxaByName, lookupTaxaByQid, type TaxonLookup } from "./lib/wikidata";

const BATCH_SIZE = 50;
const WIKIPEDIA_INTERVAL_MS = 200;

const args = parseArgs(process.argv.slice(2));
const force = args.has("force");
const only = new Set(args.get("only") ?? []);
const userAgent = wikimediaUserAgent();

const seed = readSeed();
const work = loadWorkFile();
syncWithSeed(work, seed);

const targets = entriesInSeedOrder(work, seed).filter(
  (entry) => (only.size === 0 || only.has(entry.slug)) && (force || !entry.fetchedAt),
);
console.log(`${targets.length} espèce(s) à interroger sur ${seed.length} dans la graine.`);

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

async function lookupBatch(batch: readonly WorkEntry[]): Promise<Map<string, TaxonLookup>> {
  const byName = batch.filter((e) => !e.pinnedQid);
  const byQid = batch.filter((e) => e.pinnedQid);
  const [nameResults, qidResults] = await Promise.all([
    byName.length ? lookupTaxaByName(byName.map((e) => e.scientificName), userAgent) : new Map(),
    byQid.length ? lookupTaxaByQid(byQid.map((e) => e.pinnedQid!), userAgent) : new Map(),
  ]);
  const bySlug = new Map<string, TaxonLookup>();
  for (const e of byName) bySlug.set(e.slug, nameResults.get(e.scientificName)!);
  for (const e of byQid) bySlug.set(e.slug, qidResults.get(e.pinnedQid!)!);
  return bySlug;
}

async function fillEntry(entry: WorkEntry, lookup: TaxonLookup): Promise<void> {
  const flags = [...lookup.flags];
  entry.taxon = lookup.taxon;
  entry.translations = {};
  entry.rarity = null;

  const taxon = lookup.taxon;
  if (taxon?.iucnStatus) {
    entry.rarity = rarityFromIucnStatus(taxon.iucnStatus);
    if (!entry.rarity) flags.push("iucn_not_playable");
  }

  if (taxon) {
    for (const locale of CARD_LOCALES) {
      const title = taxon.sitelinks[locale];
      if (!title) {
        flags.push(`wiki_missing_${locale}`);
        continue;
      }
      await sleep(WIKIPEDIA_INTERVAL_MS);
      const { translation, flags: wikiFlags } = await fetchSummary(locale, title, taxon.qid, userAgent);
      flags.push(...wikiFlags);
      if (translation) entry.translations[locale] = translation;
    }
  }

  applyNameOverrides(entry);
  entry.flags = [...new Set(flags)];
  entry.fetchedAt = new Date().toISOString();
  entry.publishedAt = null;
}

for (const batch of chunk(targets, BATCH_SIZE)) {
  const lookups = await lookupBatch(batch);
  for (const entry of batch) {
    try {
      await fillEntry(entry, lookups.get(entry.slug)!);
      const label = entry.taxon
        ? `${entry.taxon.qid} · UICN ${entry.taxon.iucnStatus ?? "?"} · ${entry.rarity ?? "—"}`
        : "—";
      const flags = entry.flags.length ? ` [${entry.flags.join(", ")}]` : "";
      console.log(`  ${entry.slug} : ${label}${flags}`);
    } catch (error) {
      console.error(`  ${entry.slug} : erreur, reprise au prochain lancement — ${(error as Error).message}`);
    }
    saveWorkFile(work);
  }
}

saveWorkFile(work);
printCounts(entriesInSeedOrder(work, seed));
