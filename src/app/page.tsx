import { requestedNewsView } from "@/lib/auto-news/preferences";
import { editionState } from "@/lib/auto-news/mode";
import { getAutoEdition } from "@/lib/auto-news/edition";
import { EditionNotice } from "@/components/edition-notice";
import { Suspense } from "react";
import { DailyEdition, DailyEditionFallback } from "@/components/daily-edition";
import Link from "next/link";
import { LocalWeatherPanel } from "@/components/local-weather";
import { ArticleCard } from "@/components/article-card";
import { LatestStories } from "@/components/latest-stories";
import { SiteHeader } from "@/components/site-header";
import { getCategories, getPublishedArticles } from "@/lib/news";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const LATEST_PAGE_SIZE = 3;

export default async function Home({ searchParams }: { searchParams: Promise<{view?:string}> }) {
  const [categories, curatedArticles, supabase] = await Promise.all([
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

  const mode = await requestedNewsView((await searchParams).view);
  const state = editionState(mode, curatedArticles);
  const auto = state.active === "auto" ? await getAutoEdition(categories) : null;
  const articles = auto?.articles ?? curatedArticles;
  const mainStories = articles.slice(0, 3);
  const latestStories = articles.slice(3);
  const grouped = categories.map((category) => ({
    category,
    articles: articles
      .filter((article) => article.category_slug === category.slug)
      .slice(0, state.active === "auto" ? 2 : 3),
  }));

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-stone-950">
      <SiteHeader
        categories={categories}
        viewMode={mode}
        articles={articles}
        signedIn={Boolean(user)}
        isAdmin={Boolean(staff?.data)}
      />
      <EditionNotice state={state} checkedAt={auto?.checkedAt} retained={auto?.retained} />
      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-[1fr_320px]">
        <div className="grid min-w-0 content-start gap-8">
        <section aria-label="Top stories" className="grid min-w-0 grid-cols-1 content-start gap-8">
          {!articles.length && <p className="text-sm text-stone-600">Current reports are temporarily unavailable. The daily features remain available below; please try again shortly.</p>}
          {mainStories.map((article, index) => (
            <ArticleCard
              key={article.id}
              article={article}
              viewMode={mode}
              priority={index === 0}
              variant="lead"
            />
          ))}
        </section>
        <Suspense fallback={<DailyEditionFallback />}><DailyEdition /></Suspense>
        </div>
        <LatestStories key={`${mode}:${articles.map(article => article.id).join(",")}`} total={latestStories.length} pageSize={LATEST_PAGE_SIZE}>
          {Array.from({ length: Math.ceil(latestStories.length / LATEST_PAGE_SIZE) }, (_, page) => (
            <div key={page} className="grid gap-5">
              {latestStories.slice(page * LATEST_PAGE_SIZE, (page + 1) * LATEST_PAGE_SIZE).map(article => (
                <ArticleCard key={article.id} article={article} viewMode={mode} />
              ))}
            </div>
          ))}
        </LatestStories>
      </section>
      <section aria-label="Local forecast" className="mx-auto max-w-7xl px-4 pb-8"><LocalWeatherPanel /></section>
      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="grid gap-8 border-t border-stone-950 pt-6 md:grid-cols-2 lg:grid-cols-3">
          {grouped.map(({ category, articles: categoryArticles }) => (
            <section key={category.id} className="grid content-start gap-4">
              <div>
                <h2 className="font-serif text-3xl font-black tracking-[-0.03em]">
                  <Link href={`/category/${category.slug}?view=${mode}`} className="section-link">{category.name}</Link>
                </h2>
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  {category.deck}
                </p>
              </div>
              {state.active === "auto" && categoryArticles.length < 2 && <p className="text-xs leading-5 text-stone-500">{categoryArticles.length ? "One suitable report is currently available." : "No suitable recent reports are available right now."}</p>}
              {categoryArticles.map((article) => (
                <ArticleCard key={article.id} article={article} viewMode={mode} />
              ))}
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
