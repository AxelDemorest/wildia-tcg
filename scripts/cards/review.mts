/**
 * Step 3 — human review.
 * Without options: lists cards that are not ready, with their flags and image candidates.
 *   --image <slug>=<pixabayId>  downloads that Pixabay photo for the card (any id, not only candidates)
 *   --name <slug>.<fr|en>=<Nom> sets the card name in one language (kept across refetches)
 *   --approve <slug>            accepts a Wikipedia title equal to the scientific name
 *   --all                       also lists ready, rejected and published cards
 */
import {
  applyNameOverrides,
  CARD_LOCALES,
  evaluateEntry,
  type CardLocale,
  type WorkEntry,
} from "@/lib/cards/import/work-entry";
import { requireEnv } from "./lib/env";
import { downloadPhoto } from "./lib/pixabay";
import {
  entriesInSeedOrder,
  loadWorkFile,
  parseArgs,
  printCounts,
  readSeed,
  saveWorkFile,
} from "./lib/store";

const FLAG_HELP: Record<string, string> = {
  taxon_not_found: "aucun taxon Wikidata avec ce nom scientifique — vérifier l’orthographe",
  taxon_not_species: "le taxon trouvé n’est pas de rang espèce",
  taxon_ambiguous: "plusieurs espèces portent ce nom — ajouter le QID voulu dans species.txt",
  iucn_missing: "pas de statut UICN sur Wikidata",
  iucn_unmapped: "statut UICN Wikidata non reconnu (ancienne catégorie ?)",
  iucn_not_playable: "espèce éteinte (EX), données insuffisantes (DD) ou non évaluée (NE)",
  wiki_missing: "pas d’article Wikipédia lié dans cette langue",
  wiki_not_standard: "l’article n’est pas une page standard (homonymie…)",
  wiki_qid_mismatch: "l’article pointe vers un autre élément Wikidata",
  wiki_empty_extract: "l’article n’a pas d’extrait",
  name_is_scientific:
    "le titre Wikipédia est le nom scientifique — donner un nom avec --name ou garder avec --approve",
  image_missing: "aucune photo Pixabay — en choisir une avec --image",
  image_uncertain: "photo incertaine — choisir parmi les candidates avec --image",
  image_not_downloaded: "photo choisie mais non téléchargée — relancer --image",
  image_not_webp: "photo pas encore en WebP — lancer npm run cards:webp",
};

function explain(flag: string): string {
  const key = Object.keys(FLAG_HELP).find((k) => flag === k || flag.startsWith(`${k}_`) || flag.startsWith(`${k}:`));
  return key ? `${flag} — ${FLAG_HELP[key]}` : flag;
}

function printEntry(entry: WorkEntry): void {
  const { status, flags } = evaluateEntry(entry);
  const names = [entry.translations.fr?.name, entry.translations.en?.name].filter(Boolean).join(" / ");
  const iucn = entry.taxon?.iucnStatus ?? "?";
  console.log(`\n[${status}] ${entry.slug} — ${entry.scientificName}${names ? ` (${names})` : ""}`);
  console.log(`  Wikidata ${entry.taxon?.qid ?? "—"} · UICN ${iucn} · rareté ${entry.rarity ?? "—"}`);
  for (const flag of flags) console.log(`  ⚑ ${explain(flag)}`);
  if (entry.image) {
    console.log(`  image : ${entry.image.pixabayId} (${entry.image.source}) ${entry.image.pageUrl}`);
  } else {
    for (const c of entry.imageCandidates) {
      console.log(`  candidate ${c.pixabayId} · score ${c.score} · ${c.tags}\n    ${c.pageUrl}`);
    }
  }
}

const args = parseArgs(process.argv.slice(2));
const seed = readSeed();
const work = loadWorkFile();

for (const slug of args.get("approve") ?? []) {
  const entry = work.entries[slug];
  if (!entry) {
    console.error(`Carte inconnue : ${slug}`);
    continue;
  }
  entry.approved = true;
  entry.publishedAt = null;
  console.log(`Validée : ${slug}`);
}

for (const choice of args.get("name") ?? []) {
  const match = choice.match(/^([a-z0-9-]+)\.([a-z]{2})=(.+)$/);
  const entry = match ? work.entries[match[1]] : undefined;
  const locale = match?.[2] as CardLocale | undefined;
  if (!match || !entry || !locale || !CARD_LOCALES.includes(locale)) {
    console.error(`Format attendu : --name <slug>.<fr|en>=<Nom> (reçu « ${choice} »)`);
    continue;
  }
  entry.nameOverrides[locale] = match[3].trim();
  applyNameOverrides(entry);
  entry.publishedAt = null;
  console.log(`Nom ${locale} de ${entry.slug} : ${match[3].trim()}`);
}

const imageChoices = args.get("image") ?? [];
if (imageChoices.length > 0) {
  const apiKey = requireEnv("PIXABAY_API_KEY", "Clé disponible sur https://pixabay.com/api/docs/.");
  for (const choice of imageChoices) {
    const [slug, id] = choice.split("=");
    const entry = work.entries[slug];
    if (!entry || !/^\d+$/.test(id ?? "")) {
      console.error(`Format attendu : --image <slug>=<pixabayId> (reçu « ${choice} »)`);
      continue;
    }
    try {
      entry.image = await downloadPhoto(Number(id), slug, apiKey, "manual");
      entry.publishedAt = null;
      console.log(`Image ${id} téléchargée pour ${slug}`);
    } catch (error) {
      console.error(`${slug} : ${(error as Error).message}`);
    }
  }
}

saveWorkFile(work);

const entries = entriesInSeedOrder(work, seed);
const listed = args.has("all")
  ? entries
  : entries.filter((e) => evaluateEntry(e).status === "needs_review");
for (const entry of listed) printEntry(entry);
if (!args.has("all")) {
  const rejected = entries.filter((e) => evaluateEntry(e).status === "rejected");
  if (rejected.length > 0) {
    console.log(`\nRejetées (corriger species.txt puis relancer cards:fetch) :`);
    for (const entry of rejected) {
      console.log(`  ${entry.slug} : ${evaluateEntry(entry).flags.map(explain).join(" ; ")}`);
    }
  }
}
printCounts(entries);
