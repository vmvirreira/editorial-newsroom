import { ArticleCard } from "@/components/article-card";
import { SiteHeader } from "@/components/site-header";
import {
  getArticlesByCategory,
  getCategories,
  getCategoryBySlug,
} from "@/lib/news";
import { notFound } from "next/navigation";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [categories, category, articles] = await Promise.all([
    getCategories(),
    getCategoryBySlug(slug),
    getArticlesByCategory(slug),
  ]);

  if (!category) notFound();

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-stone-950">
      <SiteHeader categories={categories} />
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
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </section>
    </main>
  );
}
