"use client";
import { useState, useTransition } from "react";
import { suggestBackgroundLinks } from "@/app/admin/curation/actions";
import { customWikipediaTopic, type WikipediaTopic } from "@/lib/curation/wikipedia-link";

export function WikipediaPicker({ headline, value, onChange }: { headline: string; value: WikipediaTopic[]; onChange: (topics: WikipediaTopic[]) => void }) {
  const [query, setQuery] = useState(headline);
  const [topics, setTopics] = useState<WikipediaTopic[]>([]);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [customUrl, setCustomUrl] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  function addCustomLink() {
    const topic = customWikipediaTopic(customUrl, customLabel);
    if (!topic) { setCustomMessage("Paste an English Wikipedia article URL, such as https://en.wikipedia.org/wiki/Mars."); return; }
    if (value.some(item => item.url === topic.url)) { setCustomMessage("That Wikipedia link is already selected."); return; }
    if (value.length >= 4) { setCustomMessage("Choose up to four explainers. Deselect one before adding another."); return; }
    onChange([...value, topic]); setCustomUrl(""); setCustomLabel("");
    setCustomMessage("Link selected for Explore the background. Save the story, or prepare the draft, to keep it.");
  }
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
    <div className="grid min-w-0 gap-2 border-t border-stone-300 pt-3">
      <p className="text-sm font-bold">Paste a Wikipedia link</p>
      <label className="grid gap-1 text-sm">Wikipedia article URL<input type="text" inputMode="url" value={customUrl} maxLength={2048} onChange={event=>{setCustomUrl(event.target.value);setCustomMessage("");}} placeholder="https://en.wikipedia.org/wiki/…" className="min-w-0 w-full border border-stone-300 bg-white px-3 py-2" /></label>
      <label className="grid gap-1 text-sm">Link label (optional)<input value={customLabel} maxLength={200} onChange={event=>setCustomLabel(event.target.value)} placeholder="Defaults to the Wikipedia page name" className="min-w-0 w-full border border-stone-300 bg-white px-3 py-2" /></label>
      <button type="button" disabled={!customUrl.trim() || value.length>=4} onClick={addCustomLink} className="w-fit border border-stone-700 px-3 py-2 text-sm font-bold disabled:opacity-50">Add explainer link</button>
      {value.length>=4 && <p className="text-xs text-stone-600">Four links selected. Deselect one to add another.</p>}
      {customMessage && <p role="status" className="text-xs leading-5 text-stone-700">{customMessage}</p>}
    </div>
    {[...new Map([...value,...topics.filter(topic=>!value.some(item=>item.url===topic.url))].map(topic=>[topic.url,topic])).values()].map(topic=>{
      const selected=value.some(item=>item.url===topic.url);
      return <div key={topic.url} className="grid min-w-0 gap-2 text-sm"><div className="flex items-start justify-between gap-3"><label className="flex min-w-0 items-start gap-2 [overflow-wrap:anywhere]"><input type="checkbox" checked={selected} disabled={!selected && value.length>=4} onChange={()=>onChange(selected ? value.filter(item=>item.url!==topic.url) : [...value,topic])} className="mt-1 shrink-0" />{topic.title}</label><a href={topic.url} target="_blank" rel="noopener noreferrer" className="shrink-0 underline">Check page ↗</a></div>{selected && <label className="grid gap-1 text-xs">Explainer label<input value={topic.title} maxLength={200} required onChange={event=>onChange(value.map(item=>item.url===topic.url?{...item,title:event.target.value}:item))} className="min-w-0 w-full border border-stone-300 bg-white px-3 py-2 text-sm" /></label>}</div>;
    })}
  </fieldset>;
}
