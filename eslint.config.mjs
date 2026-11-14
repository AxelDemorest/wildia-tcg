import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/** @see docs/architecture.md */
const noSupabaseImports = {
  "no-restricted-imports": [
    "error",
    {
      paths: [
        {
          name: "@supabase/supabase-js",
          message:
            "Supabase is an adapter — use server/ use cases or lib/supabase only. See docs/architecture.md.",
        },
        {
          name: "@supabase/ssr",
          message:
            "Supabase SSR belongs in lib/supabase/. See docs/architecture.md.",
        },
      ],
      patterns: [
        {
          group: ["@/lib/supabase", "@/lib/supabase/*"],
          message:
            "Do not import Supabase from UI or domain code — call server/ instead. See docs/architecture.md.",
        },
        {
          group: ["@supabase/*"],
          message: "Use lib/supabase or server/ — see docs/architecture.md.",
        },
      ],
    },
  ],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    rules: noSupabaseImports,
  },
  {
    files: ["lib/**/*.{ts,tsx}"],
    ignores: ["lib/supabase/**"],
    rules: {
      ...noSupabaseImports,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            ...noSupabaseImports["no-restricted-imports"][1].paths,
            {
              name: "@/server",
              message: "lib/ must not depend on server/ — see docs/architecture.md.",
            },
          ],
          patterns: [
            ...noSupabaseImports["no-restricted-imports"][1].patterns,
            {
              group: ["@/server/*"],
              message: "lib/ must not depend on server/ — see docs/architecture.md.",
            },
            {
              group: ["next", "next/*"],
              message: "Keep lib/ free of Next — use lib/supabase for SSR adapters.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["server/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/supabase/client",
              message: "Browser Supabase client must not be used on the server layer.",
            },
            {
              name: "@supabase/supabase-js",
              importNames: ["User"],
              message: "Use SessionUser from @/lib/auth/session-user in server/ and UI.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
