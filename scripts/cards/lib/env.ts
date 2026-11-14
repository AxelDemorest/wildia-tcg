import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) loadEnvFile(file);
}

export function requireEnv(name: string, hint: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Variable manquante : ${name}. ${hint}`);
    process.exit(1);
  }
  return value;
}

/** Wikimedia rejects anonymous clients: the User-Agent must carry a contact. */
export function wikimediaUserAgent(): string {
  const contact = requireEnv(
    "CARD_IMPORT_CONTACT",
    "Ajoutez un e-mail ou une URL de contact dans .env.local (exigé par Wikimedia).",
  );
  return `tcg-animaux-card-import/0.1 (${contact})`;
}
