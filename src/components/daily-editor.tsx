"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { chooseDailyItem } from "@/app/admin/daily/actions";
import { DAILY_LABELS, type DailyKind, type DailyItem, type DailyPools } from "@/lib/edition/daily-model";

export function DailyEditor({date,pools,selections,disabled=false}: {disabled?:boolean;date:string;pools:DailyPools;selections:{item:DailyItem;manual:boolean}[]}) {
  const [pending,startTransition]=useTransition();const [message,setMessage]=useState("");const [error,setError]=useState("");const router=useRouter();
  const choose=(kind:DailyKind,id:string|null)=>startTransition(async()=>{
    if(disabled)return;
    setError("");setMessage("");
    try{const result=await chooseDailyItem(date,kind,id);setError(result.error || "");if(!result.error){setMessage(result.message || "Saved.");router.refresh();}}
    catch{setError("The selection could not be saved. Please try again.");}
  });
  return <section className="grid gap-5" aria-busy={pending}>
    <div className="border border-stone-300 bg-white p-5 text-sm leading-6 text-stone-700"><p className="font-bold text-stone-950">No daily checklist.</p><p>All eight features choose themselves from their source feeds. Leave them on Automatic, or open a feature to replace today’s choice. Replacements last for this UTC edition only; tomorrow returns to Automatic. Poems and summaries are kept short so the page stays readable.</p></div>
    {error && <p role="alert" className="text-sm text-red-900">{error}</p>}<p role="status" aria-live="polite" className="text-sm text-green-900">{pending ? "Updating today’s edition…" : message}</p>
    <div className="grid items-start gap-4 md:grid-cols-2">{selections.map(({item,manual})=><article key={item.kind} className="border border-stone-300 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-serif text-xl font-bold">{DAILY_LABELS[item.kind]}</h2><span className={`text-xs font-bold ${manual ? "text-red-900" : "text-green-800"}`}>{manual ? "Editor’s selection" : "Automatic"}</span></div>
      <p className="mt-3 font-bold text-sm">{item.title}</p><p className="mt-2 whitespace-pre-line text-sm leading-6 text-stone-700">{item.text.length>240 ? `${item.text.slice(0,240)}…` : item.text}</p><a className="mt-2 inline-block text-xs underline" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{item.source} ↗</a>
      <details className="mt-4 border-t border-stone-200 pt-3"><summary className="cursor-pointer text-sm font-bold">Choose another from this feed ({pools[item.kind].length})</summary><div className="mt-3 grid gap-3">{pools[item.kind].map(candidate=><div key={candidate.id} className="border border-stone-200 p-3"><p className="text-sm font-semibold">{candidate.title}</p><p className="mt-1 whitespace-pre-line text-xs leading-5 text-stone-600">{candidate.text.length>220 ? `${candidate.text.slice(0,220)}…` : candidate.text}</p><div className="mt-2 flex flex-wrap gap-4 text-xs"><a href={candidate.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">Preview original ↗</a><button disabled={disabled || pending || (manual && item.id===candidate.id)} onClick={()=>choose(item.kind,candidate.id)} className="font-bold underline disabled:opacity-40">Use for today</button></div></div>)}</div></details>
      {manual && <button disabled={disabled || pending} onClick={()=>choose(item.kind,null)} className="mt-4 text-sm underline disabled:opacity-40">Restore Automatic</button>}
    </article>)}</div>
  </section>;
}
