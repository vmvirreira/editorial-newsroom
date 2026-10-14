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
