import { ArticleExplainers } from "./article-content";
import { ArticleText } from "./article-text";
import { StoryListen } from "@/components/story-listen";
import { storyNarration } from "@/lib/speech/story-speech";
import { youtubeEmbed } from "@/lib/media/youtube";
import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/lib/types";

type ArticleCardProps = {
  article: Article;
  priority?: boolean;
  variant?: "lead" | "compact" | "feature";
};

export function ArticleCard({
  article,
  priority = false,
  variant = "compact",
}: ArticleCardProps) {
  const isLead = variant === "lead";
  const video = (article.content_blocks ?? []).flatMap((block) => {
    const embed = block.type === "video" ? youtubeEmbed(block.url) : null;
    return embed && block.type === "video" ? [{ embed, caption: block.caption }] : [];
  })[0];

  return (
    <article
      className={
        isLead
          ? `grid grid-cols-1 gap-5 border-b border-stone-300 pb-6 ${article.image_url ? "lg:grid-cols-[1.2fr_0.8fr]" : ""}`
          : "border-b border-stone-300 pb-5"
      }
    >
      <Link
        href={`/article/${article.slug}`}
        className={isLead && article.image_url ? "block overflow-hidden bg-stone-200" : "hidden"}
      >
        {article.image_url && <Image
          src={article.image_url}
          alt={article.image_alt}
          width={1200}
          height={760}
          priority={priority}
          className="aspect-[1.45] h-full w-full object-cover grayscale-[18%] transition duration-500 hover:scale-[1.02]"
        />}
      </Link>
      <div className={`min-w-0 [overflow-wrap:anywhere] ${isLead ? "flex flex-col justify-center" : ""}`}>
        <Link
          href={`/category/${article.category_slug}`}
          className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.16em] text-red-900"
        >
          {article.category_name}
        </Link>
        <Link href={`/article/${article.slug}`} className="group">
          <h2
            className={
              isLead
                ? "font-serif text-[1.75rem] font-bold leading-tight tracking-[-0.025em] text-stone-950 group-hover:text-red-950 sm:text-3xl"
                : "font-serif text-2xl font-bold leading-tight tracking-[-0.02em] text-stone-950 group-hover:text-red-950"
            }
          >
            {article.title}
          </h2>
        </Link>
        <p
          className={
            isLead
              ? "mt-4 max-w-2xl text-lg leading-8 text-stone-700"
              : "mt-2 text-sm leading-6 text-stone-700"
          }
        >
          <ArticleText text={article.dek} inline />
        </p>
        {video && <figure className="mt-4 w-full max-w-sm">
          <iframe
            src={video.embed}
            title={video.caption || `Video: ${article.title}`}
            loading="lazy"
            allow="fullscreen; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full border-0"
          />
          {video.caption && <figcaption className="mt-2 text-xs leading-5 text-stone-600">{video.caption}</figcaption>}
        </figure>}
        <ArticleExplainers blocks={article.content_blocks ?? []} headline={article.title} compact />
        <StoryListen id={article.id} title={article.title} text={storyNarration(article)} compact />
        <p className="mt-4 text-xs uppercase tracking-[0.14em] text-stone-500">
          {article.source_name ? `Curated · ${article.source_name}` : `By ${article.author}`}
        </p>
      </div>
    </article>
  );
}
