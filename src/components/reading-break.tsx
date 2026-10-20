"use client";
import { useEffect, useState } from "react";
import { READING_FALLBACKS, type ReadingItem, type ReadingKind } from "@/lib/edition/reading";
const labels: Record<ReadingKind,string>={quotes:"Quote",jokes:"Joke",poems:"Poem"};
export function ReadingBreak() {
  const [items,setItems]=useState<ReadingItem[]>(READING_FALLBACKS);
  const [kind,setKind]=useState<ReadingKind>("quotes");
  const [expanded,setExpanded]=useState(false);
  const [fallback,setFallback]=useState(true);
  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/beyond",{signal:controller.signal}).then(async response=>{if(!response.ok)throw Error();return response.json();}).then(data=>{if(Array.isArray(data.items)&&data.items.length===3){setItems(data.items);setFallback(Boolean(data.fallback));}}).catch(()=>{});
    return ()=>controller.abort();
  },[]);
  const item=items.find(entry=>entry.category===kind) ?? READING_FALLBACKS[0];
  return <section aria-label="The reading break" className="min-w-0 border border-stone-300 bg-white p-5 sm:p-6">
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-900">A little beyond the headlines</p>
    <h2 className="mt-2 font-serif text-3xl font-bold">The reading break</h2>
    <div role="group" aria-label="Choose a reading" className="mt-4 flex flex-wrap gap-2">{(["quotes","jokes","poems"] as const).map(value=><button key={value} type="button" aria-pressed={kind===value} onClick={()=>{setKind(value);setExpanded(false);}} className={`min-h-11 border px-4 py-2 text-sm font-bold ${kind===value ? "border-stone-950 bg-stone-950 text-white" : "border-stone-300 hover:border-red-900"}`}>{labels[value]}</button>)}</div>
    <blockquote className={`mt-5 whitespace-pre-line break-words font-serif text-xl leading-8 ${expanded ? "" : "line-clamp-6"}`}>{item.text}</blockquote>
    {(item.text.length>160 || item.text.split("\n").length>6) && <button type="button" onClick={()=>setExpanded(!expanded)} aria-expanded={expanded} className="mt-2 min-h-11 text-sm font-bold underline">{expanded ? "Show less" : "Read more"}</button>}
    <p className="mt-4 text-sm font-semibold">{item.author || "Anonymous"}</p>
    <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-stone-600 underline">{item.source} ↗</a>
    <p className="mt-3 text-xs leading-5 text-stone-500">{fallback ? "From our shelf, with live selections when available." : "Live selections through textr, as heard and seen on etherLAND SCREENS."}</p>
  </section>;
}
