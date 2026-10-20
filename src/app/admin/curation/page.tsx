import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/staff";
import { getCategories } from "@/lib/news";
import { CURATION_SOURCES } from "@/lib/curation/sources";
import { CurationInbox, type Suggestion } from "@/components/curation-inbox";

export default async function CurationPage({ searchParams }: { searchParams: Promise<{ category?: string; status?: string }> }) {
  const { supabase, user, role } = await getStaffSession();
  if (!supabase || !user || role !== "editor") redirect("/admin");
  const params = await searchParams;
  const categories = await getCategories();
  const category = categories.find((item) => item.slug === params.category);
  const status = ["new", "dismissed", "drafted"].includes(params.status ?? "") ? params.status! : "new";
  let query = supabase.from("newsroom_suggestions").select("id, category_id, source_id, source_name, source_url, headline, source_published_at, discovered_at, status, article_id").eq("status", status);
  if (category) query = query.eq("category_id", category.id);
  // Keep the inbox current. Dismissed and drafted history remains available.
  if (status === "new") query = query.gte("source_published_at", new Date(new Date().getTime() - 14 * 86400_000).toISOString());
  const { data, error } = await query.order("source_published_at", { ascending: false }).limit(200);
  if (error) throw new Error("Unable to load the curation inbox. Please try again.");
  const filterUrl = (nextCategory: string, nextStatus: string) => `/admin/curation?${new URLSearchParams({ category: nextCategory, status: nextStatus })}`;
  return <main className="min-h-screen bg-[#fbfaf7] px-4 py-8 text-stone-950">
    <section className="mx-auto grid max-w-6xl gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-950 pb-5">
        <div><p className="text-xs font-bold uppercase tracking-widest text-red-900">Editor desk · Curation</p><h1 className="mt-2 font-serif text-4xl font-black sm:text-5xl">The next story starts here.</h1></div>
        <Link href="/admin" className="underline">Back to newsroom</Link>
      </header>
      <p className="max-w-3xl leading-7 text-stone-700">Discover recent reporting from selected public feeds. Read the original, choose a story, then prepare an attributed link draft. Add your perspective and publish from the newsroom when it is ready.</p>
      <nav aria-label="Curation categories" className="flex flex-wrap gap-2">
        {[{ slug: "", name: "All categories" }, ...categories].map((item) => <Link key={item.slug} href={filterUrl(item.slug, status)} aria-current={(category?.slug ?? "") === item.slug ? "page" : undefined} className={`border px-3 py-2 text-sm ${((category?.slug ?? "") === item.slug) ? "border-stone-950 bg-stone-950 text-white" : "border-stone-300 bg-white hover:border-stone-950"}`}>{item.name}</Link>)}
      </nav>
      <nav aria-label="Suggestion status" className="flex flex-wrap gap-5 border-b border-stone-300 pb-3">
        {[["new", "Inbox"], ["drafted", "Prepared drafts"], ["dismissed", "Dismissed"]].map(([value, label]) => <Link key={value} href={filterUrl(category?.slug ?? "", value)} aria-current={status === value ? "page" : undefined} className={status === value ? "font-bold underline decoration-red-900 underline-offset-8" : "text-stone-600 hover:underline"}>{label}</Link>)}
      </nav>
      <CurationInbox suggestions={data as Suggestion[]} categories={categories} sources={CURATION_SOURCES} status={status} />
      <details className="border-t border-stone-300 pt-4 text-sm leading-6 text-stone-600"><summary className="cursor-pointer font-bold">About these sources</summary><p className="mt-3">BBC News provides desk feeds for all six categories. Politics currently emphasizes UK coverage. NASA provides official science releases and is a primary source, rather than an independent news outlet. This is a starting selection, not comprehensive coverage.</p><p className="mt-2">Refresh checks the feeds on demand, with a 15-minute cache. The inbox includes stories from the past 14 days. We import headlines and original links; full articles, photographs, audio, and video are not copied. Public availability is not a republication license. Use your own commentary or material you have permission to publish.</p></details>
    </section>
  </main>;
}
