import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.join(__dirname, "..");
const config = readFileSync(path.join(root, "supabase", "config.toml"), "utf8");

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

// The variables are read by the Supabase CLI from supabase/.env: .env.example names them, empty.
describe(".env.example", () => {
  const envExample = readFileSync(path.join(root, ".env.example"), "utf8");

  it.each(["google", "discord"])(
    "declares each variable of the %s block as a commented empty line",
    (provider) => {
      const block = section(`auth.external.${provider}`) ?? "";
      const names = [...block.matchAll(/env\(([A-Z0-9_]+)\)/g)].map((match) => match[1]);

      for (const name of names) {
        expect(envExample, `${name} is not declared as "# ${name}="`).toMatch(
          new RegExp(`^#\\s*${name}=\\s*$`, "m"),
        );
      }
    },
  );
});

describe("supabase/.env", () => {
  it("is ignored by git, so the local provider secrets are never committed", () => {
    // Exit code 0 = ignored; 1 makes execFileSync throw. No --no-index: a tracked (force-added)
    // file is then reported as not ignored, which is what "never committed" must catch.
    expect(() =>
      execFileSync("git", ["check-ignore", "-q", "supabase/.env"], { cwd: root }),
    ).not.toThrow();
  });
});

describe("supabase/config.toml secrets", () => {
  // Secret-like keys: `secret`, `*_secret`, `*_key`, `*_token`, `password`, `pass`.
  const secretKey = /^(secret|pass|password|[a-z0-9_]*_(secret|key|token))$/;

  /** Every `key = value` line outside comments, with the table it sits in. */
  function secretEntries(): { table: string; key: string; value: string }[] {
    const entries: { table: string; key: string; value: string }[] = [];
    let table = "";
    for (const line of config.split("\n")) {
      const header = line.match(/^\s*\[([^\]]+)\]\s*(#.*)?$/);
      if (header) {
        table = header[1];
        continue;
      }
      const pair = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (pair && secretKey.test(pair[1])) entries.push({ table, key: pair[1], value: pair[2] });
    }
    return entries;
  }

  it("holds no secret-like value other than an empty string or env(...)", () => {
    const entries = secretEntries();

    // Guard against a parser that sees nothing: the provider blocks and other sections are reached.
    const seen = entries.map((entry) => `${entry.table}.${entry.key}`);
    expect(seen).toEqual(
      expect.arrayContaining([
        "auth.external.apple.secret",
        "auth.sms.twilio.auth_token",
        "studio.openai_api_key",
        "experimental.s3_secret_key",
      ]),
    );

    const literal = entries.filter(
      (entry) => !/^("(env\([A-Z0-9_]+\))?")\s*(#.*)?$/.test(entry.value),
    );
    expect(literal.map((entry) => `${entry.table}.${entry.key}`)).toEqual([]);
  });
});

describe("supabase/config.toml redirect allow-list", () => {
  it("allows exactly the local app on 127.0.0.1 and localhost, any path and query", () => {
    const line = (section("auth") ?? "").match(
      /^\s*additional_redirect_urls\s*=\s*(\[.*\])\s*(#.*)?$/m,
    );

    expect(line, "additional_redirect_urls is missing from [auth]").not.toBeNull();
    expect(JSON.parse(line![1])).toEqual(["http://127.0.0.1:3000/**", "http://localhost:3000/**"]);
  });
});
