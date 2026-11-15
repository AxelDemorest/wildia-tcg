// Prints the unit test coverage of lib/ as a Markdown table, for $GITHUB_STEP_SUMMARY.
// Reads coverage/coverage-summary.json, written by `npm run test:coverage`.
import { readFileSync } from "node:fs";

const { total } = JSON.parse(readFileSync("coverage/coverage-summary.json", "utf8"));

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
