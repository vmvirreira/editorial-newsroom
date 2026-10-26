import { requestedNewsView } from "@/lib/auto-news/preferences";
import { editionState } from "@/lib/auto-news/mode";
import { getAutoEdition } from "@/lib/auto-news/edition";
import { EditionNotice } from "@/components/edition-notice";
import { ArticleCard } from "@/components/article-card";
import { SiteHeader } from "@/components/site-header";
import {
  getPublishedArticles,
  getCategories,
  getCategoryBySlug,
} from "@/lib/news";
import { notFound } from "next/navigation";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{view?:string}>;
}) {
  const { slug } = await params;
  const [categories, category, curatedArticles] = await Promise.all([
    getCategories(),
    getCategoryBySlug(slug),
    getPublishedArticles(),
  ]);

  if (!category) notFound();
  const mode=await requestedNewsView((await searchParams).view);
  const state=editionState(mode,curatedArticles);
  const auto=state.active === "auto" ? await getAutoEdition(categories) : null;
  const edition=auto?.articles ?? curatedArticles;
  const articles=edition.filter(article=>article.category_slug===slug);

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-stone-950">
      <SiteHeader categories={categories} viewMode={mode} articles={edition} />
      <EditionNotice state={state} checkedAt={auto?.checkedAt} retained={auto?.retained} />
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="border-b border-stone-950 pb-6">
          <h1 className="font-serif text-6xl font-black tracking-[-0.045em]">
            {category.name}
          </h1>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-stone-700">
            {category.deck}
          </p>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {!articles.length && <p className="text-sm text-stone-600">No suitable reports are currently available for this section. Please try again later.</p>}
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} viewMode={mode} />
          ))}
        </div>
      </section>
    </main>
  );
}
