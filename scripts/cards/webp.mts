/**
 * Step 4 — optimize card art as WebP before publication.
 * Converts Pixabay downloads (JPEG/PNG) to `data/cards/images/<slug>.webp`, updates work.json,
 * and removes the heavier source file. Required before `cards:publish`.
 *   --force   re-encode even when a WebP already exists
 *   --only    restrict to one slug (repeatable)
 */
import { unlinkSync } from "node:fs";
import path from "node:path";
import {
  cardArtWebpPathForSlug,
  isCardArtWebpPath,
} from "@/lib/cards/import/card-art-webp";
import type { WorkEntry } from "@/lib/cards/import/work-entry";
import { convertImageFileToWebp } from "./lib/webp";
import {
  entriesInSeedOrder,
  IMAGES_DIR,
  loadWorkFile,
  parseArgs,
  printCounts,
  readSeed,
  saveWorkFile,
} from "./lib/store";

const args = parseArgs(process.argv.slice(2));
const force = args.has("force");
const only = new Set(args.get("only") ?? []);

const seed = readSeed();
const work = loadWorkFile();

const targets = entriesInSeedOrder(work, seed).filter((entry) => {
  if (only.size > 0 && !only.has(entry.slug)) return false;
  if (!entry.image?.localPath) return false;
  if (force) return true;
  return !isCardArtWebpPath(entry.image.localPath);
});

console.log(`${targets.length} image(s) à convertir en WebP.`);

function formatKiB(bytes: number): string {
  return `${(bytes / 1024).toFixed(0)} Ko`;
}

async function convertEntry(entry: WorkEntry): Promise<void> {
  const image = entry.image!;
  const sourcePath = image.localPath!;
  const webpPath = path.join(IMAGES_DIR, `${entry.slug}.webp`);

  const { bytesBefore, bytesAfter } = await convertImageFileToWebp(sourcePath, webpPath);

  if (path.resolve(sourcePath) !== path.resolve(webpPath)) {
    try {
      unlinkSync(sourcePath);
    } catch {
      /* source may already be gone */
    }
  }

  image.localPath = cardArtWebpPathForSlug(entry.slug);
  image.contentType = "image/webp";
  entry.publishedAt = null;

  const ratio = bytesBefore > 0 ? ((1 - bytesAfter / bytesBefore) * 100).toFixed(0) : "0";
  console.log(
    `  ${entry.slug} : ${formatKiB(bytesBefore)} → ${formatKiB(bytesAfter)} WebP (−${ratio} %)`,
  );
}

for (const entry of targets) {
  try {
    await convertEntry(entry);
  } catch (error) {
    console.error(`  ${entry.slug} : échec — ${(error as Error).message}`);
  }
  saveWorkFile(work);
}

saveWorkFile(work);
printCounts(entriesInSeedOrder(work, seed));
