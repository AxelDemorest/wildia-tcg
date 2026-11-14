import { cleanDisplayTitle, truncateExtract } from "@/lib/cards/import/text";
import type { CardLocale, TranslationDraft } from "@/lib/cards/import/work-entry";
import { fetchWithRetry } from "./http";

type SummaryResponse = {
  type: string;
  title: string;
  titles?: { display?: string };
  extract?: string;
  wikibase_item?: string;
};

export type SummaryResult = { translation: TranslationDraft | null; flags: string[] };

/** Reads the lead summary of the article linked from the Wikidata item. */
export async function fetchSummary(
  locale: CardLocale,
  title: string,
  expectedQid: string,
  userAgent: string,
): Promise<SummaryResult> {
  const url = `https://${locale}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
    title.replace(/ /g, "_"),
  )}`;
  const res = await fetchWithRetry(url, {
    headers: { Accept: "application/json", "User-Agent": userAgent },
  });
  if (res.status === 404) return { translation: null, flags: [`wiki_missing_${locale}`] };
  if (!res.ok) throw new Error(`Wikipedia ${locale} « ${title} » : HTTP ${res.status}`);

  const summary = (await res.json()) as SummaryResponse;
  if (summary.type !== "standard") return { translation: null, flags: [`wiki_not_standard_${locale}`] };
  if (summary.wikibase_item !== expectedQid) {
    return { translation: null, flags: [`wiki_qid_mismatch_${locale}`] };
  }
  const extract = summary.extract?.trim() ?? "";
  if (!extract) return { translation: null, flags: [`wiki_empty_extract_${locale}`] };

  return {
    translation: {
      wikipediaTitle: summary.title,
      name: cleanDisplayTitle(summary.titles?.display ?? summary.title),
      extract,
      description: truncateExtract(extract),
    },
    flags: [],
  };
}
