"use client";

import { LoaderCircle, Pause, Play, Square } from "lucide-react";
import { useSpeechPlayer } from "./story-listen";

const BRIEFING_ID = "news-briefing";
export function BriefingListen({ text, count }: { text: string; count: number }) {
  const { speech, state, canSpeak } = useSpeechPlayer();
  const active = state.id === BRIEFING_ID && state.status !== "idle";
  const starting = active && state.status === "starting";
  const playing = active && state.status === "playing";
  const label = starting ? "Starting news briefing" : playing ? "Pause news briefing" : active ? "Resume news briefing" : "Play all news summaries";
  const error = state.id === BRIEFING_ID ? state.error : "";
  const Icon = starting ? LoaderCircle : playing ? Pause : Play;
  return <div role="group" aria-label="News briefing" className="relative flex shrink-0 items-center gap-1">
    <button type="button" disabled={!canSpeak || !count || starting} onClick={() => speech.toggle(BRIEFING_ID, text)} aria-label={label} aria-pressed={active && state.status !== "paused"} title={!canSpeak ? "Listening is unavailable in this browser" : !count ? "No published stories to read" : `${label} · ${count} headlines and summaries in homepage order`} className="inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap px-2 text-xs font-semibold text-stone-800 hover:text-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900 disabled:opacity-50">
      <Icon aria-hidden="true" className={`h-4 w-4 ${starting ? "animate-spin" : ""}`} />
      <span>{starting ? "Starting…" : playing ? "Pause" : active ? "Resume" : "Play all"}</span>
    </button>
    {active && <button type="button" onClick={speech.stop} aria-label="Stop news briefing" title="Stop news briefing" className="inline-flex min-h-11 min-w-9 items-center justify-center text-stone-700 hover:text-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900"><Square aria-hidden="true" className="h-3.5 w-3.5" /></button>}
    <span role="status" className={error ? "absolute right-0 top-full z-10 w-64 max-w-[80vw] border border-red-200 bg-white p-3 text-xs leading-5 text-red-900 shadow-sm" : "sr-only"}>{error || (active ? `${starting ? "Starting" : playing ? "Reading" : "Paused"}: ${count} story headlines and summaries.` : "")}</span>
  </div>;
}
