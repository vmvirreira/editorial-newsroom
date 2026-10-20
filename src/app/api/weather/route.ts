import { getLocalWeather, WeatherError } from "@/lib/edition/weather";
export const maxDuration = 30;
export async function GET(request: Request) {
  const zip=new URL(request.url).searchParams.get("zip") ?? "";
  try{return Response.json(await getLocalWeather(zip),{headers:{"Cache-Control":"public, max-age=300, s-maxage=1800"}});}
  catch(error){return Response.json({error:error instanceof WeatherError ? error.message : "Weather is temporarily unavailable. Try again shortly."},{status:error instanceof WeatherError ? error.status : 503,headers:{"Cache-Control":"no-store"}});}
}
