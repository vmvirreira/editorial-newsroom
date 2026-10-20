"use client";

import { useEffect, useSyncExternalStore } from "react";
import { validZip, type LocalWeather } from "@/lib/edition/weather";

const STORAGE_KEY = "brief-beyond.weather-zip.v1";
let sessionZip: string | null = null;
export function savedZip() {
  if (sessionZip !== null) return sessionZip;
  try { const value = window.localStorage.getItem(STORAGE_KEY); return validZip(value) ? value : ""; } catch { return ""; }
}
function subscribeZip(listener: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key === STORAGE_KEY || event.key === null) { sessionZip = null; listener(); } };
  window.addEventListener("storage", onStorage);
  window.addEventListener("brief-weather-zip", listener);
  return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("brief-weather-zip", listener); };
}
export function rememberZip(zip: string) {
  sessionZip = zip;
  try { if (zip) window.localStorage.setItem(STORAGE_KEY, zip); else window.localStorage.removeItem(STORAGE_KEY); } catch {}
  window.dispatchEvent(new Event("brief-weather-zip"));
}
export function useWeatherZip() { return useSyncExternalStore(subscribeZip, savedZip, () => ""); }

type WeatherResult = { data?: LocalWeather; error?: string; loadedAt: number };
const results = new Map<string, WeatherResult>();
const pending = new Set<string>();
const listeners = new Set<() => void>();
function subscribeWeather(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function notify() { for (const listener of listeners) listener(); }
function loadWeather(zip: string, force = false) {
  if (!validZip(zip) || pending.has(zip)) return;
  const cached = results.get(zip);
  if (!force && cached && Date.now() - cached.loadedAt < (cached.error ? 60000 : 300000)) return;
  pending.add(zip);
  fetch(`/api/weather?zip=${zip}`).then(async response => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Weather could not be loaded.");
    results.set(zip, { data, loadedAt: Date.now() });
  }).catch(error => {
    results.set(zip, { error: error instanceof Error ? error.message : "Weather could not be loaded.", loadedAt: Date.now() });
  }).finally(() => { pending.delete(zip); notify(); });
}
export function useLocalWeather(zip: string) {
  const result = useSyncExternalStore(subscribeWeather, () => results.get(zip) ?? null, () => null);
  useEffect(() => {
    if (!zip) return;
    loadWeather(zip);
    const timer = window.setInterval(() => loadWeather(zip), 300000);
    const refresh = () => loadWeather(zip);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [zip]);
  return { result, refresh: () => loadWeather(zip, true) };
}
