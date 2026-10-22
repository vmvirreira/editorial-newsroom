"use client";

import Link from "next/link";
import { GripVertical } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteArticle, moveArticle } from "@/app/actions";
import { PublicationTime } from "./publication-time";
import type { Article, ArticleStatus, StaffRole } from "@/lib/types";

const columns: { status: ArticleStatus; label: string }[] = [
  { status: "draft", label: "Drafts" }, { status: "review", label: "For review" }, { status: "published", label: "Published" },
];
type DropTarget = { status: ArticleStatus; beforeId: string | null };
export function NewsroomBoard({ articles, role }: { articles: Article[]; role: StaffRole }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const [target, setTarget] = useState<DropTarget | null>(null);
  const editor = role === "editor";
  const resetDrag = () => { setDragging(null); setTarget(null); };
  const move = (id: string, status: ArticleStatus, beforeId: string | null) => {
    if (!editor || pending || id === beforeId) return;
    startTransition(async () => {
      try {
        const result = await moveArticle(id, status, beforeId);
        setMessage(result.error || "Story moved. Order saved.");
        if (!result.error) router.refresh();
      } catch { setMessage("Unable to move the story. Please try again."); }
    });
  };
  const over = (event: React.DragEvent, status: ArticleStatus, beforeId: string | null) => {
    if (!editor || pending || !dragging) return;
    event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = "move";
    setTarget({ status, beforeId });
  };
  const drop = (event: React.DragEvent, status: ArticleStatus, beforeId: string | null) => {
    event.preventDefault(); event.stopPropagation();
    const id = event.dataTransfer.getData("text/plain");
    resetDrag();
    if (articles.some((article) => article.id === id)) move(id, status, beforeId);
  };
  return <section className="grid gap-4" aria-busy={pending}>
    <h2 className="font-serif text-3xl font-bold">Story board</h2>
    <p className="text-sm leading-6 text-stone-600">{editor ? "Use a story’s grip handle to drag it above another story. The red line marks its new position. Published order controls the main stories, Latest, and category lists. Newly published stories start at the top; saving edits keeps their position. Up/Down buttons work with keyboards and touch screens. Moving to Published publishes immediately, unless a future publication time is set." : "Your stories appear here. Edit a draft to submit it for review; an editor will handle publication."}</p>
    <p role="status" aria-live="polite" className="text-sm text-red-900">{pending ? "Saving story order…" : dragging ? "Drag above a story to place it there, or into another column to change its status." : message}</p>
    <div className="grid items-start gap-4 lg:grid-cols-3">
      {columns.map(({ status, label }) => {
        const stories = articles.filter((article) => article.status === status);
        const endTarget = dragging && target?.status === status && target.beforeId === null;
        return <section key={status} aria-label={`${label} stories`} className={`grid min-h-48 gap-3 border p-4 transition-colors ${endTarget ? "border-red-800 bg-red-50" : "border-stone-300 bg-stone-100"}`} onDragOver={(e) => over(e, status, null)} onDrop={(e) => drop(e, status, null)} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setTarget(null); }}>
          <h3 className="font-serif text-2xl font-bold">{label} <span className="text-sm text-stone-500">({stories.length})</span></h3>
          {stories.map((article, index) => {
            const insertHere = dragging && dragging !== article.id && target?.status === status && target.beforeId === article.id;
            return <article key={article.id} data-story-id={article.id} onDragOver={(e) => over(e, status, article.id)} onDrop={(e) => drop(e, status, article.id)} className={`relative grid gap-3 border bg-white p-4 transition-[opacity,box-shadow] ${dragging === article.id ? "border-stone-300 opacity-40" : insertHere ? "border-red-800 shadow-[inset_0_4px_0_#991b1b]" : "border-stone-300"}`}>
              {insertHere && <span className="text-xs font-bold text-red-900">Place story here</span>}
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-wider text-red-900">{article.category_name}{article.is_featured ? " · Featured" : ""}</p>
                {editor && <button type="button" draggable={!pending} disabled={pending} aria-label={`Drag ${article.title} to reorder`} title="Drag to reorder; or use Up and Down below" className="cursor-grab rounded border border-stone-300 p-2 text-stone-600 hover:border-red-900 hover:text-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900 active:cursor-grabbing disabled:cursor-wait" onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", article.id); e.dataTransfer.effectAllowed = "move";
                  const card = e.currentTarget.closest("article"); if (card) e.dataTransfer.setDragImage(card, 24, 24);
                  setDragging(article.id); setMessage("");
                }} onDragEnd={resetDrag}><GripVertical aria-hidden="true" size={18} /></button>}
              </div>
              <h4 className="font-serif text-xl font-bold">{article.title}</h4>
              <p className="text-sm text-stone-600">By {article.author}</p>
              {status === "published" && <p className="text-xs text-stone-500"><PublicationTime value={article.published_at} label={new Date(article.published_at).getTime() > new Date().getTime() ? "Scheduled for" : "Published"} /></p>}
              <div className="flex flex-wrap gap-3 text-sm">
                {(editor || status !== "published") && <Link href={`/admin?edit=${article.id}`} className="underline">Edit</Link>}
                {status === "published" && new Date(article.published_at) <= new Date() && <Link href={`/article/${article.slug}`} className="underline">Read</Link>}
                {editor && <>
                  <button disabled={pending || index === 0} className="underline disabled:opacity-30" aria-label={`Move ${article.title} up`} onClick={() => move(article.id, status, stories[index - 1].id)}>Up</button>
                  <button disabled={pending || index === stories.length - 1} className="underline disabled:opacity-30" aria-label={`Move ${article.title} down`} onClick={() => move(article.id, status, stories[index + 2]?.id ?? null)}>Down</button>
                  <button disabled={pending} className="text-red-900 underline" onClick={() => {
                    if (!window.confirm(`Delete “${article.title}”? This cannot be undone.`)) return;
                    startTransition(async () => { const result = await deleteArticle(article.id); setMessage(result.error || "Story deleted."); if (!result.error) router.refresh(); });
                  }}>Delete</button>
                </>}
              </div>
              {editor && <label className="grid gap-1 text-sm">Move to<select disabled={pending} value={status} onChange={(e) => move(article.id, e.target.value as ArticleStatus, null)} className="border border-stone-300 p-2">{columns.map((column) => <option key={column.status} value={column.status}>{column.label}</option>)}</select></label>}
            </article>;
          })}
          {editor && dragging && <div className={`border-2 border-dashed p-4 text-center text-sm ${endTarget ? "border-red-800 text-red-900" : "border-stone-400 text-stone-600"}`}>{status === "published" && articles.find((article) => article.id === dragging)?.status !== "published" ? "Drop to publish at the top" : "Drop to place at the end"}</div>}
          {stories.length === 0 && <p className="text-sm text-stone-500">No stories here yet.</p>}
        </section>;
      })}
    </div>
  </section>;
}
