"use client";

import { useState } from "react";
import { youtubeEmbed, youtubeWatchUrl } from "@/lib/media/youtube";

type Video = { url: string; caption: string };
export function YouTubePicker({ headline, disabled = false, existingUrls, onAdd }: {
  headline: string; disabled?: boolean; existingUrls: string[]; onAdd: (video: Video) => void;
}) {
  const [query, setQuery] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [message, setMessage] = useState("");
  const search = query ?? headline;
  const canonical = youtubeWatchUrl(url);
  const embed = youtubeEmbed(url);
  const duplicate = Boolean(canonical && existingUrls.some(value => youtubeWatchUrl(value) === canonical));
  return <section aria-label="Find a YouTube video" className="grid min-w-0 gap-3 border border-stone-300 bg-stone-50 p-4">
    <h4 className="font-serif text-xl font-bold">Find a YouTube video</h4>
    <p className="text-sm leading-6 text-stone-600">Search YouTube using the headline or your own keywords. Watch the video, check its source, then paste its link here to preview and add it to this story.</p>
    <label className="grid gap-1 text-sm font-semibold">Video search<input maxLength={300} value={search} onChange={event => setQuery(event.target.value)} className="min-w-0 border border-stone-300 bg-white px-3 py-2 font-normal" /></label>
    {search.trim() && <a href={`https://www.youtube.com/results?${new URLSearchParams({ search_query: search.trim().slice(0,300) })}`} target="_blank" rel="noopener noreferrer" className="w-fit text-sm font-bold underline">Search YouTube ↗</a>}
    <label className="grid gap-1 text-sm font-semibold">YouTube video URL<input type="text" inputMode="url" value={url} onChange={event => { setUrl(event.target.value); setMessage(""); }} placeholder="https://www.youtube.com/watch?v=…" className="min-w-0 border border-stone-300 bg-white px-3 py-2 font-normal" /></label>
    {url.trim() && !canonical && <p role="status" className="text-sm text-red-900">Paste a YouTube watch, share, Shorts, live, or embed link for one video.</p>}
    {embed && <iframe key={embed} src={embed} title="Selected YouTube video preview" loading="lazy" allow="fullscreen; picture-in-picture" allowFullScreen className="aspect-video w-full border-0" />}
    <label className="grid gap-1 text-sm font-semibold">Video caption<input maxLength={500} value={caption} onChange={event => setCaption(event.target.value)} placeholder="Video title and publisher" className="min-w-0 border border-stone-300 bg-white px-3 py-2 font-normal" /></label>
    <button type="button" disabled={!canonical || duplicate || disabled} onClick={() => {
      if (!canonical || duplicate || disabled) return;
      onAdd({ url: canonical, caption: caption.trim() || "Related video" });
      setUrl(""); setCaption(""); setMessage("Video added below. Save the story to keep it.");
    }} className="w-fit border border-stone-950 bg-stone-950 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">Add video to story</button>
    {duplicate && <p role="status" className="text-sm text-stone-600">This video is already in the story.</p>}
    {disabled && <p className="text-sm text-stone-600">Remove a content block before adding another.</p>}
    {message && <p role="status" className="text-sm text-green-900">{message}</p>}
  </section>;
}
