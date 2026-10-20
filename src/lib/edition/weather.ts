export type ForecastPeriod = { startTime: string; isDaytime: boolean; temperature: number; temperatureUnit: string; shortForecast: string; probabilityOfPrecipitation?: { value: number | null } };
export type WeatherDay = { date: string; high: number | null; low: number | null; forecast: string; precipitation: number | null };
export type LocalWeather = { zip: string; place: string; timezone: string; days: WeatherDay[]; updatedAt: string; sourceUrl: string };
export class WeatherError extends Error { status: number; constructor(message: string,status=503){super(message);this.status=status;} }
export function validZip(value: unknown): value is string { return typeof value === "string" && /^\d{5}$/.test(value); }
export function groupForecast(periods: ForecastPeriod[]): WeatherDay[] {
  const days=new Map<string,WeatherDay>();
  for(const period of periods){
    if(typeof period.startTime!=="string" || !/^\d{4}-\d{2}-\d{2}T/.test(period.startTime) || !Number.isFinite(period.temperature) || period.temperatureUnit!=="F")continue;
    const date=period.startTime.slice(0,10);
    const day=days.get(date) ?? {date,high:null,low:null,forecast:period.shortForecast || "Forecast unavailable",precipitation:null};
    if(period.isDaytime){day.high=period.temperature;day.forecast=period.shortForecast || day.forecast;}else day.low=period.temperature;
    const chance=period.probabilityOfPrecipitation?.value;
    if(typeof chance==="number" && chance>=0 && chance<=100)day.precipitation=Math.max(day.precipitation ?? 0,chance);
    days.set(date,day);
  }
  return [...days.values()].slice(0,7);
}
export function safeForecastUrl(value: unknown): string | null {
  if(typeof value!=="string")return null;
  try{const url=new URL(value);return url.protocol==="https:" && url.hostname==="api.weather.gov" && !url.port && !url.username && !url.password && !url.search && !url.hash && /^\/gridpoints\/[A-Z]{3}\/\d+,\d+\/forecast$/.test(url.pathname) ? url.toString() : null;}catch{return null;}
}
async function json(url: string, revalidate: number) {
  const response=await fetch(url,{signal:AbortSignal.timeout(7000),redirect:"error",headers:{Accept:"application/geo+json, application/json","User-Agent":"BriefAndBeyond/1.0 (https://editorial-newsroom.vercel.app)"},next:{revalidate}});
  if(!response.ok){if(response.status===404)throw new WeatherError("That ZIP or its forecast could not be found. Try another US ZIP.",404);throw new WeatherError("Weather is temporarily unavailable. Please try again shortly.");}
  return response.json();
}
export async function getLocalWeather(zip: string): Promise<LocalWeather> {
  if(!validZip(zip))throw new WeatherError("Enter a five-digit US ZIP code.",400);
  const location=await json(`https://api.zippopotam.us/us/${zip}`,86400);
  const place=location.places?.[0];const latitude=Number(place?.latitude),longitude=Number(place?.longitude);
  if(!place || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude)>90 || Math.abs(longitude)>180)throw new WeatherError("Location data is unavailable for this ZIP.");
  const point=await json(`https://api.weather.gov/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`,86400);
  const forecastUrl=safeForecastUrl(point.properties?.forecast);
  if(!forecastUrl)throw new WeatherError("A National Weather Service forecast is unavailable for this location.");
  const forecast=await json(forecastUrl,1800);
  const days=groupForecast(Array.isArray(forecast.properties?.periods)?forecast.properties.periods:[]);
  if(!days.length)throw new WeatherError("The forecast is temporarily unavailable. Try again shortly.");
  return {zip,place:`${String(place["place name"]).slice(0,80)}, ${String(place["state abbreviation"]).slice(0,10)}`,timezone:point.properties?.timeZone || "America/New_York",days,updatedAt:forecast.properties?.updated || new Date().toISOString(),sourceUrl:`https://forecast.weather.gov/MapClick.php?lat=${latitude}&lon=${longitude}`};
}
