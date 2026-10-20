import { parseDocument } from "htmlparser2";
import { decodeHTML } from "entities";

export type ArticleTextPart = { text: string; href?: string };
const hiddenTags = new Set(["script", "style", "iframe", "object", "embed", "svg", "math", "template", "head", "noscript"]);
const blockTags = new Set(["p", "div", "section", "article", "blockquote", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6"]);

export function safeArticleHref(value: string): string | null {
  if (/[\u0000-\u0020\u007f]/.test(value)) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
function trimUrlPunctuation(value: string) {
  let url = value.replace(/[.,;:!?…’”]+$/u, "");
  for (const [open, close] of [["(", ")"], ["[", "]"], ["{", "}"]]) {
    while (url.endsWith(close) && url.split(close).length > url.split(open).length) url = url.slice(0, -1);
  }
  return url;
}
function linkText(text: string): ArticleTextPart[] {
  const parts: ArticleTextPart[] = [];
  let end = 0;
  for (const match of text.matchAll(/\b(?:https?:\/\/|www\.)[^\s<>"'\u0000-\u001f]+/gi)) {
    const url = trimUrlPunctuation(match[0]);
    const href = safeArticleHref(/^www\./i.test(url) ? `https://${url}` : url);
    if (!href) continue;
    if (match.index > end) parts.push({ text: text.slice(end, match.index) });
    parts.push({ text: url, href });
    end = match.index + url.length;
  }
  if (end < text.length) parts.push({ text: text.slice(end) });
  return parts;
}
export function articleTextParts(source: string): ArticleTextPart[] {
  // Some imported previews contain escaped markup rather than literal tags.
  let html = source;
  if (!/<\/?[a-z][^>]*>/i.test(html)) {
    for (let i = 0; i < 2 && /(?:&lt;|&#0*60;|&#x0*3c;)\s*\/?[a-z]/i.test(html); i++) html = decodeHTML(html);
  }
  const document = parseDocument(html, { decodeEntities: true });
  const parts: ArticleTextPart[] = [];
  const append = (text: string, href?: string) => {
    if (!text) return;
    const last = parts.at(-1);
    if (last && last.href === href) last.text += text;
    else parts.push({ text, ...(href ? { href } : {}) });
  };
  const boundary = () => { if (parts.length && !parts.at(-1)!.text.endsWith("\n\n")) append("\n\n"); };
  type Node = typeof document.children[number];
  function visit(nodes: Node[], href?: string) {
    for (const node of nodes) {
      if (node.type === "text") { append(node.data, href); continue; }
      if (!("name" in node) || !("attribs" in node)) continue;
      const name = node.name.toLowerCase();
      if (hiddenTags.has(name)) continue;
      if (name === "br") { append("\n", href); continue; }
      if (blockTags.has(name)) boundary();
      const link = name === "a" ? safeArticleHref(node.attribs.href ?? "") ?? undefined : href;
      visit(node.children, link);
      if (blockTags.has(name)) boundary();
    }
  }
  visit(document.children);
  return parts.flatMap(part => part.href ? [part] : linkText(part.text));
}
export function articlePlainText(source: string) {
  return articleTextParts(source).map(part => part.text).join("").trim();
}
