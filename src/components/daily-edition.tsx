import Image from "next/image";
import { DAILY_LABELS, DAILY_FALLBACKS, editionDate, type DailyItem } from "@/lib/edition/daily-model";
import { getDailyEdition } from "@/lib/edition/daily";
import { StoryListen } from "./story-listen";

export function DailyCards({ date, selections }: { date: string; selections: {item:DailyItem;manual:boolean}[] }) {
  const order = ["cartoon", "art", "quotes", "jokes", "poems", "place", "fact", "explainer"];
  const tiles = [...selections].sort((a,b) => order.indexOf(a.item.kind) - order.indexOf(b.item.kind));
  return <section aria-labelledby="daily-edition-title" className="grid min-w-0 w-full gap-4">
    <header className="flex flex-wrap items-baseline justify-between gap-3 border-t border-stone-950 pt-5"><div><p className="text-xs font-bold uppercase tracking-widest text-red-900">A little beyond the headlines</p><h2 id="daily-edition-title" className="mt-2 font-serif text-3xl font-bold">Beyond the Brief</h2></div><p className="text-xs text-stone-500">Daily edition · <time dateTime={date}>{new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"})}</time> · UTC</p></header>
    <div className="grid gap-4 sm:grid-cols-2">{tiles.map(({item,manual})=><article key={item.kind} aria-label={DAILY_LABELS[item.kind]} className="min-h-72 min-w-0 border border-stone-300 bg-white p-4 sm:p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-red-900">{DAILY_LABELS[item.kind]}</p>
      {!["quotes","jokes","poems"].includes(item.kind) && <h3 className="mt-3 font-serif text-xl font-bold leading-tight">{item.title}</h3>}
      {item.imageUrl && <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-4 block"><Image src={item.imageUrl} alt={item.imageAlt || item.title} width={900} height={700} unoptimized className="h-auto max-h-80 w-full object-contain" /></a>}
      <p className={`mt-4 whitespace-pre-line break-words leading-7 text-stone-800 ${["quotes","poems"].includes(item.kind) ? "font-serif text-lg" : "text-sm"}`}>{item.text}</p>
      {item.credit && <p className="mt-4 text-xs font-semibold leading-5 text-stone-600">{item.credit}</p>}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-xs leading-5 text-stone-600"><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{item.source} ↗</a>{item.mapUrl && <a href={item.mapUrl} target="_blank" rel="noopener noreferrer" className="underline">Explore on map ↗</a>}{item.licenseUrl && <a href={item.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">{item.license}</a>}</div>
      {manual && <p className="mt-2 text-xs text-stone-500">Editor’s selection</p>}
      <StoryListen id={`daily-${date}-${item.kind}`} title={DAILY_LABELS[item.kind]} text={`${item.title}. ${item.text} ${item.credit}`} compact />
    </article>)}</div>
  </section>;
}
export function DailyEditionFallback(){return <DailyCards date={editionDate()} selections={DAILY_FALLBACKS.map(item=>({item,manual:false}))} />;}
export async function DailyEdition(){const {date,selections}=await getDailyEdition();return <DailyCards date={date} selections={selections} />;}
