import type { Article } from "../types.ts";
import { articleTextParts } from "../text/article-text.ts";

export function narrationText(source: string): string {
  return articleTextParts(source).map(part => part.text)
    .join("")
    .replace(/\b(?:https?:\/\/|www\.)[^\s<>"']+/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}
export function storyNarration(article: Pick<Article, "title" | "dek" | "body" | "content_blocks" | "source_name">): string {
  return [article.title, article.source_name ? `Original reporting from ${article.source_name}.` : "", article.dek, article.body,
    ...(article.content_blocks ?? []).flatMap(block => block.type === "text" ? [block.text] : block.caption ? [block.caption] : []),
  ].map(narrationText).filter(Boolean).join("\n\n");
}
export function newsBriefing(articles: readonly Pick<Article, "id" | "title" | "dek">[]) {
  const seen = new Set<string>();
  const stories: string[] = [];
  for (const article of articles) {
    if (seen.has(article.id)) continue;
    seen.add(article.id);
    const text = [article.title, article.dek].map(narrationText).filter(Boolean).join("\n\n");
    if (text) stories.push(text);
  }
  return { text: stories.join("\n\n"), count: stories.length };
}
