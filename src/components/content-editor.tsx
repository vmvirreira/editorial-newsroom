"use client";

import { WikipediaPicker } from "./wikipedia-picker";
import { useState } from "react";
import type { ContentBlock } from "@/lib/types";

const inputClass = "w-full border border-stone-300 px-3 py-2 font-normal";
export function ContentEditor({ initialBlocks = [], headline = "" }: { initialBlocks?: ContentBlock[]; headline?: string }) {
  const [blocks, setBlocks] = useState<ContentBlock[]>(initialBlocks);
  const replace = (index: number, block: ContentBlock) => setBlocks((current) => current.map((b, i) => i === index ? block : b));
  const move = (index: number, delta: number) => setBlocks((current) => {
    const next = [...current];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    return next;
  });
  return <section className="grid gap-3 border-t border-stone-200 pt-4">
    <input type="hidden" name="content_blocks" value={JSON.stringify(blocks)} />
    <h3 className="font-serif text-2xl font-bold">Additional content</h3>
    <p className="text-sm text-stone-600">Combine text, audio, video, and source links. Use direct media URLs for players, or a YouTube URL for video. Blocks appear below the main text in this order.</p>
    <WikipediaPicker headline={headline} value={blocks.filter(block=>block.type === "explainer").map(block=>({ title:block.caption, url:block.url }))} onChange={topics=>setBlocks(current=>[...current.filter(block=>block.type!=="explainer"), ...topics.map(topic=>({type:"explainer" as const,url:topic.url,caption:topic.title}))])} />
    {blocks.map((block, index) => <fieldset key={index} className="grid gap-3 border border-stone-300 p-4">
      <legend className="px-2 text-sm font-bold">{index + 1}. {block.type}</legend>
      {block.type === "text" ? <label>Text<textarea required className={inputClass} rows={4} value={block.text} onChange={(e) => replace(index, { ...block, text: e.target.value })} /></label> : <>
        <label>{(block.type === "link" || block.type === "explainer") ? "Link" : "Media"} URL<input required type="url" className={inputClass} value={block.url} onChange={(e) => replace(index, { ...block, url: e.target.value })} /></label>
        <label>{(block.type === "link" || block.type === "explainer") ? "Link label" : "Caption / transcript link description"}<input className={inputClass} value={block.caption} onChange={(e) => replace(index, { ...block, caption: e.target.value })} /></label>
      </>}
      <div className="flex flex-wrap gap-3 text-sm">
        <button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move block ${index + 1} up`} className="disabled:opacity-30">Move up</button>
        <button type="button" disabled={index === blocks.length - 1} onClick={() => move(index, 1)} aria-label={`Move block ${index + 1} down`} className="disabled:opacity-30">Move down</button>
        <button type="button" onClick={() => setBlocks((current) => current.filter((_, i) => i !== index))} className="text-red-900">Remove block</button>
      </div>
    </fieldset>)}
    <div className="flex flex-wrap gap-2">
      {(["text", "audio", "video", "link", "explainer"] as const).map((type) => <button key={type} type="button" disabled={blocks.length >= 100} className="border border-stone-400 px-3 py-2 text-sm capitalize" onClick={() => setBlocks((current) => [...current, type === "text" ? { type, text: "" } : { type, url: "", caption: "" }])}>+ {type}</button>)}
    </div>
  </section>;
}
