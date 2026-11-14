/**
 * Step 5 — publication.
 * For every ready card: uploads the photo to the `card-art` bucket, then upserts `cards`
 * (by slug) and its fr/en `card_translations`. Stats are only set when the card is created.
 *   --dry-run      prints what would be written
 *   --only <slug>  restricts to one card (repeatable)
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { isCardArtWebpPath } from "@/lib/cards/import/card-art-webp";
import { DEFAULT_CARD_STATS, FARM_RATE_BY_RARITY } from "@/lib/cards/farm-rate";
import { CARD_LOCALES, evaluateEntry, type WorkEntry } from "@/lib/cards/import/work-entry";
import { requireEnv } from "./lib/env";
import {
  entriesInSeedOrder,
  loadWorkFile,
  parseArgs,
  printCounts,
  readSeed,
  saveWorkFile,
} from "./lib/store";

const BUCKET = "card-art";

const args = parseArgs(process.argv.slice(2));
const dryRun = args.has("dry-run");
const only = new Set(args.get("only") ?? []);

const supabase = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "URL du projet Supabase."),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY", "Clé service role, jamais exposée au navigateur."),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const seed = readSeed();
const work = loadWorkFile();
const targets = entriesInSeedOrder(work, seed).filter(
  (e) => (only.size === 0 || only.has(e.slug)) && evaluateEntry(e).status === "ready",
);
console.log(`${targets.length} carte(s) prête(s) à publier${dryRun ? " (simulation)" : ""}.`);

async function publish(entry: WorkEntry): Promise<void> {
  const taxon = entry.taxon!;
  const image = entry.image!;
  const rarity = entry.rarity!;
  if (!isCardArtWebpPath(image.localPath)) {
    throw new Error("image non convertie en WebP — lancer npm run cards:webp");
  }
  const imagePath = `cards/${entry.slug}.webp`;

  const card = {
    slug: entry.slug,
    scientific_name: taxon.scientificName,
    iucn_status: taxon.iucnStatus,
    rarity,
    image_path: imagePath,
    farm_rate_base: FARM_RATE_BY_RARITY[rarity],
  };

  if (dryRun) {
    console.log(`  ${entry.slug} :`, card, CARD_LOCALES.map((l) => entry.translations[l]!.name));
    return;
  }

  const upload = await supabase.storage
    .from(BUCKET)
    .upload(imagePath, readFileSync(image.localPath!), {
      contentType: "image/webp",
      upsert: true,
    });
  if (upload.error) throw new Error(`upload : ${upload.error.message}`);

  const existing = await supabase.from("cards").select("id").eq("slug", entry.slug).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);

  const saved = existing.data
    ? await supabase
        .from("cards")
        .update({ ...card, updated_at: new Date().toISOString() })
        .eq("id", existing.data.id)
        .select("id")
        .single()
    : await supabase
        .from("cards")
        .insert({ ...card, stats: DEFAULT_CARD_STATS })
        .select("id")
        .single();
  if (saved.error) throw new Error(`cards : ${saved.error.message}`);

  const translations = CARD_LOCALES.map((locale) => ({
    card_id: saved.data.id,
    locale,
    name: entry.translations[locale]!.name,
    description: entry.translations[locale]!.description,
    updated_at: new Date().toISOString(),
  }));
  const translated = await supabase
    .from("card_translations")
    .upsert(translations, { onConflict: "card_id,locale" });
  if (translated.error) throw new Error(`card_translations : ${translated.error.message}`);

  entry.publishedAt = new Date().toISOString();
  console.log(`  ${entry.slug} : publiée (${rarity}, UICN ${taxon.iucnStatus})`);
}

for (const entry of targets) {
  try {
    await publish(entry);
  } catch (error) {
    console.error(`  ${entry.slug} : échec — ${(error as Error).message}`);
  }
  if (!dryRun) saveWorkFile(work);
}

printCounts(entriesInSeedOrder(work, seed));
