export type ReadingKind = "quotes" | "jokes" | "poems";
export type ReadingItem = { category: ReadingKind; text: string; author: string; source: string; source_url: string };
export const READING_FALLBACKS: ReadingItem[] = [
  {category:"quotes",text:"Nothing will come of nothing.",author:"William Shakespeare · King Lear",source:"Project Gutenberg · public domain",source_url:"https://www.gutenberg.org/ebooks/1122"},
  {category:"jokes",text:"Why did the headline bring a ladder?\nIt wanted a higher level of understanding.",author:"The Brief and Beyond",source:"An original newsroom joke",source_url:"/"},
  {category:"poems",text:'“Hope” is the thing with feathers —\nThat perches in the soul —\nAnd sings the tune without the words —\nAnd never stops — at all —',author:"Emily Dickinson · excerpt from “Hope”",source:"Wikisource · public domain",source_url:"https://en.wikisource.org/wiki/Poems_(Dickinson,_1891)/Life/VI"},
];
export function safeReadingItems(value: unknown): ReadingItem[] {
  if (!Array.isArray(value)) return [];
  const found = new Map<ReadingKind,ReadingItem>();
  for (const item of value) {
    if (!item || !["quotes","jokes","poems"].includes(item.category) || typeof item.text!=="string" || !item.text.trim() || item.text.length>12000 || typeof item.author!=="string" || item.author.length>300 || typeof item.source!=="string" || item.source.length>300) continue;
    let url: URL; try {url=new URL(item.source_url);} catch {continue;}
    if (!["https:","http:"].includes(url.protocol) || url.username || url.password) continue;
    found.set(item.category,{category:item.category,text:item.text,author:item.author,source:item.source,source_url:url.toString()});
  }
  return [...found.values()];
}
export async function getReadingBreak() {
  try {
    // Reuse the same textr-backed feed already used by etherLAND SCREENS.
    const response = await fetch("https://etherland-screens.vercel.app/api/quotes?type=all", {signal:AbortSignal.timeout(9000),redirect:"error",next:{revalidate:3600}});
    if (!response.ok) throw new Error("Reading feed unavailable");
    const data=await response.json(); const items=safeReadingItems(data.quotes);
    return { items:READING_FALLBACKS.map(fallback=>items.find(item=>item.category===fallback.category) ?? fallback), fallback:items.length<3 };
  } catch {return {items:READING_FALLBACKS,fallback:true};}
}
