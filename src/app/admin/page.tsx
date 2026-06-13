import Link from "next/link";
import { deleteArticle, signInWithGoogle } from "@/app/actions";
import { AdminForm } from "@/components/admin-form";
import { getAllArticlesForAdmin, getCategories } from "@/lib/news";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export default async function AdminPage() {
  const [categories, articles, supabase] = await Promise.all([
    getCategories(),
    getAllArticlesForAdmin(),
    createSupabaseServerClient(),
  ]);

  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  const { data: adminProfile } =
    user && supabase
      ? await supabase
          .from("admin_profiles")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle()
      : { data: null };

  if (!hasSupabaseEnv()) {
    return (
      <main className="min-h-screen bg-[#fbfaf7] px-4 py-10 text-stone-950">
        <section className="mx-auto max-w-3xl border border-stone-300 bg-white p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-900">
            Setup required
          </p>
          <h1 className="mt-3 font-serif text-5xl font-black tracking-[-0.04em]">
            Connect Supabase to enable admin publishing.
          </h1>
          <p className="mt-4 leading-7 text-stone-700">
            Add the Supabase URL and anon key to your environment, run the SQL
            in <code className="font-mono">supabase/schema.sql</code>, enable
            Google as an auth provider, and add your user id to
            <code className="font-mono"> admin_profiles</code>.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block border border-stone-950 px-4 py-2 text-sm font-bold uppercase tracking-[0.12em]"
          >
            Back to site
          </Link>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fbfaf7] px-4 text-stone-950">
        <section className="w-full max-w-xl border border-stone-300 bg-white p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-900">
            Newsroom access
          </p>
          <h1 className="mt-3 font-serif text-5xl font-black tracking-[-0.04em]">
            Sign in with Google
          </h1>
          <p className="mt-4 leading-7 text-stone-700">
            Articles are public to guests, but story maintenance is limited to
            approved admins.
          </p>
          <form action={signInWithGoogle}>
            <button className="mt-6 bg-stone-950 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-red-950">
              Continue with Google
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (!adminProfile) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fbfaf7] px-4 text-stone-950">
        <section className="w-full max-w-xl border border-stone-300 bg-white p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-900">
            Awaiting admin approval
          </p>
          <h1 className="mt-3 font-serif text-5xl font-black tracking-[-0.04em]">
            You are signed in, but not on the admin list.
          </h1>
          <p className="mt-4 break-all leading-7 text-stone-700">
            Add this user id to <code className="font-mono">admin_profiles</code>:{" "}
            {user.id}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbfaf7] px-4 py-8 text-stone-950">
      <section className="mx-auto grid max-w-7xl gap-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-950 pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-900">
              Admin
            </p>
            <h1 className="font-serif text-5xl font-black tracking-[-0.045em]">
              Newsroom Desk
            </h1>
          </div>
          <Link
            href="/"
            className="border border-stone-950 px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] transition hover:bg-stone-950 hover:text-white"
          >
            View site
          </Link>
        </div>
        <AdminForm categories={categories} />
        <section className="grid gap-4">
          <h2 className="font-serif text-3xl font-black tracking-[-0.03em]">
            Existing stories
          </h2>
          <div className="grid gap-3">
            {articles.map((article) => (
              <div
                key={article.id}
                className="grid gap-3 border border-stone-300 bg-white p-4 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-900">
                    {article.category_name} / {article.status}
                  </p>
                  <h3 className="font-serif text-2xl font-bold">
                    {article.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-stone-600">
                    {article.dek}
                  </p>
                </div>
                <form action={deleteArticle} className="self-start">
                  <input type="hidden" name="id" value={article.id} />
                  <button className="border border-red-900 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-red-900 transition hover:bg-red-900 hover:text-white">
                    Delete
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
