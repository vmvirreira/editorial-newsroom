import { ReadingBreak } from "@/components/reading-break";
import Link from "next/link";
import { LocalWeatherPanel } from "@/components/local-weather";
import { ArticleCard } from "@/components/article-card";
import { SiteHeader } from "@/components/site-header";
import { getCategories, getPublishedArticles } from "@/lib/news";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const [categories, articles, supabase] = await Promise.all([
    getCategories(),
    getPublishedArticles(),
    createSupabaseServerClient(),
  ]);

  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const staff = user
    ? await supabase?.from("newsroom_staff_profiles").select("role").eq("user_id", user.id).maybeSingle()
    : null;

  const mainStories = articles.slice(0, 3);
  const latestStories = articles.slice(3);
  const grouped = categories.map((category) => ({
    category,
    articles: articles
      .filter((article) => article.category_slug === category.slug)
      .slice(0, 3),
  }));

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-stone-950">
      <SiteHeader
        categories={categories}
        articles={articles}
        signedIn={Boolean(user)}
        isAdmin={Boolean(staff?.data)}
      />
      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-[1fr_320px]">
        <section aria-label="Top stories" className="grid min-w-0 grid-cols-1 content-start gap-8">
          {mainStories.map((article, index) => (
            <ArticleCard
              key={article.id}
              article={article}
              priority={index === 0}
              variant="lead"
            />
          ))}
        </section>
        <aside aria-labelledby="latest-heading" className="grid content-start gap-5 border-l-0 border-stone-300 lg:border-l lg:pl-6">
          <h2 id="latest-heading" className="border-b border-stone-950 pb-2 font-serif text-2xl font-black">
            The Latest
          </h2>
          {latestStories.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </aside>
      </section>
      <section aria-label="Beyond the news" className="mx-auto grid w-full max-w-7xl gap-5 px-4 pb-8 lg:grid-cols-[0.8fr_1.2fr]"><ReadingBreak /><LocalWeatherPanel /></section>
      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="grid gap-8 border-t border-stone-950 pt-6 md:grid-cols-2 lg:grid-cols-3">
          {grouped.map(({ category, articles: categoryArticles }) => (
            <section key={category.id} className="grid content-start gap-4">
              <div>
                <h2 className="font-serif text-3xl font-black tracking-[-0.03em]">
                  <Link href={`/category/${category.slug}`} className="section-link">{category.name}</Link>
                </h2>
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  {category.deck}
                </p>
              </div>
              {categoryArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
