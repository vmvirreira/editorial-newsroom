import { z } from "zod";
import { READING_FALLBACKS } from "./reading.ts";

export const DAILY_KINDS = ["quotes", "jokes", "poems", "cartoon", "art", "place", "fact", "explainer"] as const;
export type DailyKind = typeof DAILY_KINDS[number];
export const DAILY_LABELS: Record<DailyKind, string> = { quotes: "Quote of the day", jokes: "Joke of the day", poems: "Poem of the day", cartoon: "Cartoon of the day", art: "Art of the day", place: "Place of the day", fact: "Fact of the day", explainer: "Quick explainer" };
function hostOf(value: string): string { try { return new URL(value).hostname; } catch { return ""; } }
const https = z.string().max(2048).url().refine(value => { try { const u = new URL(value); return u.protocol === "https:" && !u.username && !u.password && !u.port; } catch { return false; } });
const image = https.refine(value => ["imgs.xkcd.com", "openaccess-cdn.clevelandart.org", "images.metmuseum.org"].includes(hostOf(value)));
export const dailyItemSchema = z.object({
  id: z.string().min(1).max(300), kind: z.enum(DAILY_KINDS), title: z.string().min(1).max(300), text: z.string().max(1500),
  credit: z.string().max(400), source: z.string().min(1).max(200), sourceUrl: https,
  imageUrl: image.optional(), imageAlt: z.string().max(1500).optional(), license: z.string().max(100).optional(), licenseUrl: https.optional(), mapUrl: https.refine(value => hostOf(value) === "www.openstreetmap.org").optional(),
  archived: z.boolean().optional(),
}).refine(item => {
  const host = hostOf(item.sourceUrl);
  if (item.kind === "cartoon") return host === "xkcd.com" && (!item.imageUrl || hostOf(item.imageUrl) === "imgs.xkcd.com");
  if (item.kind === "art") return ["clevelandart.org", "www.clevelandart.org", "www.metmuseum.org"].includes(host) && item.license === "CC0" && (!item.imageUrl || ["openaccess-cdn.clevelandart.org", "images.metmuseum.org"].includes(hostOf(item.imageUrl)));
  if (["place", "explainer", "fact"].includes(item.kind)) return host === "en.wikipedia.org" || (item.kind === "fact" && host === "science.nasa.gov");
  return true;
});
export type DailyItem = z.infer<typeof dailyItemSchema>;
export type DailyPools = Record<DailyKind, DailyItem[]>;
export function editionDate(now = new Date()): string { return now.toISOString().slice(0, 10); }
export function dayNumber(date: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T00:00:00Z`).toISOString().slice(0,10) !== date) throw new Error("Invalid edition date");
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
}
export function selectDailyItems(date: string, pools: DailyPools, overrides: unknown[] = []): { item: DailyItem; manual: boolean }[] {
  const day = dayNumber(date);
  return DAILY_KINDS.map((kind, index) => {
    const saved = overrides.map(value => dailyItemSchema.safeParse(value)).find(value => value.success && value.data.kind === kind);
    if (saved?.success) return { item: saved.data, manual: true };
    const candidates = [...new Map((pools[kind] ?? []).flatMap(item => { const parsed = dailyItemSchema.safeParse(item); return parsed.success && parsed.data.kind === kind ? [[parsed.data.id, parsed.data] as const] : []; })).values()].sort((a,b) => a.id.localeCompare(b.id));
    return { item: candidates[(day + index * 7) % (candidates.length || 1)] ?? DAILY_FALLBACKS.find(item => item.kind === kind)!, manual: false };
  });
}
const wikiLicense = { license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" };
export const WIKIPEDIA_LICENSE = wikiLicense;
export const DAILY_FALLBACKS: DailyItem[] = [
  ...READING_FALLBACKS.map(item => ({ id: `shelf-${item.category}`, kind: item.category, title: DAILY_LABELS[item.category], text: item.text, credit: item.author, source: item.source, sourceUrl: item.source_url === "/" ? "https://briefandbeyond.today/" : item.source_url, archived: true })),
  { id: "xkcd-3314", kind: "cartoon", title: "Vulnerability", text: "Other numbers are largely unaffected, but anyone using ‘4’ for their certificate key is urged to upgrade to ‘5’.", credit: "Randall Munroe", source: "xkcd", sourceUrl: "https://xkcd.com/3314/", imageUrl: "https://imgs.xkcd.com/comics/vulnerability.png", imageAlt: "xkcd: Vulnerability — a comic about weak certificate keys", license: "CC BY-NC 2.5", licenseUrl: "https://creativecommons.org/licenses/by-nc/2.5/", archived: true },
  { id: "met-436535", kind: "art", title: "Wheat Field with Cypresses", text: "Vincent van Gogh painted this landscape in 1889. The swirling sky and upright cypresses give the scene its energy.", credit: "Vincent van Gogh · 1889", source: "The Metropolitan Museum of Art · Open Access", sourceUrl: "https://www.metmuseum.org/art/collection/search/436535", imageUrl: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-42549-001.jpg", imageAlt: "Wheat Field with Cypresses by Vincent van Gogh", license: "CC0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/", archived: true },
  { id: "wiki-Angkor_Wat", kind: "place", title: "Angkor Wat, Cambodia", text: "Angkor Wat is a vast temple complex in Cambodia, built in the 12th century. Originally dedicated to Vishnu, it later became a Buddhist place of worship.", credit: "Background: Wikipedia contributors", source: "Wikipedia", sourceUrl: "https://en.wikipedia.org/wiki/Angkor_Wat", mapUrl: "https://www.openstreetmap.org/?mlat=13.4125&mlon=103.867#map=13/13.4125/103.867", archived: true },
  { id: "nasa-venus", kind: "fact", title: "A day longer than a year", text: "Venus takes about 243 Earth days to rotate once, but only about 225 Earth days to orbit the Sun. Its rotation period is longer than its year.", credit: "NASA · Venus facts", source: "NASA Science", sourceUrl: "https://science.nasa.gov/venus/facts/", archived: true },
  { id: "wiki-Inflation", kind: "explainer", title: "What is inflation?", text: "Inflation is a rise in the general level of prices. When prices rise, the same amount of money buys fewer goods and services. It is usually measured using a basket of commonly purchased items.", credit: "Background: Wikipedia contributors", source: "Wikipedia", sourceUrl: "https://en.wikipedia.org/wiki/Inflation", archived: true },
];
export function fallbackPools(): DailyPools { return Object.fromEntries(DAILY_KINDS.map(kind => [kind, DAILY_FALLBACKS.filter(item => item.kind === kind)])) as DailyPools; }
