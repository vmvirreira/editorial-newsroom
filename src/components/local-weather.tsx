"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { CloudSun, MapPin } from "lucide-react";
import { validZip, type LocalWeather } from "@/lib/edition/weather";
const STORAGE_KEY="brief-beyond.weather-zip.v1";
let sessionZip: string | null = null;
function savedZip(){if(sessionZip!==null)return sessionZip;try{const value=window.localStorage.getItem(STORAGE_KEY);return validZip(value)?value:"";}catch{return "";}}
function subscribe(listener:()=>void){const onStorage=(event:StorageEvent)=>{if(event.key===STORAGE_KEY || event.key===null){sessionZip=null;listener();}};window.addEventListener("storage",onStorage);window.addEventListener("brief-weather-zip",listener);return()=>{window.removeEventListener("storage",onStorage);window.removeEventListener("brief-weather-zip",listener);};}
function rememberZip(zip: string){sessionZip=zip;try{if(zip)window.localStorage.setItem(STORAGE_KEY,zip);else window.localStorage.removeItem(STORAGE_KEY);}catch{}window.dispatchEvent(new Event("brief-weather-zip"));}
export function LocalWeatherPanel(){
  const zip=useSyncExternalStore(subscribe,savedZip,()=>"");
  const [result,setResult]=useState<{zip:string;data?:LocalWeather;error?:string}|null>(null);
  const [revision,setRevision]=useState(0);
  const [inputError,setInputError]=useState("");
  useEffect(()=>{
    if(!zip)return;
    const controller=new AbortController();
    fetch(`/api/weather?zip=${zip}`,{signal:controller.signal}).then(async response=>{
      const data=await response.json();if(!response.ok)throw new Error(data.error || "Weather could not be loaded.");return data;
    }).then(data=>setResult({zip,data})).catch(error=>{if(!controller.signal.aborted)setResult({zip,error:error instanceof Error?error.message:"Weather could not be loaded."});});
    return()=>controller.abort();
  },[zip,revision]);
  const current=result?.zip===zip?result:null;
  const data=current?.data;
  return <section aria-label="Local weather" className="min-w-0 border border-stone-300 bg-white p-5 sm:p-6">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-red-900">Your local outlook</p><h2 className="mt-2 font-serif text-3xl font-bold">Weather, today & this week</h2></div><CloudSun aria-hidden="true" className="h-7 w-7 shrink-0 text-stone-500"/></div>
    <form onSubmit={event=>{event.preventDefault();const value=String(new FormData(event.currentTarget).get("zip") || "").trim();if(!validZip(value)){setInputError("Enter a five-digit US ZIP code.");return;}setInputError("");setResult(null);rememberZip(value);setRevision(value=>value+1);}} className="mt-4 flex flex-wrap items-end gap-2">
      <label className="grid gap-1 text-xs font-semibold">US ZIP code<input key={zip} name="zip" aria-label="US ZIP code" required inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{5}" maxLength={5} defaultValue={zip} placeholder="e.g. 10001" className="min-h-11 w-36 border border-stone-400 bg-white px-3 py-2 text-base font-normal text-stone-950"/></label>
      <button type="submit" className="min-h-11 border border-stone-950 bg-stone-950 px-4 py-2 text-sm font-bold text-white">Show weather</button>
      {zip && <button type="button" onClick={()=>{rememberZip("");setInputError("");setResult(null);}} className="min-h-11 px-2 text-xs underline">Forget ZIP</button>}
    </form>
    <p className="mt-2 text-xs leading-5 text-stone-500">Your ZIP is remembered on this device. No account needed.</p>
    {inputError && <p role="alert" className="mt-3 text-sm text-red-900">{inputError}</p>}
    {!zip && <p className="mt-5 text-sm leading-6 text-stone-600">Enter a US ZIP to see today’s forecast and the next seven days.</p>}
    {zip && !current && <p role="status" className="mt-5 text-sm text-stone-600">Loading the forecast for {zip}…</p>}
    {current?.error && <p role="alert" className="mt-5 text-sm leading-6 text-red-900">{current.error} <button type="button" className="font-bold underline" onClick={()=>{setResult(null);setRevision(value=>value+1);}}>Retry</button></p>}
    {data && <div className="mt-5">
      <p className="flex items-center gap-1 text-sm font-semibold"><MapPin aria-hidden="true" className="h-4 w-4"/>{data.place} · {zip}</p>
      <ol aria-label="Seven-day forecast" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">{data.days.map((day,index)=><li key={day.date} className={`min-w-0 border p-3 ${index===0?"border-red-900 bg-red-50/40":"border-stone-200 bg-stone-50"}`}>
        <p className="text-xs font-bold">{index===0?"Today":new Date(day.date+"T12:00:00Z").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",timeZone:"UTC"})}</p>
        <p className="mt-2 text-sm font-semibold">{day.high!==null?`High ${day.high}°F`:""}{day.high!==null&&day.low!==null?" · ":""}{day.low!==null?`Low ${day.low}°F`:""}</p>
        <p className="mt-1 text-xs leading-5 text-stone-600">{day.forecast}</p>{day.precipitation!==null && <p className="mt-1 text-xs text-stone-500">Precipitation {day.precipitation}%</p>}
      </li>)}</ol>
      <p className="mt-3 text-xs leading-5 text-stone-500">Daily forecast · °F. <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">National Weather Service ↗</a> · ZIP lookup: <a href="https://www.zippopotam.us/" target="_blank" rel="noopener noreferrer" className="underline">Zippopotam.us / GeoNames</a></p>
    </div>}
  </section>;
}
