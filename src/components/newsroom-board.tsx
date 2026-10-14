"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteArticle, moveArticle } from "@/app/actions";
import type { Article, ArticleStatus, StaffRole } from "@/lib/types";

const columns: { status: ArticleStatus; label: string }[] = [
  { status: "draft", label: "Drafts" }, { status: "review", label: "For review" }, { status: "published", label: "Published" },
];
export function NewsroomBoard({ articles, role }: { articles: Article[]; role: StaffRole }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const editor = role === "editor";
  const move = (id: string, status: ArticleStatus, beforeId: string | null) => {
    if (!editor || pending) return;
    startTransition(async () => {
      const result = await moveArticle(id, status, beforeId);
      setMessage(result.error || "Story moved.");
      if (!result.error) router.refresh();
    });
  };
  const drop = (event: React.DragEvent, status: ArticleStatus, beforeId: string | null) => {
    event.preventDefault(); event.stopPropagation();
    const id = event.dataTransfer.getData("text/plain");
    if (articles.some((article) => article.id === id)) move(id, status, beforeId);
  };
  return <section className="grid gap-4" aria-busy={pending}>
    <h2 className="font-serif text-3xl font-bold">Story board</h2>
    <p className="text-sm text-stone-600">{editor ? "Drag stories between columns to change their status. Drop above a story to set its order. Published order controls the front page and category lists; featured stories take the lead. Moving to Published publishes immediately unless its publish date is in the future. Buttons and status menus also work on touch screens and keyboards." : "Your stories appear here. Edit a draft to submit it for review; an editor will handle publication."}</p>
    <p role="status" aria-live="polite" className="text-sm text-red-900">{pending ? "Updating board…" : message}</p>
    <div className="grid items-start gap-4 lg:grid-cols-3">
      {columns.map(({ status, label }) => {
        const stories = articles.filter((article) => article.status === status);
        return <section key={status} className="grid min-h-48 gap-3 border border-stone-300 bg-stone-100 p-4" onDragOver={(e) => { if (editor && !pending) e.preventDefault(); }} onDrop={(e) => drop(e, status, null)}>
          <h3 className="font-serif text-2xl font-bold">{label} <span className="text-sm text-stone-500">({stories.length})</span></h3>
          {stories.map((article, index) => <article key={article.id} draggable={editor && !pending} onDragStart={(e) => { e.dataTransfer.setData("text/plain", article.id); e.dataTransfer.effectAllowed = "move"; }} onDragOver={(e) => { if (editor && !pending) e.preventDefault(); }} onDrop={(e) => drop(e, status, article.id)} className="grid gap-3 border border-stone-300 bg-white p-4">
            <p className="text-xs uppercase tracking-wider text-red-900">{article.category_name}{article.is_featured ? " · Featured" : ""}</p>
            <h4 className="font-serif text-xl font-bold">{article.title}</h4>
            <p className="text-sm text-stone-600">By {article.author}</p>
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
          </article>)}
          {stories.length === 0 && <p className="text-sm text-stone-500">No stories here yet.</p>}
        </section>;
      })}
    </div>
  </section>;
}
