"use client";

import { Children, useId, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function LatestStories({ children, total, pageSize }: { children: ReactNode; total: number; pageSize: number }) {
  const pages = Children.toArray(children);
  const [page, setPage] = useState(0);
  const current = Math.min(page, Math.max(0, pages.length - 1));
  const panelId = useId();
  const buttonClass = "inline-flex size-10 items-center justify-center border border-stone-400 text-stone-800 transition-colors hover:border-red-900 hover:bg-red-50 hover:text-red-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900 disabled:cursor-default disabled:opacity-30 disabled:hover:border-stone-400 disabled:hover:bg-transparent disabled:hover:text-stone-800";

  return (
    <aside aria-labelledby="latest-heading" className="grid content-start gap-5 border-l-0 border-stone-300 lg:border-l lg:pl-6">
      <h2 id="latest-heading" className="border-b border-stone-950 pb-2 font-serif text-2xl font-black">The Latest</h2>
      {pages.length > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p aria-live="polite" aria-atomic="true" className="text-xs text-stone-600">
            Stories {current * pageSize + 1}–{Math.min(total, (current + 1) * pageSize)} of {total}
          </p>
          <div className="flex gap-2" role="group" aria-label="Browse latest stories">
            <button type="button" aria-label="Previous latest stories" aria-controls={panelId} disabled={current === 0} onClick={() => setPage(current - 1)} className={buttonClass}><ChevronLeft size={18} aria-hidden="true" /></button>
            <button type="button" aria-label="Next latest stories" aria-controls={panelId} disabled={current >= pages.length - 1} onClick={() => setPage(current + 1)} className={buttonClass}><ChevronRight size={18} aria-hidden="true" /></button>
          </div>
        </div>
      )}
      <div id={panelId}>
        {pages[current] ?? <p className="text-sm text-stone-600">You’re up to date. More stories will appear here as they become available.</p>}
      </div>
    </aside>
  );
}
