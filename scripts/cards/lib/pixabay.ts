import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { SelectedImage } from "@/lib/cards/import/work-entry";
import { HttpError, fetchJson, fetchWithRetry, sleep } from "./http";
import { CACHE_DIR, IMAGES_DIR } from "./store";

const API_URL = "https://pixabay.com/api/";
/** Pixabay requires API responses to be cached for 24 hours. */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
/** Default quota is 100 requests per 60 seconds per key. */
const MIN_INTERVAL_MS = 700;

export type PixabayHit = {
  id: number;
  pageURL: string;
  previewURL: string;
  largeImageURL: string;
  tags: string;
  user: string;
  likes: number;
  imageWidth: number;
  imageHeight: number;
};

type SearchResponse = { totalHits: number; hits: PixabayHit[] };

let lastCallAt = 0;

async function callApi(params: Record<string, string>, apiKey: string): Promise<SearchResponse> {
  const cacheKey = createHash("sha1").update(JSON.stringify(params)).digest("hex");
  const cacheFile = path.join(CACHE_DIR, "pixabay", `${cacheKey}.json`);
  if (existsSync(cacheFile) && Date.now() - statSync(cacheFile).mtimeMs < CACHE_TTL_MS) {
    return JSON.parse(readFileSync(cacheFile, "utf8")) as SearchResponse;
  }

  const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCallAt = Date.now();

  const url = `${API_URL}?${new URLSearchParams({ ...params, key: apiKey })}`;
  try {
    const data = await fetchJson<SearchResponse>(url);
    mkdirSync(path.dirname(cacheFile), { recursive: true });
    writeFileSync(cacheFile, JSON.stringify(data));
    return data;
  } catch (error) {
    if (error instanceof HttpError) {
      throw new Error(`Pixabay HTTP ${error.status} pour ${JSON.stringify(params)}`);
    }
    throw error;
  }
}

export async function searchPhotos(
  query: string,
  lang: "en" | "fr",
  apiKey: string,
): Promise<PixabayHit[]> {
  const data = await callApi(
    {
      q: query.slice(0, 100),
      lang,
      image_type: "photo",
      category: "animals",
      safesearch: "true",
      min_width: "1280",
      order: "popular",
      per_page: "20",
    },
    apiKey,
  );
  return data.hits;
}

export async function getPhoto(id: number, apiKey: string): Promise<PixabayHit | null> {
  const data = await callApi({ id: String(id) }, apiKey);
  return data.hits[0] ?? null;
}

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Downloads one chosen photo. Resolves the id again so the file URL is fresh,
 * since URLs returned by search are not meant to be stored.
 */
export async function downloadPhoto(
  id: number,
  slug: string,
  apiKey: string,
  source: SelectedImage["source"],
): Promise<SelectedImage> {
  const hit = await getPhoto(id, apiKey);
  if (!hit) throw new Error(`Image Pixabay ${id} introuvable`);

  const res = await fetchWithRetry(hit.largeImageURL);
  if (!res.ok) throw new Error(`Téléchargement Pixabay ${id} : HTTP ${res.status}`);
  const contentType = res.headers.get("content-type")?.split(";")[0].trim() ?? "";
  const extension = EXTENSION_BY_TYPE[contentType];
  if (!extension) throw new Error(`Type d’image non pris en charge : ${contentType || "inconnu"}`);

  mkdirSync(IMAGES_DIR, { recursive: true });
  const localPath = path.join(IMAGES_DIR, `${slug}.${extension}`);
  writeFileSync(localPath, Buffer.from(await res.arrayBuffer()));

  return {
    pixabayId: hit.id,
    pageUrl: hit.pageURL,
    user: hit.user,
    tags: hit.tags,
    source,
    localPath,
    contentType,
  };
}
