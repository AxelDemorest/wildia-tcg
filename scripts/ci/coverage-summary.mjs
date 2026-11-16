// Prints the unit test coverage of lib/ as a Markdown table, for $GITHUB_STEP_SUMMARY.
// Reads coverage/coverage-summary.json, written by `npm run test:coverage`.
import { existsSync, readFileSync } from "node:fs";

const SUMMARY_PATH = "coverage/coverage-summary.json";

if (!existsSync(SUMMARY_PATH)) {
  console.log("### Couverture des tests unitaires (`lib/`)\n");
  console.log(
    "_Rapport indisponible : exécutez `npm run test:coverage` avec `@vitest/coverage-v8` installé._",
  );
  process.exit(0);
}

const { total } = JSON.parse(readFileSync(SUMMARY_PATH, "utf8"));

const rows = [
  ["Lignes", total.lines],
  ["Instructions", total.statements],
  ["Fonctions", total.functions],
  ["Branches", total.branches],
];

console.log("### Couverture des tests unitaires (`lib/`)\n");
console.log("| | % | Couvert |");
console.log("|---|---:|---:|");
for (const [label, metric] of rows) {
  console.log(`| ${label} | ${metric.pct} % | ${metric.covered} / ${metric.total} |`);
}
