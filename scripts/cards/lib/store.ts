import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { normalizeScientificName, slugFromScientificName } from "@/lib/cards/import/text";
import {
  createWorkEntry,
  evaluateEntry,
  type EntryStatus,
  type WorkEntry,
  type WorkFile,
} from "@/lib/cards/import/work-entry";

export const DATA_DIR = path.join("data", "cards");
export const SEED_PATH = path.join(DATA_DIR, "species.txt");
export const WORK_PATH = path.join(DATA_DIR, "work.json");
export const IMAGES_DIR = path.join(DATA_DIR, "images");
export const CACHE_DIR = path.join(DATA_DIR, ".cache");

export type SeedLine = { slug: string; scientificName: string; pinnedQid: string | null };

/** One species per line: `Lutra lutra`, optionally followed by a Wikidata QID. `#` starts a comment. */
export function readSeed(): SeedLine[] {
  if (!existsSync(SEED_PATH)) {
    console.error(`Fichier graine introuvable : ${SEED_PATH}`);
    process.exit(1);
  }
  const seen = new Map<string, number>();
  const lines: SeedLine[] = [];
  readFileSync(SEED_PATH, "utf8")
    .split("\n")
    .forEach((raw, index) => {
      const line = raw.replace(/#.*/, "").trim();
      if (!line) return;
      const qidMatch = line.match(/\s+(Q\d+)$/);
      const scientificName = normalizeScientificName(qidMatch ? line.slice(0, qidMatch.index) : line);
      const slug = slugFromScientificName(scientificName);
      if (seen.has(slug)) {
        console.warn(`  ligne ${index + 1} ignorée : doublon de la ligne ${seen.get(slug)}`);
        return;
      }
      seen.set(slug, index + 1);
      lines.push({ slug, scientificName, pinnedQid: qidMatch?.[1] ?? null });
    });
  return lines;
}

export function loadWorkFile(): WorkFile {
  if (!existsSync(WORK_PATH)) return { version: 1, entries: {} };
  const work = JSON.parse(readFileSync(WORK_PATH, "utf8")) as WorkFile;
  for (const [slug, entry] of Object.entries(work.entries)) {
    work.entries[slug] = { ...createWorkEntry(slug, entry.scientificName, entry.pinnedQid), ...entry };
  }
  return work;
}

export function saveWorkFile(work: WorkFile): void {
  mkdirSync(DATA_DIR, { recursive: true });
  for (const entry of Object.values(work.entries)) {
    Object.assign(entry, evaluateEntry(entry));
  }
  const tmp = `${WORK_PATH}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(work, null, 2)}\n`);
  renameSync(tmp, WORK_PATH);
}

/** Adds seed lines missing from the work file; a changed QID pin invalidates the fetch. */
export function syncWithSeed(work: WorkFile, seed: readonly SeedLine[]): void {
  for (const line of seed) {
    const existing = work.entries[line.slug];
    if (!existing) {
      work.entries[line.slug] = createWorkEntry(line.slug, line.scientificName, line.pinnedQid);
    } else if (existing.pinnedQid !== line.pinnedQid) {
      existing.pinnedQid = line.pinnedQid;
      existing.fetchedAt = null;
    }
  }
}

export function entriesInSeedOrder(work: WorkFile, seed: readonly SeedLine[]): WorkEntry[] {
  return seed.map((line) => work.entries[line.slug]).filter((e): e is WorkEntry => Boolean(e));
}

export function countByStatus(entries: readonly WorkEntry[]): Record<EntryStatus, number> {
  const counts: Record<EntryStatus, number> = {
    pending: 0,
    ready: 0,
    needs_review: 0,
    rejected: 0,
    published: 0,
  };
  for (const entry of entries) counts[evaluateEntry(entry).status] += 1;
  return counts;
}

export function printCounts(entries: readonly WorkEntry[]): void {
  const c = countByStatus(entries);
  console.log(
    `\nÉtat : ${c.ready} prêtes · ${c.needs_review} à revoir · ${c.rejected} rejetées · ` +
      `${c.published} publiées · ${c.pending} en attente`,
  );
}

/** Minimal `--flag`, `--key value` and `--key a=b` parser; repeated keys accumulate. */
export function parseArgs(argv: readonly string[]): Map<string, string[]> {
  const args = new Map<string, string[]>();
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    const value = next && !next.startsWith("--") ? (i++, next) : "true";
    args.set(key, [...(args.get(key) ?? []), value]);
  }
  return args;
}
