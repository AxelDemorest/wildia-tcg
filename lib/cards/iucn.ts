import { IUCN_STATUSES, type CardRarity, type IucnStatus } from "@/lib/cards/types";

/** Wikidata items allowed as values of P141 (IUCN conservation status). */
export const IUCN_STATUS_BY_WIKIDATA_ID: Readonly<Record<string, IucnStatus>> = {
  Q211005: "LC",
  Q719675: "NT",
  Q278113: "VU",
  Q96377276: "EN",
  // Legacy "endangered species" item, replaced on Wikidata by Q96377276.
  Q11394: "EN",
  Q219127: "CR",
  Q239509: "EW",
  Q237350: "EX",
  Q3245245: "DD",
  Q3350324: "NE",
};

const RARITY_BY_IUCN_STATUS: Readonly<Record<IucnStatus, CardRarity | null>> = {
  LC: "common",
  NT: "uncommon",
  VU: "rare",
  EN: "epic",
  CR: "legendary",
  EW: "mythic",
  EX: null,
  DD: null,
  NE: null,
};

export function isIucnStatus(value: unknown): value is IucnStatus {
  return typeof value === "string" && (IUCN_STATUSES as readonly string[]).includes(value);
}

export function iucnStatusFromWikidataId(qid: string): IucnStatus | null {
  return IUCN_STATUS_BY_WIKIDATA_ID[qid] ?? null;
}

/** Rarity for a playable status; extinct and unassessed species have none. */
export function rarityFromIucnStatus(status: IucnStatus): CardRarity | null {
  return RARITY_BY_IUCN_STATUS[status];
}

/** Colours follow the IUCN Red List scale, from green (LC) to black (EX). */
export function iucnAccentClass(status: IucnStatus): string {
  switch (status) {
    case "LC":
      return "border-emerald-300 bg-emerald-50 text-emerald-800";
    case "NT":
      return "border-lime-300 bg-lime-50 text-lime-800";
    case "VU":
      return "border-yellow-300 bg-yellow-50 text-yellow-800";
    case "EN":
      return "border-orange-300 bg-orange-50 text-orange-800";
    case "CR":
      return "border-red-300 bg-red-50 text-red-800";
    case "EW":
      return "border-purple-300 bg-purple-50 text-purple-900";
    case "EX":
      return "border-zinc-800 bg-zinc-900 text-white";
    case "DD":
    case "NE":
      return "border-zinc-300 bg-zinc-50 text-zinc-600";
  }
}

/** Solid fill for the IUCN seal printed on cards (same scale as `iucnAccentClass`). */
export function iucnSolidClass(status: IucnStatus): string {
  switch (status) {
    case "LC":
      return "bg-emerald-600";
    case "NT":
      return "bg-lime-600";
    case "VU":
      return "bg-yellow-600";
    case "EN":
      return "bg-orange-600";
    case "CR":
      return "bg-red-600";
    case "EW":
      return "bg-purple-700";
    case "EX":
      return "bg-zinc-900";
    case "DD":
    case "NE":
      return "bg-zinc-500";
  }
}

export type IucnStatement = {
  statusQid: string;
  rank: "preferred" | "normal";
  /** ISO date of the assessment (P585 qualifier), when present. */
  pointInTime: string | null;
};

/**
 * P141 should hold a single best value. Prefers the preferred-rank statement,
 * then the most recent assessment.
 */
export function pickIucnStatement(statements: readonly IucnStatement[]): IucnStatement | null {
  if (statements.length === 0) return null;
  const preferred = statements.filter((s) => s.rank === "preferred");
  const pool = preferred.length > 0 ? preferred : statements;
  return [...pool].sort((a, b) => (b.pointInTime ?? "").localeCompare(a.pointInTime ?? ""))[0];
}
