"use client";
import { useSyncExternalStore } from "react";
const currentSecond = () => new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();
const noSubscription = () => () => {};
function subscribe(listener: () => void) {
  const timer = window.setInterval(listener, 1000);
  document.addEventListener("visibilitychange", listener);
  return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", listener); };
}
export function MastheadClock({ initialIso }: { initialIso: string }) {
  const iso = useSyncExternalStore(subscribe, currentSecond, () => initialIso);
  const local = useSyncExternalStore(noSubscription, () => true, () => false);
  const date = new Date(iso);
  const timeZone = local ? undefined : "UTC";
  const zone = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName:"short" }).formatToParts(date).find(part=>part.type==="timeZoneName")?.value ?? "UTC";
  return <time dateTime={iso} aria-live="off" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-5 sm:text-xs">
    <span>{date.toLocaleDateString("en-US", {weekday:"short",month:"long",day:"numeric",year:"numeric",timeZone})}</span>
    <span className="whitespace-nowrap font-mono font-bold tabular-nums text-stone-900">{date.toLocaleTimeString("en-US", {hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false,timeZone})} <span className="font-sans font-normal text-stone-500">{zone}</span></span>
  </time>;
}
