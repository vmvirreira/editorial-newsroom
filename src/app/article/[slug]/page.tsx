import { StoryListen } from "@/components/story-listen";
import { storyNarration } from "@/lib/speech/story-speech";
import { ArticleContent } from "@/components/article-content";
import Image from "next/image";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getArticleBySlug, getCategories } from "@/lib/news";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [article, categories] = await Promise.all([
    getArticleBySlug(slug),
    getCategories(),
  ]);

  if (!article) notFound();

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-stone-950">
      <SiteHeader categories={categories} />
      <article className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-900">
          {article.category_name}
        </p>
        <h1 className="mt-3 font-serif text-5xl font-black leading-[0.95] tracking-[-0.045em] sm:text-7xl">
          {article.title}
        </h1>
        <p className="mt-5 max-w-3xl text-xl leading-8 text-stone-700">
          {article.dek}
        </p>
        <StoryListen id={article.id} title={article.title} text={storyNarration(article)} />
        <div className="mt-5 border-y border-stone-300 py-3 text-sm text-stone-600">
          {article.source_url ? <span>Curated by {article.author} · Original reporting: <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="font-semibold underline">{article.source_name} ↗</a>{article.source_published_at && ` · Source published ${new Date(article.source_published_at).toLocaleDateString("en-GB", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" })}`}</span> : <>By <span className="font-semibold text-stone-950">{article.author}</span></>}
        </div>
        {article.image_url && <Image
          src={article.image_url}
          alt={article.image_alt}
          width={1400}
          height={820}
          priority
          className="mt-8 aspect-[1.7] w-full object-cover grayscale-[12%]"
        />}
        <div className="mt-8 grid gap-6 font-serif text-xl leading-9 text-stone-900">
          {article.body.split("\n\n").map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <ArticleContent blocks={article.content_blocks ?? []} />
        </div>
      </article>
    </main>
  );
}
