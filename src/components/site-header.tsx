import { requestedNewsView } from "@/lib/auto-news/preferences";
import type { NewsView } from "@/lib/auto-news/mode";
import { NewsViewSelector } from "./news-view-selector";
import { MastheadClock } from "./masthead-clock";
import { MastheadWeather } from "./masthead-weather";
import { NewsBriefing } from "./news-briefing";
import { Suspense } from "react";
import Link from "next/link";
import { Newspaper, ShieldCheck } from "lucide-react";
import { signOut } from "@/app/actions";
import type { Article, Category } from "@/lib/types";

type SiteHeaderProps = {
  categories: Category[];
  viewMode?: NewsView;
  isAdmin?: boolean;
  signedIn?: boolean;
  articles?: Article[];
};

export async function SiteHeader({
  categories,
  isAdmin = false,
  signedIn = false,
  articles,
  viewMode,
}: SiteHeaderProps) {
  const mode = await requestedNewsView(viewMode);
  return (
    <header className="border-b border-stone-300 bg-[#fbfaf7]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-4 py-3 text-xs uppercase tracking-[0.18em] text-stone-600">
        <Link href={`/?view=${mode}`} className="flex items-center gap-2 font-semibold">
          <Newspaper className="h-4 w-4 shrink-0" />
          <MastheadClock initialIso={new Date().toISOString()} />
        </Link>
        <div className="flex items-center gap-3">
          {isAdmin ? (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 border border-stone-900 px-3 py-1.5 text-stone-950 transition hover:bg-stone-950 hover:text-white"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Newsroom
            </Link>
          ) : null}
          {signedIn ? (
            <form action={signOut}>
              <button className="border border-stone-300 px-3 py-1.5 transition hover:border-stone-950">
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/admin"
              className="border border-stone-300 px-3 py-1.5 transition hover:border-stone-950"
            >
              Staff login
            </Link>
          )}
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-6 text-center">
        <Link
          href={`/?view=${mode}`}
          className="font-serif text-5xl font-black tracking-[-0.05em] text-stone-950 sm:text-7xl"
        >
          The Brief and Beyond
        </Link>
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 border-t border-stone-300 px-4 py-3">
      <nav aria-label="News categories" className="flex min-w-0 flex-1 gap-5 overflow-x-auto text-sm font-semibold text-stone-800">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/category/${category.slug}?view=${mode}`}
            className="section-link inline-flex min-h-9 items-center whitespace-nowrap"
          >
            {category.name}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex max-w-full flex-wrap items-center gap-2">
      <NewsViewSelector mode={mode} />
      <Suspense fallback={<span className="text-xs text-stone-500">Loading audio…</span>}>
        <NewsBriefing articles={articles} />
      </Suspense>
      <MastheadWeather />
      </div>
      </div>
    </header>
  );
}
