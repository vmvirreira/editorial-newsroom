import { XMLParser, XMLValidator } from "fast-xml-parser";
import { decodeHTML } from "entities";
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
  if (value && typeof value === "object" && "#text" in value) value = value["#text"];
  if (typeof value !== "string") return "";
  return decodeHTML(value).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
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
  const format = parsed?.rss?.channel ? "rss" : parsed?.feed ? "atom" : parsed?.["rdf:RDF"] ? "rdf" : null;
  if (!format) throw new Error("Expected an RSS or Atom news feed.");
  const raw = format === "rss" ? parsed.rss.channel.item : format === "atom" ? parsed.feed.entry : parsed["rdf:RDF"].item;
  const items: Record<string, unknown>[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const seen = new Set<string>();
  return items.flatMap((item) => {
    const headline = text(item.title).slice(0, 300);
    // Publisher metadata prevents unrelated Google News matches from being mislabeled.
    if (source.publisherHost) {
      const publisher = item.source as Record<string, unknown> | undefined;
      if (!canonicalSourceUrl(publisher?.["@_url"], { ...source, hosts: [source.publisherHost] })) return [];
    }
    let link = source.linkField === "comments" ? item.comments : item.link;
    if (format === "atom") {
      const links = Array.isArray(item.link) ? item.link : [item.link];
      link = links.find((entry) => entry && typeof entry === "object" && (!entry["@_rel"] || entry["@_rel"] === "alternate"))?.["@_href"];
    }
    const source_url = canonicalSourceUrl(link, source);
    const timestamp = Date.parse(text(format === "atom" ? item.published ?? item.updated : item.pubDate ?? item["dc:date"]));
    if (!source_url || headline.length < 3 || !Number.isFinite(timestamp) || timestamp > now + 300_000 || now - timestamp > MAX_AGE_MS || seen.has(source_url)) return [];
    seen.add(source_url);
    return [{ source_id: source.id, source_name: source.name, source_url, headline, source_preview: text(format === "atom" ? item.summary ?? item.content : item.description).slice(0, 1000), source_published_at: new Date(timestamp).toISOString(), category_slug: source.category }];
  }).sort((a, b) => b.source_published_at.localeCompare(a.source_published_at)).slice(0, 8);
}
export async function fetchSource(source: CurationSource): Promise<FeedStory[]> {
  const response = await fetch(source.url, { redirect: "error", signal: AbortSignal.timeout(10_000), headers: { "User-Agent": "BriefAndBeyond/1.0 (editorial RSS curation)", Accept: "application/rss+xml, application/atom+xml, application/rdf+xml, application/xml, text/xml" }, next: { revalidate: 900 } });
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
export function mergeFeedStories(batches: FeedStory[][], limit = 96): FeedStory[] {
  const stories: FeedStory[] = []; const seen = new Set<string>();
  // Round-robin gives every source a place before taking more from a single desk.
  for (let position = 0; position < 8 && stories.length < limit; position++) {
    for (const batch of batches) {
      const story = batch[position];
      if (story && !seen.has(story.source_url)) { stories.push(story); seen.add(story.source_url); }
      if (stories.length >= limit) break;
    }
  }
  return stories;
}
export async function collectSuggestions() {
  const { CURATION_SOURCES } = await import("./sources.ts");
  const results = await Promise.allSettled(CURATION_SOURCES.map(fetchSource));
  const batches: FeedStory[][] = []; const unavailable: string[] = [];
  results.forEach((result, index) => {
    const source = CURATION_SOURCES[index];
    if (result.status === "rejected") { unavailable.push(`${source.name} (${source.category})`); return; }
    batches.push(result.value);
  });
  return { stories: mergeFeedStories(batches), unavailable };
}
