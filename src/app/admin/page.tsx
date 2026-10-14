import { StaffLogin } from "@/components/staff-login";
import Link from "next/link";
import { signOut } from "@/app/actions";
import { AdminForm } from "@/components/admin-form";
import { NewsroomBoard } from "@/components/newsroom-board";
import { getAllArticlesForAdmin, getCategories } from "@/lib/news";
import { getStaffSession } from "@/lib/staff";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ edit?: string; saved?: string; error?: string }> }) {
  const query = await searchParams;
  const { supabase, user, role } = await getStaffSession();
  if (!supabase || !user || !role) return <main className="grid min-h-screen place-items-center bg-[#fbfaf7] px-4 text-stone-950">
    <section className="grid w-full max-w-xl gap-5 border border-stone-300 bg-white p-8">
      <p className="text-xs font-bold uppercase tracking-widest text-red-900">Newsroom access</p>
      <h1 className="font-serif text-4xl font-black">{!supabase ? "The newsroom is being connected." : !user ? "Sign in to the newsroom" : "Awaiting staff access"}</h1>
      <p className="leading-7 text-stone-700">{!supabase ? "Staff publishing will be available once setup is complete." : !user ? "Approved writers create stories and submit them for review. Editors review, publish, and arrange coverage." : "Your account is signed in. The site owner needs to grant you writer or editor access before you can work on stories."}</p>
      {query.error && <p role="alert" className="text-red-900">Sign-in failed. Please try again.</p>}
      {supabase && !user && <StaffLogin />}
      {user && <><p className="break-all text-sm">Signed in as {user.email}</p><p className="break-all text-xs text-stone-500">Account ID: {user.id}</p><form action={signOut}><button className="underline">Sign out</button></form></>}
      <Link href="/" className="underline">Back to site</Link>
    </section>
  </main>;
  const [categories, articles] = await Promise.all([getCategories(), getAllArticlesForAdmin(role === "writer" ? user.id : undefined)]);
  const selected = query.edit ? articles.find((article) => article.id === query.edit) : undefined;
  const canEdit = selected && (role === "editor" || (selected.owner_id === user.id && selected.status !== "published"));
  return <main className="min-h-screen bg-[#fbfaf7] px-4 py-8 text-stone-950">
    <section className="mx-auto grid max-w-7xl gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-950 pb-5">
        <div><p className="text-xs font-bold uppercase tracking-widest text-red-900">{role} · {user.email}</p><h1 className="font-serif text-5xl font-black">Newsroom Desk</h1></div>
        <div className="flex gap-4"><Link href="/" className="underline">View site</Link><form action={signOut}><button className="underline">Sign out</button></form></div>
      </div>
      {query.saved && <p role="status" className="border border-green-800 p-3 text-green-900">Article saved.</p>}
      <NewsroomBoard articles={articles} role={role} />
      <section className="grid gap-4">
        <div className="flex items-center gap-4"><h2 className="font-serif text-3xl font-bold">{canEdit ? "Edit story" : "New story"}</h2>{query.edit && <Link href="/admin" className="underline">New story</Link>}</div>
        {query.edit && !canEdit && <p role="alert" className="text-red-900">This story is unavailable for editing.</p>}
        <AdminForm key={canEdit ? selected.id : "new"} categories={categories} role={role} article={canEdit ? selected : undefined} />
      </section>
    </section>
  </main>;
}
