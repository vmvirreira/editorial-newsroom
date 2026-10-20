"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { LoaderCircle, Pause, Play, Square, Volume2 } from "lucide-react";
import { IDLE_SPEECH, selectSpeechVoice, StorySpeech } from "@/lib/speech/story-speech";

const SpeechContext = createContext<StorySpeech | null>(null);
const subscribeSupport = () => () => {};
const supported = () => typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
const unsupportedOnServer = () => false;
const serverState = () => IDLE_SPEECH;

export function StorySpeechProvider({ children }: { children: React.ReactNode }) {
  const [speech] = useState(() => new StorySpeech(() => ({
    engine: window.speechSynthesis,
    utterance: text => {
      const utterance = new SpeechSynthesisUtterance(text);
      const pageLanguage = document.documentElement.lang || "en";
      const language = navigator.language.split("-")[0] === pageLanguage.split("-")[0] ? navigator.language : pageLanguage;
      const voice = selectSpeechVoice(window.speechSynthesis.getVoices(), language);
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang || language;
      utterance.volume = 1;
      return utterance;
    },
  })));
  const pathname = usePathname();
  useEffect(() => {
    // Ask early so iOS has time to load its voice list before the first tap.
    const warmVoices = () => { window.speechSynthesis?.getVoices(); };
    warmVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", warmVoices);
    const stop = () => speech.stop();
    window.addEventListener("pagehide", stop);
    return () => { window.speechSynthesis?.removeEventListener("voiceschanged", warmVoices); window.removeEventListener("pagehide", stop); speech.stop(); };
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
  const starting = active && state.status === "starting";
  const action = starting ? "Starting audio for" : playing ? "Pause" : active ? "Resume" : "Listen to";
  const label = `${action} ${title}`;
  const Icon = starting ? LoaderCircle : playing ? Pause : active ? Play : Volume2;
  return <div className={compact ? "mt-3 flex flex-wrap items-center gap-2" : "mt-5 flex flex-wrap items-center gap-3"}>
    <button type="button" disabled={!canSpeak || starting} onClick={() => speech.toggle(id, text)} aria-label={label} title={canSpeak ? label : "Listening is unavailable in this browser"} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-stone-400 px-3 py-2 text-sm font-semibold text-stone-800 transition hover:border-red-900 hover:text-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900 disabled:cursor-not-allowed disabled:opacity-50">
      <Icon aria-hidden="true" className={`h-4 w-4 ${starting ? "animate-spin" : ""}`} />
      {!compact && <span>{starting ? "Starting audio…" : playing ? "Pause story" : active ? "Resume story" : "Listen to this story"}</span>}
    </button>
    {active && <button type="button" onClick={speech.stop} aria-label={`Stop listening to ${title}`} title="Stop listening" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-stone-400 p-2 text-stone-800 hover:border-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900"><Square aria-hidden="true" className="h-3.5 w-3.5" /></button>}
    {!compact && <span className="text-xs text-stone-500">{canSpeak ? "Browser narration · on-site text" : "Listening is unavailable in this browser"}</span>}
    {!compact && <details className="basis-full text-xs text-stone-600"><summary className="w-fit cursor-pointer underline">No sound on iPhone?</summary><p className="mt-2 max-w-xl leading-5">Turn Silent Mode off, raise media volume, and tap Listen again. If opened inside another app, try opening this page in Safari.</p></details>}
    <span role="status" className={state.id === id && state.error ? "basis-full text-sm text-red-900" : "sr-only"}>{state.id === id ? state.error || (active ? `${starting ? "Starting audio" : playing ? "Reading" : "Paused"}: ${title}` : "") : ""}</span>
  </div>;
}
