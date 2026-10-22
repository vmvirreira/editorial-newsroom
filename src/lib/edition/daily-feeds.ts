import { decodeHTML } from "entities";
import { safeReadingItems, type ReadingItem } from "./reading.ts";
import { DAILY_KINDS, DAILY_LABELS, WIKIPEDIA_LICENSE, dailyItemSchema, dayNumber, fallbackPools, type DailyItem, type DailyPools } from "./daily-model.ts";

export function suitableReading(item: ReadingItem): boolean {
  const max = item.category === "poems" ? 1000 : 500;
  if (item.text.length > max) return false;
  // PoetryDB also contains later work; default to established public-domain authors.
  return item.category !== "poems" || /\b(?:Shakespeare|Dickinson|Blake|Keats|Shelley|Wordsworth|Browning|Whitman|Poe|Byron|Coleridge|Tennyson|Burns|Southey|Longfellow|Rossetti|Hardy|Yeats|Clare|Housman|Milton|Donne|Herbert|Herrick|Marvell|Emerson|Thoreau)\b/i.test(item.author);
}
const AGENT = "BriefAndBeyond/1.0 (https://briefandbeyond.today; daily educational selections)";
const PLACES = ["Angkor_Wat", "Machu_Picchu", "Petra", "Great_Barrier_Reef", "Serengeti", "Kyoto", "Iguazu_Falls", "Alhambra", "Galápagos_Islands", "Cappadocia", "Timbuktu", "Yellowstone_National_Park"];
const TOPICS = ["Inflation", "Ranked_voting", "Biodiversity", "Semiconductor", "Carbon_cycle", "Plate_tectonics", "Encryption", "Central_bank", "Artificial_intelligence", "Peer_review", "Renewable_energy", "Separation_of_powers"];
function plain(value: unknown): string { return typeof value === "string" ? decodeHTML(value).replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim() : ""; }
export function shortSummary(value: unknown, limit = 650): string {
  const text = plain(value); if (text.length <= limit) return text;
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)/g) ?? [];
  let result = ""; for (const sentence of sentences) { if ((result + sentence).length > limit) break; result += sentence; }
  return result.trim() || `${text.slice(0,limit-1).replace(/\s+\S*$/,"")}…`;
}
async function json(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url,{redirect:"error",signal:AbortSignal.timeout(5500),headers:{"User-Agent":AGENT,Accept:"application/json"},next:{revalidate:86400}});
  if (!response.ok || !response.body) throw new Error("Daily source unavailable");
  const reader = response.body.getReader(); const chunks:Uint8Array[]=[]; let size=0;
  try { while(true) { const {done,value}=await reader.read(); if(done)break; size+=value.byteLength; if(size>1_500_000){await reader.cancel();throw new Error("Daily feed too large");} chunks.push(value); } } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
function valid(item: unknown): DailyItem[] { const parsed=dailyItemSchema.safeParse(item); return parsed.success ? [parsed.data] : []; }
export function cartoonItem(data: Record<string, unknown>): DailyItem[] {
  if (!Number.isInteger(data.num) || Number(data.num)<1) return [];
  return valid({ id:`xkcd-${data.num}`,kind:"cartoon",title:plain(data.safe_title || data.title),text:shortSummary(data.alt,600),credit:"Randall Munroe",source:"xkcd",sourceUrl:`https://xkcd.com/${data.num}/`,imageUrl:data.img,imageAlt:shortSummary(data.transcript || `xkcd: ${data.safe_title}. ${data.alt}`,1400),license:"CC BY-NC 2.5",licenseUrl:"https://creativecommons.org/licenses/by-nc/2.5/" });
}
export function artworkItems(data: Record<string, unknown>): DailyItem[] {
  if (!Array.isArray(data.data)) return [];
  return data.data.flatMap((art) => {
    if (!art || art.share_license_status !== "CC0" || !art.images?.web?.url) return [];
    const artist = Array.isArray(art.creators) ? art.creators.map((creator: {description?:string})=>plain(creator?.description)).filter(Boolean).join("; ") : "";
    return valid({ id:`cleveland-${art.id}`,kind:"art",title:plain(art.title),text:shortSummary(art.wall_description || art.fun_fact || `${art.type || "Artwork"}${art.creation_date ? ` · ${art.creation_date}` : ""}${Array.isArray(art.culture) && art.culture.length ? ` · ${art.culture.join(", ")}` : ""}.`,500),credit:shortSummary(artist || art.tombstone || "Cleveland Museum of Art",380),source:"Cleveland Museum of Art · Open Access",sourceUrl:typeof art.url==="string" ? art.url.replace(/^http:/,"https:") : "",imageUrl:art.images.web.url,imageAlt:shortSummary(`${art.title}${artist ? ` — ${artist}` : ""}`,800),license:"CC0",licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/" });
  });
}
export function wikiItem(data: Record<string, unknown>, kind: "place" | "explainer"): DailyItem[] {
  if (data.type !== "standard" || typeof data.title !== "string" || typeof data.extract !== "string" || data.extract.length < 80) return [];
  const urls=data.content_urls as {desktop?:{page?:string}} | undefined;
  const coordinates=data.coordinates as {lat?:number;lon?:number} | undefined;
  const mapUrl=kind==="place" && Number.isFinite(coordinates?.lat) && Number.isFinite(coordinates?.lon) ? `https://www.openstreetmap.org/?mlat=${coordinates!.lat}&mlon=${coordinates!.lon}#map=10/${coordinates!.lat}/${coordinates!.lon}` : undefined;
  return valid({ id:`wiki-${data.title.replaceAll(" ","_")}`,kind,title:plain(data.title),text:shortSummary(data.extract),credit:"Wikipedia contributors · summary excerpt",source:"Wikipedia",sourceUrl:urls?.desktop?.page,mapUrl,...WIKIPEDIA_LICENSE });
}
export function factItems(data: Record<string, unknown>, date: string): DailyItem[] {
  if (!Array.isArray(data.events)) return [];
  return data.events.filter(event=>/discover|science|space|invent|launch|publish|museum|university|observ|explor|patent|computer|first flight/i.test(event?.text || "") && !/kill|massacre|bomb|war|execution|died|death/i.test(event?.text || "")).flatMap(event=>{
    const page=event.pages?.find((page: {content_urls?:{desktop?:{page?:string}}})=>page.content_urls?.desktop?.page);
    return valid({id:`event-${date}-${event.year}-${page?.pageid || "history"}`,kind:"fact",title:`On this day in ${event.year}`,text:shortSummary(event.text,500),credit:"Wikipedia contributors · On this day",source:"Wikipedia · On this day",sourceUrl:page?.content_urls?.desktop?.page,...WIKIPEDIA_LICENSE});
  }).slice(0,12);
}
export async function getDailyPools(date: string): Promise<DailyPools> {
  const day=dayNumber(date);const pool=fallbackPools();const collected:Partial<DailyPools>={};
  const add=(items:DailyItem[])=>items.forEach(item=>{(collected[item.kind] ??= []).push(item);});
  const reading=async()=>{
    const results=await Promise.allSettled([0,1,2].map(n=>json(`https://etherland-screens.vercel.app/api/quotes?type=all&edition=${date}&selection=${n}`)));
    for (const result of results) if(result.status==="fulfilled") for(const item of safeReadingItems(result.value.quotes)) {
      if(!suitableReading(item))continue;
      add(valid({id:`reading-${item.category}-${item.text.slice(0,160)}`,kind:item.category,title:DAILY_LABELS[item.category],text:item.text,credit:item.author,source:item.source,sourceUrl:item.source_url}));
    }
  };
  const cartoons=async()=>{
    const latest=await json(`https://xkcd.com/info.0.json?edition=${date}`);add(cartoonItem(latest));
    if(!Number.isInteger(latest.num))return;
    const others=await Promise.allSettled([1,2,3].map(n=>json(`https://xkcd.com/${Number(latest.num)-n}/info.0.json`)));
    others.forEach(result=>{if(result.status==="fulfilled")add(cartoonItem(result.value));});
  };
  const art=async()=>add(artworkItems(await json(`https://openaccess-api.clevelandart.org/api/artworks/?cc0=1&has_image=1&limit=12&skip=${(day%100)*12}`)));
  const wiki=async(kind:"place"|"explainer",titles:string[])=>{
    const choices=Array.from({length:4},(_,i)=>titles[(day+i)%titles.length]);
    const results=await Promise.allSettled(choices.map(title=>json(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)));
    results.forEach(result=>{if(result.status==="fulfilled")add(wikiItem(result.value,kind));});
  };
  await Promise.allSettled([reading(),cartoons(),art(),wiki("place",PLACES),wiki("explainer",TOPICS),(async()=>add(factItems(await json(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${date.slice(5,7)}/${date.slice(8,10)}?edition=${date}`),date)))()]);
  for(const kind of DAILY_KINDS){const items=collected[kind];if(items?.length)pool[kind]=[...new Map(items.map(item=>[item.id,item])).values()].slice(0,12);}
  return pool;
}
