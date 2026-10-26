import type { Article } from "../types.ts";
export const NEWS_VIEWS = ["smart", "curated", "auto"] as const;
export type NewsView = typeof NEWS_VIEWS[number];
export type EditionKind = "curated" | "auto";
export function newsView(value: unknown): NewsView | null { return typeof value === "string" && NEWS_VIEWS.includes(value as NewsView) ? value as NewsView : null; }
export function editionState(mode: NewsView, articles: readonly Pick<Article,"status"|"published_at">[], now = Date.now()) {
  const dates = articles.filter(article=>article.status === "published").map(article=>Date.parse(article.published_at)).filter(date=>Number.isFinite(date) && date<=now);
  const latest = dates.length ? Math.max(...dates) : null;
  const stale = latest === null || now-latest > 86400000;
  const active: EditionKind = mode === "smart" ? stale ? "auto" : "curated" : mode;
  return { mode, active, stale, latest: latest === null ? null : new Date(latest).toISOString() };
}
