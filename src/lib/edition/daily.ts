import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDailyPools } from "./daily-feeds";
import { editionDate, selectDailyItems } from "./daily-model";

export async function getDailyEdition() {
  const date=editionDate();
  const [pools,supabase]=await Promise.all([getDailyPools(date),createSupabaseServerClient()]);
  const result=supabase ? await supabase.from("newsroom_daily_picks").select("item").eq("edition_date",date) : null;
  const overrides=result?.error ? [] : (result?.data ?? []).map(row=>row.item);
  return { date, pools, selections:selectDailyItems(date,pools,overrides), overridesUnavailable:Boolean(result?.error) };
}
