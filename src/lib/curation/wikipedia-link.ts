export type WikipediaTopic = { title: string; url: string };

export function wikipediaUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    if (url.hostname === "en.m.wikipedia.org") url.hostname = "en.wikipedia.org";
    return url.protocol === "https:" && url.hostname === "en.wikipedia.org" && !url.port && !url.username && !url.password && url.pathname.startsWith("/wiki/") && url.pathname.length > 6 && !url.search ? url.toString() : null;
  } catch { return null; }
}
export function customWikipediaTopic(value: string, label: string): WikipediaTopic | null {
  const url = wikipediaUrl(value);
  if (!url) return null;
  try {
    const title = label.trim() || decodeURIComponent(new URL(url).pathname.slice(6)).replaceAll("_", " ");
    return title ? { title: title.slice(0, 200), url } : null;
  } catch { return null; }
}
