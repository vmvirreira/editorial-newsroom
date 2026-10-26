"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NEWS_VIEWS, type NewsView } from "@/lib/auto-news/mode";
const labels:Record<NewsView,string>={smart:"Smart",curated:"Curated",auto:"Auto"};
export function NewsViewSelector({mode}:{mode:NewsView}){
  const path=usePathname();const destination=path.startsWith("/category/") ? path : "/";
  return <nav aria-label="News view" className="inline-flex shrink-0 rounded border border-stone-400 bg-white p-0.5 text-xs font-semibold">{NEWS_VIEWS.map(view=><Link key={view} href={`${destination}?view=${view}`} prefetch={false} aria-current={mode===view ? "page" : undefined} title={view==="smart" ? "Default: curated news while fresh; automatic news after 24 hours" : view==="auto" ? "Two automatically selected reports per category" : "Editor-published articles in editorial order"} onClick={()=>{document.cookie=`bb-news-view=${view}; Path=/; SameSite=Lax`;}} className={`inline-flex min-h-9 items-center rounded px-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900 ${mode===view ? "bg-stone-950 text-white" : "text-stone-700 hover:bg-stone-100"}`}>{labels[view]}</Link>)}</nav>;
}
