"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Pause, Play, Square, Volume2 } from "lucide-react";
import { IDLE_SPEECH, StorySpeech } from "@/lib/speech/story-speech";

const SpeechContext = createContext<StorySpeech | null>(null);
const subscribeSupport = () => () => {};
const supported = () => typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
const unsupportedOnServer = () => false;
const serverState = () => IDLE_SPEECH;

export function StorySpeechProvider({ children }: { children: React.ReactNode }) {
  const [speech] = useState(() => new StorySpeech(() => ({
    engine: window.speechSynthesis,
    utterance: text => { const utterance = new SpeechSynthesisUtterance(text); utterance.lang = document.documentElement.lang || "en"; return utterance; },
  })));
  const pathname = usePathname();
  useEffect(() => {
    const stop = () => speech.stop();
    window.addEventListener("pagehide", stop);
    return () => { window.removeEventListener("pagehide", stop); speech.stop(); };
  }, [speech, pathname]);
  return <SpeechContext.Provider value={speech}>{children}</SpeechContext.Provider>;
}

export function StoryListen({ id, title, text, compact = false }: { id: string; title: string; text: string; compact?: boolean }) {
  const speech = useContext(SpeechContext);
  if (!speech) throw new Error("StoryListen requires StorySpeechProvider");
  const state = useSyncExternalStore(speech.subscribe, speech.getSnapshot, serverState);
  const canSpeak = useSyncExternalStore(subscribeSupport, supported, unsupportedOnServer);
  const active = state.id === id && state.status !== "idle";
  const playing = active && state.status === "playing";
  const action = playing ? "Pause" : active ? "Resume" : "Listen to";
  const label = `${action} ${title}`;
  const Icon = playing ? Pause : active ? Play : Volume2;
  return <div className={compact ? "mt-3 flex flex-wrap items-center gap-2" : "mt-5 flex flex-wrap items-center gap-3"}>
    <button type="button" disabled={!canSpeak} onClick={() => speech.toggle(id, text)} aria-label={label} title={canSpeak ? label : "Listening is unavailable in this browser"} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-stone-400 px-3 py-2 text-sm font-semibold text-stone-800 transition hover:border-red-900 hover:text-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900 disabled:cursor-not-allowed disabled:opacity-50">
      <Icon aria-hidden="true" className="h-4 w-4" />
      {!compact && <span>{playing ? "Pause story" : active ? "Resume story" : "Listen to this story"}</span>}
    </button>
    {active && <button type="button" onClick={speech.stop} aria-label={`Stop listening to ${title}`} title="Stop listening" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-stone-400 p-2 text-stone-800 hover:border-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900"><Square aria-hidden="true" className="h-3.5 w-3.5" /></button>}
    {!compact && <span className="text-xs text-stone-500">{canSpeak ? "Browser narration · on-site text" : "Listening is unavailable in this browser"}</span>}
    <span role="status" className={state.id === id && state.error ? "basis-full text-sm text-red-900" : "sr-only"}>{state.id === id ? state.error || (active ? `${playing ? "Reading" : "Paused"}: ${title}` : "") : ""}</span>
  </div>;
}
