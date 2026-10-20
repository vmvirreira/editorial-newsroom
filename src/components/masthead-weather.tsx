"use client";

import Link from "next/link";
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun } from "lucide-react";
import { weatherIconKind } from "@/lib/edition/weather-icon";
import { useLocalWeather, useWeatherZip } from "./weather-state";

const icons = { storm: CloudLightning, snow: CloudSnow, rain: CloudRain, fog: CloudFog, partly: CloudSun, cloud: Cloud, sun: Sun, unknown: CloudSun };
export function MastheadWeather() {
  const zip = useWeatherZip();
  const { result } = useLocalWeather(zip);
  const day = result?.data?.days[0];
  const Icon = icons[weatherIconKind(day?.forecast ?? "")];
  const temperature = day?.high ?? day?.low;
  const label = day && result?.data ? `Today's forecast for ${result.data.place}: ${day.forecast}${temperature != null ? `, ${day.high !== null ? "high" : "low"} ${temperature}°F` : ""}` : !zip ? "Set your ZIP for local weather" : result?.error ? "Weather unavailable. Open local weather to retry." : "Loading local weather";
  return <Link href="/#local-weather" aria-label={label} title={label} className="ml-auto inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-l border-stone-300 pl-4 text-xs font-semibold text-stone-700 hover:text-red-800">
    <Icon aria-hidden="true" className="h-5 w-5" />
    <span>{day ? `Today${temperature != null ? ` ${temperature}°F` : ""}` : !zip ? "Set ZIP" : result?.error ? "Unavailable" : "Weather…"}</span>
  </Link>;
}
