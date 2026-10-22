"use client";

import { CuratedBriefControls } from "./curated-brief-controls";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshSuggestions, reviewSuggestion, prepareCuratedDraft } from "@/app/admin/curation/actions";
import type { Category } from "@/lib/types";
import type { CurationSource } from "@/lib/curation/sources";

export type Suggestion = {
  id: string; category_id: string; source_id: string; source_name: string; source_url: string;
  source_preview: string; headline: string; source_published_at: string; discovered_at: string; status: "new" | "drafted" | "dismissed"; article_id: string | null;
};
type ActionResult = { error?: string; message?: string; articleId?: string };
export function CurationInbox({ suggestions, categories, sources, status }: { suggestions: Suggestion[]; categories: Category[]; sources: CurationSource[]; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState("");
  const [feedback, setFeedback] = useState<ActionResult>({});
  function run(key: string, action: () => Promise<ActionResult>) {
    setActive(key); setFeedback({});
    startTransition(async () => {
      try {
        const result = await action(); setFeedback(result);
        if (result.articleId) router.push(`/admin?edit=${encodeURIComponent(result.articleId)}`);
        else if (!result.error) router.refresh();
      } catch { setFeedback({ error: "The request could not be completed. Please try again." }); }
      finally { setActive(""); }
    });
  }
  const buttonClass = "border border-stone-950 px-3 py-2 text-sm font-bold disabled:cursor-wait disabled:opacity-50";
  return <section className="grid gap-5" aria-label="Story suggestions" aria-busy={pending}>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-stone-600">{suggestions.length}{suggestions.length === 200 ? "+" : ""} {status === "new" ? "recent suggestions" : "saved suggestions"} · newest first</p><button disabled={pending} onClick={() => run("refresh", refreshSuggestions)} className={`${buttonClass} bg-stone-950 text-white`}>{pending && active === "refresh" ? "Checking feeds…" : "Refresh sources"}</button></div>
    {feedback.error && <p role="alert" className="border border-red-900 bg-white p-3 text-red-900">{feedback.error}</p>}
    {feedback.message && <p role="status" className="border border-green-800 bg-white p-3 text-green-900">{feedback.message}</p>}
    {!suggestions.length && <div className="border border-dashed border-stone-400 bg-white px-6 py-12 text-center"><h2 className="font-serif text-2xl font-bold">{status === "new" ? "Room for the next story." : "Nothing here yet."}</h2><p className="mt-3 text-stone-600">{status === "new" ? "Refresh sources to discover current stories, or try another category." : "Stories you review will appear here."}</p></div>}
    <div className="grid gap-4 md:grid-cols-2">{suggestions.map((story) => <article key={story.id} className="flex flex-col gap-4 border border-stone-300 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap justify-between gap-2 text-xs font-bold uppercase tracking-wider"><span className="text-red-900">{categories.find((category) => category.id === story.category_id)?.name ?? "News"}</span><time dateTime={story.source_published_at} className="text-stone-500">{new Date(story.source_published_at).toLocaleDateString("en-GB", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })}</time></div>
      <h2 className="font-serif text-2xl font-bold leading-tight"><a href={story.source_url} target="_blank" rel="noopener noreferrer" className="hover:text-red-950">{story.headline}</a></h2>
      <p className="text-sm text-stone-600"><span className="font-bold text-stone-900">{story.source_name}</span> · {sources.find((source) => source.id === story.source_id)?.note ?? "Source feed"}</p>
      {story.source_preview && <blockquote className="border-l-2 border-red-900 pl-3 text-sm leading-6 text-stone-700"><p className="mb-1 text-xs font-bold uppercase tracking-wide">{sources.find((source) => source.id === story.source_id)?.kind === "community" ? "Community feed preview" : "Source feed preview"}</p>{story.source_preview}</blockquote>}
      <a href={story.source_url} target="_blank" rel="noopener noreferrer" className="w-fit text-sm underline underline-offset-4">{sources.find((source) => source.id === story.source_id)?.kind === "community" ? "Open community discussion ↗" : "Read original report ↗"}</a>
      <div className="mt-auto flex flex-wrap gap-3 pt-2">
        {story.article_id ? <Link className={`${buttonClass} bg-stone-950 text-white`} href={`/admin?edit=${story.article_id}`}>Open draft</Link> : story.status === "new" ? <CuratedBriefControls story={story} pending={pending} prepare={(brief, topics) => run(story.id, () => prepareCuratedDraft(story.id, brief, topics))} dismiss={() => run(story.id, () => reviewSuggestion(story.id, "dismissed"))} /> : <button disabled={pending} className={buttonClass} onClick={() => run(story.id, () => reviewSuggestion(story.id, "new"))}>Restore to inbox</button>}
      </div>
    </article>)}</div>
  </section>;
}
