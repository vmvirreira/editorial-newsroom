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
  const admin = user
    ? await supabase
        ?.from("admin_profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle()
    : null;

  const lead = articles.find((article) => article.is_featured) ?? articles[0];
  const secondary = articles.filter((article) => article.id !== lead?.id);
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
        signedIn={Boolean(user)}
        isAdmin={Boolean(admin?.data)}
      />
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[1fr_320px]">
        <div>{lead ? <ArticleCard article={lead} priority variant="lead" /> : null}</div>
        <aside className="grid content-start gap-5 border-l-0 border-stone-300 lg:border-l lg:pl-6">
          <h2 className="border-b border-stone-950 pb-2 font-serif text-2xl font-black">
            The Latest
          </h2>
          {secondary.slice(0, 4).map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </aside>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="grid gap-8 border-t border-stone-950 pt-6 md:grid-cols-2 lg:grid-cols-3">
          {grouped.map(({ category, articles: categoryArticles }) => (
            <section key={category.id} className="grid content-start gap-4">
              <div>
                <h2 className="font-serif text-3xl font-black tracking-[-0.03em]">
                  {category.name}
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
