import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/staff";
import { getDailyEdition } from "@/lib/edition/daily";
import { DailyEditor } from "@/components/daily-editor";

export default async function DailyPage(){
  const {user,role}=await getStaffSession();if(!user || role!=="editor")redirect("/admin");
  const {date,pools,selections,overridesUnavailable}=await getDailyEdition();
  return <main className="min-h-screen bg-[#fbfaf7] px-4 py-8 text-stone-950"><div className="mx-auto grid max-w-6xl gap-6"><header className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-950 pb-5"><div><p className="text-xs font-bold uppercase tracking-widest text-red-900">Editor desk · Daily edition · {date} UTC</p><h1 className="mt-2 font-serif text-4xl font-bold">Beyond the Brief</h1></div><Link href="/admin" className="underline">Back to newsroom</Link></header>{overridesUnavailable && <p role="alert" className="text-sm text-red-900">Saved selections could not be loaded. Automatic choices are shown; please reload before changing a selection.</p>}<DailyEditor date={date} pools={pools} selections={selections} disabled={overridesUnavailable} /></div></main>;
}
