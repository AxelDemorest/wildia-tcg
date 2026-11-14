import {
  iucnStatusFromWikidataId,
  pickIucnStatement,
  type IucnStatement,
} from "@/lib/cards/iucn";
import type { TaxonData } from "@/lib/cards/import/work-entry";
import { fetchJson } from "./http";

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const SPECIES_QID = "Q7432";

type Binding = Record<string, { value: string } | undefined>;
type SparqlResponse = { results: { bindings: Binding[] } };

export type TaxonLookup = { taxon: TaxonData; flags: string[] } | { taxon: null; flags: string[] };

function qidOf(uri: string | undefined): string | null {
  return uri ? (uri.split("/").pop() ?? null) : null;
}

function sparqlString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function buildQuery(values: string): string {
  return `
SELECT ?item ?name ?rank ?status ?statusRank ?pointInTime ?iucnId ?frTitle ?enTitle WHERE {
  ${values}
  ?item p:P225 ?nameStatement .
  ?nameStatement ps:P225 ?name ; wikibase:rank ?nameRank .
  FILTER(?nameRank != wikibase:DeprecatedRank)
  OPTIONAL { ?item wdt:P105 ?rank }
  OPTIONAL {
    ?item p:P141 ?statusStatement .
    ?statusStatement ps:P141 ?status ; wikibase:rank ?statusRank .
    FILTER(?statusRank != wikibase:DeprecatedRank)
    OPTIONAL { ?statusStatement pq:P585 ?pointInTime }
  }
  OPTIONAL { ?item wdt:P627 ?iucnId }
  OPTIONAL { ?fr schema:about ?item ; schema:isPartOf <https://fr.wikipedia.org/> ; schema:name ?frTitle }
  OPTIONAL { ?en schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?enTitle }
}`;
}

async function runQuery(query: string, userAgent: string): Promise<Binding[]> {
  const data = await fetchJson<SparqlResponse>(SPARQL_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent,
    },
    body: new URLSearchParams({ query }),
  });
  return data.results.bindings;
}

type ItemRows = { qid: string; rows: Binding[] };

function groupByItem(rows: readonly Binding[]): Map<string, ItemRows> {
  const items = new Map<string, ItemRows>();
  for (const row of rows) {
    const qid = qidOf(row.item?.value);
    if (!qid) continue;
    const group = items.get(qid) ?? { qid, rows: [] };
    group.rows.push(row);
    items.set(qid, group);
  }
  return items;
}

function toTaxon({ qid, rows }: ItemRows): { taxon: TaxonData; flags: string[] } {
  const flags: string[] = [];
  const first = rows[0];

  const statements = new Map<string, IucnStatement>();
  for (const row of rows) {
    const statusQid = qidOf(row.status?.value);
    if (!statusQid) continue;
    const key = `${statusQid}|${row.pointInTime?.value ?? ""}`;
    statements.set(key, {
      statusQid,
      rank: row.statusRank?.value.endsWith("PreferredRank") ? "preferred" : "normal",
      pointInTime: row.pointInTime?.value.slice(0, 10) ?? null,
    });
  }
  const picked = pickIucnStatement([...statements.values()]);
  const iucnStatus = picked ? iucnStatusFromWikidataId(picked.statusQid) : null;

  if (!picked) flags.push("iucn_missing");
  else if (!iucnStatus) flags.push("iucn_unmapped");

  return {
    taxon: {
      qid,
      scientificName: first.name?.value ?? "",
      iucnStatus,
      iucnStatusQid: picked?.statusQid ?? null,
      iucnAssessedAt: picked?.pointInTime ?? null,
      iucnTaxonId: first.iucnId?.value ?? null,
      sitelinks: {
        ...(first.frTitle ? { fr: first.frTitle.value } : {}),
        ...(first.enTitle ? { en: first.enTitle.value } : {}),
      },
    },
    flags,
  };
}

function isSpecies(item: ItemRows): boolean {
  return item.rows.some((row) => qidOf(row.rank?.value) === SPECIES_QID);
}

/** Resolves scientific names to species items. Keys of the result are the input names. */
export async function lookupTaxaByName(
  names: readonly string[],
  userAgent: string,
): Promise<Map<string, TaxonLookup>> {
  const values = `VALUES ?name { ${names.map(sparqlString).join(" ")} }`;
  const rows = await runQuery(buildQuery(values), userAgent);

  const result = new Map<string, TaxonLookup>();
  for (const name of names) {
    const items = [...groupByItem(rows.filter((r) => r.name?.value === name)).values()];
    const species = items.filter(isSpecies);
    if (items.length === 0) {
      result.set(name, { taxon: null, flags: ["taxon_not_found"] });
    } else if (species.length === 0) {
      result.set(name, { taxon: null, flags: ["taxon_not_species"] });
    } else if (species.length > 1) {
      const qids = species.map((s) => s.qid).join(",");
      result.set(name, { taxon: null, flags: [`taxon_ambiguous:${qids}`] });
    } else {
      result.set(name, toTaxon(species[0]));
    }
  }
  return result;
}

/** Loads items pinned in the seed file. Keys of the result are the QIDs. */
export async function lookupTaxaByQid(
  qids: readonly string[],
  userAgent: string,
): Promise<Map<string, TaxonLookup>> {
  const values = `VALUES ?item { ${qids.map((q) => `wd:${q}`).join(" ")} }`;
  const items = groupByItem(await runQuery(buildQuery(values), userAgent));

  const result = new Map<string, TaxonLookup>();
  for (const qid of qids) {
    const item = items.get(qid);
    if (!item) result.set(qid, { taxon: null, flags: ["taxon_not_found"] });
    else if (!isSpecies(item)) result.set(qid, { taxon: null, flags: ["taxon_not_species"] });
    else result.set(qid, toTaxon(item));
  }
  return result;
}
