"use client";
import { useState, useTransition } from "react";
import { suggestBackgroundLinks } from "@/app/admin/curation/actions";
import type { WikipediaTopic } from "@/lib/curation/wikipedia";

export function WikipediaPicker({ headline, value, onChange }: { headline: string; value: WikipediaTopic[]; onChange: (topics: WikipediaTopic[]) => void }) {
  const [query, setQuery] = useState(headline);
  const [topics, setTopics] = useState<WikipediaTopic[]>([]);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  function search() {
    startTransition(async () => {
      try { const result = await suggestBackgroundLinks(query); setTopics(result.topics); setMessage(result.error || result.message || ""); }
      catch { setMessage("Wikipedia could not be reached. Try again shortly."); }
    });
  }
  return <fieldset className="grid gap-3 border border-stone-300 bg-stone-50 p-4">
    <legend className="px-1 text-sm font-bold">Explore the background</legend>
    <p className="text-xs leading-5 text-stone-600">Suggest Wikipedia pages from the headline’s names and keywords. Check each match and choose up to four. Nothing is selected automatically.</p>
    <label className="grid gap-1 text-sm">Headline or topic<input value={query} maxLength={300} onChange={event=>setQuery(event.target.value)} className="w-full border border-stone-300 bg-white px-3 py-2" /></label>
    <button type="button" disabled={pending || query.trim().length < 3} onClick={search} className="w-fit border border-stone-700 px-3 py-2 text-sm font-bold disabled:opacity-50">{pending ? "Checking Wikipedia…" : "Suggest Wikipedia links"}</button>
    {message && <p role="status" className="text-xs leading-5 text-stone-700">{message}</p>}
    {[...new Map([...value,...topics].map(topic=>[topic.url,topic])).values()].map(topic=>{
      const selected=value.some(item=>item.url===topic.url);
      return <div key={topic.url} className="flex items-start justify-between gap-3 text-sm"><label className="flex items-start gap-2"><input type="checkbox" checked={selected} disabled={!selected && value.length>=4} onChange={()=>onChange(selected ? value.filter(item=>item.url!==topic.url) : [...value,topic])} className="mt-1" />{topic.title}</label><a href={topic.url} target="_blank" rel="noopener noreferrer" className="shrink-0 underline">Check page ↗</a></div>;
    })}
  </fieldset>;
}
