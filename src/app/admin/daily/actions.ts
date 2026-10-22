"use server";
import { revalidatePath } from "next/cache";
import { getStaffSession } from "@/lib/staff";
import { getDailyPools } from "@/lib/edition/daily-feeds";
import { DAILY_KINDS, editionDate, type DailyKind } from "@/lib/edition/daily-model";

export async function chooseDailyItem(date: string, kind: DailyKind, id: string | null) {
  try {
    const {supabase,user,role}=await getStaffSession();
    if (!supabase || !user || role!=="editor") return {error:"Editor access required."};
    if (date!==editionDate() || !DAILY_KINDS.includes(kind) || (id!==null && (typeof id!=="string" || id.length>300))) return {error:"The daily edition has changed. Reload this page and try again."};
    if(id===null){
      const {error}=await supabase.from("newsroom_daily_picks").delete().eq("edition_date",date).eq("kind",kind);
      if(error)throw error;
    }else{
      // Look up the server's current feed; never publish an arbitrary client-supplied item.
      const pools=await getDailyPools(date);const item=pools[kind].find(item=>item.id===id);
      if(!item)return {error:"That selection is no longer available. Reload the choices."};
      const {error}=await supabase.from("newsroom_daily_picks").upsert({edition_date:date,kind,item,updated_at:new Date().toISOString()},{onConflict:"edition_date,kind"});
      if(error)throw error;
    }
    revalidatePath("/");revalidatePath("/admin/daily");
    return {error:"",message:id===null ? "Automatic selection restored for today." : "Today’s selection updated on the site."};
  }catch{return {error:"Unable to update this selection. Please try again."};}
}
