export type WikipediaTopic = { title: string; url: string };
const STOP = new Set('a an the this that these those and or but of for from to in on at by with as is are was were be been being has have had how why what when where who new news says said say after before over under into out up down off more most some all its it their our your my can could will would should may might does do did not no than then there here about amid against first last latest live today gets get makes make takes take warns warning reveals reveals find finds found wants want plans plan blasts blast grab piece holds hold eases ease'.split(' '));
const CONCEPTS = ['artificial intelligence','climate change','interest rates','solar system','social media','stock market','human rights','nuclear energy','renewable energy','inflation','election','economy','spaceflight','moon','mars','cancer','vaccines'];
export function headlineTopics(headline: string): string[] {
  const cleaned = headline.replace(/[’']/g, " ").replace(/[^\p{L}\p{N}\s-]/gu, " ");
  const proper = [...cleaned.matchAll(/\b[A-Z][\p{L}\p{N}-]*(?:(?:\s+(?:of|the|and))?\s+[A-Z][\p{L}\p{N}-]*)*/gu)]
    .map(match => match[0].trim()).filter(term => !STOP.has(term.toLowerCase()));
  const concepts = CONCEPTS.filter(term => cleaned.toLowerCase().includes(term)).map(term => term === "moon" && /\bmars\b/i.test(cleaned) ? "Moons of Mars" : term);
  const nouns = cleaned.split(/\s+/).filter(word => word.length > 3 && !STOP.has(word.toLowerCase()));
  const unique = new Map<string,string>();
  for (const candidate of [...proper, ...concepts, ...nouns]) {
    const term = candidate.toLowerCase() === "moon" && /\bmars\b/i.test(cleaned) ? "Moons of Mars" : candidate;
    if (!unique.has(term.toLowerCase())) unique.set(term.toLowerCase(),term);
  }
  return [...unique.values()].slice(0, 6);
}
export function wikipediaUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "en.wikipedia.org" && !url.port && !url.username && !url.password && url.pathname.startsWith("/wiki/") && url.pathname.length > 6 && !url.search && !url.hash ? url.toString() : null; } catch { return null; }
}
// Resolve actual article pages; never synthesize a /wiki/ URL from an ambiguous name.
export async function lookupWikipedia(term: string): Promise<WikipediaTopic | null> {
  const query = new URLSearchParams({ action:"query", format:"json", formatversion:"2", generator:"search", gsrsearch:`intitle:"${term.replaceAll('"','')}"`, gsrnamespace:"0", gsrlimit:"3", prop:"info|pageprops", inprop:"url", ppprop:"disambiguation", redirects:"1" });
  const response = await fetch(`https://en.wikipedia.org/w/api.php?${query}`, { redirect:"error", signal:AbortSignal.timeout(7000), headers:{ "User-Agent":"BriefAndBeyond/1.0 (editor-reviewed background links)" }, next:{revalidate:86400} });
  if (!response.ok) throw new Error("Wikipedia is unavailable.");
  const json = await response.json();
  const pages = Array.isArray(json.query?.pages) ? json.query.pages : [];
  const singular = (value: string) => value.toLowerCase().replace(/\b([a-z]{4,})s$/, "$1");
  const normalized = singular(term);
  for (const page of pages.sort((a: { index?: number }, b: { index?: number }) => (a.index ?? 0) - (b.index ?? 0))) {
    if (typeof page.title !== "string" || page.missing || page.pageprops?.disambiguation !== undefined) continue;
    const title = singular(page.title.replace(/\s+\([^)]*\)$/, ""));
    if (title !== normalized) continue;
    const url = wikipediaUrl(page.fullurl);
    if (url) return { title:page.title, url };
  }
  return null;
}
export async function suggestWikipedia(headline: string) {
  const terms = headlineTopics(headline);
  const results = await Promise.allSettled(terms.map(lookupWikipedia));
  const unique = new Map<string,WikipediaTopic>();
  results.forEach(result => { if (result.status === "fulfilled" && result.value) unique.set(result.value.url,result.value); });
  return { topics:[...unique.values()].slice(0,4), unavailable:results.filter(result=>result.status === "rejected").length > 0 };
}
