import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const config = readFileSync(path.join(__dirname, "..", "supabase", "config.toml"), "utf8");

/** The lines of one `[table]` of the config, up to the next table header. */
function section(name: string): string | null {
  const lines = config.split("\n");
  const start = lines.findIndex((line) => line.trim() === `[${name}]`);
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^\s*\[/.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

// A provider is switched on through env vars: a secret never sits in the committed file.
describe("supabase/config.toml external providers", () => {
  it.each(["google", "discord"])(
    "enables %s with a client_id and a secret read from the environment",
    (provider) => {
      const block = section(`auth.external.${provider}`);

      expect(block, `[auth.external.${provider}] is missing`).not.toBeNull();
      expect(block).toMatch(/^\s*enabled\s*=\s*true\s*(#.*)?$/m);
      expect(block).toMatch(/^\s*client_id\s*=\s*"env\([A-Z0-9_]+\)"/m);
      expect(block).toMatch(/^\s*secret\s*=\s*"env\([A-Z0-9_]+\)"/m);
    },
  );
});
