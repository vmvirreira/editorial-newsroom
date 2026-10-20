import { getReadingBreak } from "@/lib/edition/reading";
export async function GET() {
  const data=await getReadingBreak();
  return Response.json(data,{headers:{"Cache-Control":data.fallback ? "public, max-age=60, s-maxage=60" : "public, max-age=300, s-maxage=3600"}});
}
