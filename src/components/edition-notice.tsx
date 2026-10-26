import Link from "next/link";
import type { editionState } from "@/lib/auto-news/mode";
import { PublicationTime } from "./publication-time";
export function EditionNotice({state,checkedAt,retained=false}:{state:ReturnType<typeof editionState>;checkedAt?:string|null;retained?:boolean}){
  return <div className="mx-auto max-w-7xl px-4 pt-5 text-sm leading-6 text-stone-600" role="status">
    <p><strong className="text-stone-900">{state.active==="auto" ? "Auto edition · Automatically selected reporting" : "Curated edition · Selected by our editor"}</strong>{state.mode==="smart" && <span> · Smart view</span>}</p>
    {state.active==="auto" ? <><p>Two distinct reports per category where available. Recent reporting is preferred; source previews link to the original publishers.</p>{state.mode==="smart" && <p>{state.latest ? "Smart selected Auto because there has been no new curated publication in more than 24 hours." : "Smart selected Auto while the curated edition awaits its first publication."}</p>}{checkedAt && <p className="text-xs"><PublicationTime value={checkedAt} label="Source selection checked" /> · Refreshes about every 30 minutes.{retained ? " Showing the last available selection while sources refresh." : ""}</p>}</> : state.stale && <p>{state.latest ? "This curated edition is more than a day old." : "No curated stories have been published yet."} <Link href="/?view=auto" className="font-semibold underline">See the Auto edition ↗</Link></p>}
    {state.latest && <p className="text-xs"><PublicationTime value={state.latest} label="Latest curated publication" /></p>}
  </div>;
}
