import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { CurationSource } from "./sources";

export type FeedStory = {
  source_id: string;
  source_name: string;
  source_url: string;
  headline: string;
  source_preview: string;
  source_published_at: string;
  category_slug: string;
};

const MAX_BYTES = 1_000_000;
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const parser = new XMLParser({ ignoreAttributes: false, processEntities: false, parseTagValue: false, trimValues: true });

function text(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_, code) => { const point = code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : Number(code); return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : ""; }).replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
export function canonicalSourceUrl(value: unknown, source: CurationSource): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim().replace(/&amp;/g, "&"));
    if (url.protocol !== "https:" || url.username || url.password || url.port || !source.hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (/^(utm_|at_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
    return url.toString().length <= 2048 ? url.toString() : null;
  } catch { return null; }
}
export function parseFeed(xml: string, source: CurationSource, now = Date.now()): FeedStory[] {
  if (Buffer.byteLength(xml) > MAX_BYTES || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("Unsupported feed format.");
  if (XMLValidator.validate(xml) !== true) throw new Error("Invalid feed XML.");
  const parsed = parser.parse(xml);
  if (!parsed?.rss?.channel) throw new Error("Expected an RSS news feed.");
  const raw = parsed.rss.channel.item;
  const items: Record<string, unknown>[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const seen = new Set<string>();
  return items.flatMap((item) => {
    const headline = text(item.title).slice(0, 300);
    const source_url = canonicalSourceUrl(item.link, source);
    const timestamp = Date.parse(typeof item.pubDate === "string" ? item.pubDate : "");
    if (!source_url || headline.length < 3 || !Number.isFinite(timestamp) || timestamp > now + 300_000 || now - timestamp > MAX_AGE_MS || seen.has(source_url)) return [];
    seen.add(source_url);
    return [{ source_id: source.id, source_name: source.name, source_url, headline, source_preview: text(item.description).slice(0, 1000), source_published_at: new Date(timestamp).toISOString(), category_slug: source.category }];
  }).sort((a, b) => b.source_published_at.localeCompare(a.source_published_at)).slice(0, 8);
}
export async function fetchSource(source: CurationSource): Promise<FeedStory[]> {
  const response = await fetch(source.url, { redirect: "error", signal: AbortSignal.timeout(10_000), headers: { "User-Agent": "BriefAndBeyond/1.0 (editorial RSS curation)", Accept: "application/rss+xml, application/xml, text/xml" }, next: { revalidate: 900 } });
  if (!response.ok || !response.body) throw new Error("Source unavailable.");
  const declaredSize = Number(response.headers.get("content-length"));
  if (declaredSize > MAX_BYTES) throw new Error("Feed too large.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) { await reader.cancel(); throw new Error("Feed too large."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return parseFeed(Buffer.concat(chunks).toString("utf8"), source);
}
export async function collectSuggestions() {
  const { CURATION_SOURCES } = await import("./sources.ts");
  const results = await Promise.allSettled(CURATION_SOURCES.map(fetchSource));
  const stories: FeedStory[] = []; const unavailable: string[] = []; const seen = new Set<string>();
  results.forEach((result, index) => {
    const source = CURATION_SOURCES[index];
    if (result.status === "rejected") { unavailable.push(`${source.name} (${source.category})`); return; }
    for (const story of result.value) if (!seen.has(story.source_url)) { stories.push(story); seen.add(story.source_url); }
  });
  return { stories, unavailable };
}
