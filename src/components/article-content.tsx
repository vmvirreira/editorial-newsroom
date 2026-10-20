import type { ContentBlock } from "@/lib/types";

function youtubeEmbed(url: string) {
  try {
    const parsed = new URL(url);
    const id = parsed.hostname === "youtu.be" ? parsed.pathname.slice(1) : ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(parsed.hostname) ? parsed.searchParams.get("v") : null;
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch { return null; }
}
export function ArticleContent({ blocks }: { blocks: ContentBlock[] }) {
  return <div className="grid gap-6">{blocks.map((block, index) => {
    if (block.type === "explainer") return null;
    if (block.type === "text") return <div key={index} className="grid gap-6">{block.text.split("\n\n").map((text, i) => <p key={i}>{text}</p>)}</div>;
    if (!/^https?:\/\//i.test(block.url)) return null;
    const embed = block.type === "video" ? youtubeEmbed(block.url) : null;
    return <figure key={index} className="grid gap-2">
      {block.type === "audio" && <audio controls preload="metadata" src={block.url} aria-label={block.caption || "Article audio"} className="w-full" />}
      {block.type === "video" && (embed ? <iframe src={embed} title={block.caption || "Article video"} loading="lazy" allow="fullscreen; picture-in-picture" allowFullScreen className="aspect-video w-full border-0" /> : <video controls preload="metadata" src={block.url} aria-label={block.caption || "Article video"} className="w-full" />)}
      {block.type === "link" ? <a href={block.url} target="_blank" rel="noopener noreferrer" className="break-words underline">{block.caption || block.url}</a> : <>
        {block.caption && <figcaption className="font-sans text-sm text-stone-600">{block.caption}</figcaption>}
        <a href={block.url} target="_blank" rel="noopener noreferrer" className="font-sans text-sm underline">Open {block.type}</a>
      </>}
    </figure>;
  })}</div>;
}

export function ArticleExplainers({ blocks, compact = false, headline = "" }: { blocks: ContentBlock[]; compact?: boolean; headline?: string }) {
  const explainers = blocks.filter((block): block is Extract<ContentBlock, { type: "explainer" }> => block.type === "explainer" && /^https?:\/\//i.test(block.url));
  if (!explainers.length && !headline) return null;
  return <aside aria-label="Explore the background" className={compact ? "mt-4 border-l-2 border-red-900 bg-stone-100 px-3 py-3" : "mt-6 border-l-4 border-red-900 bg-stone-100 p-5"}>
    {compact ? <h3 className="text-xs font-bold uppercase tracking-wide text-stone-800">Explore the background</h3> : <h2 className="font-serif text-2xl font-bold">Explore the background</h2>}
    {!compact && <p className="mt-1 text-sm text-stone-600">People, places, and ideas behind this story.</p>}
    {explainers.length ? <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">{explainers.map((block,index)=><li key={index}><a href={block.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">{block.caption || "Background explainer"} ↗</a></li>)}</ul> : <a href={`https://en.wikipedia.org/w/index.php?${new URLSearchParams({search:headline})}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm underline underline-offset-4">Search Wikipedia for background ↗</a>}
  </aside>;
}
