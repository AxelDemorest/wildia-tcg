/**
 * Copies the card catalogue from prod into the local Supabase: `cards`, `card_translations`
 * and the `card-art` images. Prod is only read, with its anon key (.env.prod); writes go to
 * the URL in .env.local, which must be a local Supabase. Run after `npm run db:reset`.
 */
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "card-art";

function readEnv(file: string): Record<string, string | undefined> {
  if (!existsSync(file)) {
    console.error(`Fichier introuvable : ${file}`);
    process.exit(1);
  }
  return parseEnv(readFileSync(file, "utf8"));
}

const prodEnv = readEnv(".env.prod");
const localEnv = readEnv(".env.local");

const prodUrl = prodEnv.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const localUrl = localEnv.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
if (!localUrl || !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(localUrl)) {
  console.error(`.env.local ne pointe pas sur un Supabase local (${localUrl}). Rien n'est écrit.`);
  process.exit(1);
}
if (!prodUrl || !prodEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || !localEnv.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Variables manquantes : URL + clé anon dans .env.prod, clé service role dans .env.local.",
  );
  process.exit(1);
}

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const prod = createClient(prodUrl, prodEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
const local = createClient(localUrl, localEnv.SUPABASE_SERVICE_ROLE_KEY, options);

const { data: cards, error } = await prod
  .from("cards")
  .select("*, card_translations ( locale, name, description )");
if (error) throw new Error(`lecture prod : ${error.message}`);
console.log(`${cards.length} carte(s) en prod.`);

let failures = 0;
for (const { card_translations: translations, ...card } of cards) {
  try {
    if (card.image_path) {
      const res = await fetch(`${prodUrl}/storage/v1/object/public/${BUCKET}/${card.image_path}`);
      if (!res.ok) throw new Error(`image ${res.status}`);
      const upload = await local.storage
        .from(BUCKET)
        .upload(card.image_path, await res.arrayBuffer(), {
          contentType: res.headers.get("content-type") ?? "image/webp",
          upsert: true,
        });
      if (upload.error) throw new Error(`upload : ${upload.error.message}`);
    }

    const saved = await local.from("cards").upsert(card, { onConflict: "id" });
    if (saved.error) throw new Error(`cards : ${saved.error.message}`);

    const rows = translations.map((t: { locale: string; name: string; description: string }) => ({
      card_id: card.id,
      ...t,
    }));
    const translated = await local
      .from("card_translations")
      .upsert(rows, { onConflict: "card_id,locale" });
    if (translated.error) throw new Error(`card_translations : ${translated.error.message}`);

    console.log(`  ${card.slug} : copiée`);
  } catch (e) {
    failures++;
    console.error(`  ${card.slug} : échec — ${(e as Error).message}`);
  }
}

if (failures > 0) process.exit(1);
