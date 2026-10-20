"use client";
import { useState } from "react";
import { WikipediaPicker } from "./wikipedia-picker";
import type { WikipediaTopic } from "@/lib/curation/wikipedia";
import type { Suggestion } from "./curation-inbox";

export function CuratedBriefControls({ story, pending, prepare, dismiss }: { story: Suggestion; pending: boolean; prepare: (brief: string, topics: WikipediaTopic[]) => void; dismiss: () => void }) {
  const [brief, setBrief] = useState(story.source_preview || "");
  const [topics, setTopics] = useState<WikipediaTopic[]>([]);
  return <div className="grid gap-4">
    <label className="grid gap-2 text-sm font-semibold">Short summary<textarea value={brief} onChange={event=>setBrief(event.target.value)} maxLength={2000} rows={4} placeholder="Write a short brief in your own words." className="w-full border border-stone-300 px-3 py-2 font-normal" /></label>
    <p className="text-xs leading-5 text-stone-600">The feed summary is a starting point. Review the source, accuracy, wording, and reuse permissions before publishing. Your draft stays private.</p>
    {story.source_preview && <button type="button" onClick={()=>setBrief(story.source_preview)} className="w-fit text-xs underline">Use feed summary</button>}
    <WikipediaPicker headline={story.headline} value={topics} onChange={setTopics} />
    <div className="flex flex-wrap gap-3"><button disabled={pending || brief.trim().length<10} className="border border-stone-950 bg-stone-950 px-3 py-2 text-sm font-bold text-white disabled:opacity-50" onClick={()=>prepare(brief,topics)}>{pending ? "Preparing…" : "Prepare draft"}</button><button disabled={pending} className="border border-stone-950 px-3 py-2 text-sm font-bold disabled:opacity-50" onClick={dismiss}>Dismiss</button></div>
  </div>;
}
