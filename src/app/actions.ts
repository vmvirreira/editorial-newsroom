"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getStaffSession } from "@/lib/staff";
import { articleSchema } from "@/lib/article-validation";

async function requireStaff(editorOnly = false) {
  const session = await getStaffSession();
  if (!session.supabase || !session.user || !session.role) throw new Error("Staff access required.");
  if (editorOnly && session.role !== "editor") throw new Error("Editor access required.");
  return { ...session, supabase: session.supabase, user: session.user };
}
function refreshNewsroom() {
  revalidatePath("/", "layout");
}

export async function signInWithGoogle() {
  if (!hasSupabaseEnv()) redirect("/admin?setup=1");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/admin?setup=1");
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${appUrl}/auth/callback?next=/admin` } });
  if (error || !data.url) redirect("/admin?error=signin");
  redirect(data.url);
}
export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/");
}
export async function saveArticle(_state: { error: string }, formData: FormData): Promise<{ error: string }> {
  try {
    const { supabase, user, role } = await requireStaff();
    const fields = Object.fromEntries(formData);
    const date = new Date(String(fields.published_at));
    const parsed = articleSchema.safeParse({ ...fields, id: fields.id || undefined, published_at: Number.isNaN(date.getTime()) ? "" : date.toISOString(), is_featured: fields.is_featured === "on", content_blocks: JSON.parse(String(fields.content_blocks || "[]")) });
    if (!parsed.success) return { error: parsed.error.issues.map((i) => `${i.path.join(".") || "Article"}: ${i.message}`).join(" ") };
    const { id, ...article } = parsed.data;
    if (role === "writer" && (article.status === "published" || article.is_featured)) return { error: "Editors handle publication and front-page placement. Submit your story for review." };
    if (id) {
      const { data: existing } = await supabase.from("articles").select("id,owner_id,status").eq("id", id).maybeSingle();
      if (!existing || (role === "writer" && (existing.owner_id !== user.id || existing.status === "published"))) return { error: "You can edit only your own unpublished stories." };
      const { error } = await supabase.from("articles").update(article).eq("id", id).select("id").single();
      if (error) return { error: error.code === "23505" ? "That slug is already in use." : "Unable to save. Check permissions and database setup." };
    } else {
      const { error } = await supabase.from("articles").insert({ ...article, owner_id: user.id });
      if (error) return { error: error.code === "23505" ? "That slug is already in use." : "Unable to save. Check permissions and database setup." };
    }
  } catch {
    return { error: "Unable to save. Check your sign-in and content fields." };
  }
  refreshNewsroom();
  redirect("/admin?saved=1");
}
export async function deleteArticle(id: string) {
  try {
    const { supabase } = await requireStaff(true);
    const parsed = z.string().uuid().parse(id);
    const { error } = await supabase.from("articles").delete().eq("id", parsed).select("id").single();
    if (error) return { error: "Unable to delete the story." };
    refreshNewsroom();
    return { error: "" };
  } catch { return { error: "Editor access required to delete stories." }; }
}
export async function moveArticle(id: string, status: string, beforeId: string | null) {
  try {
    const { supabase } = await requireStaff(true);
    const args = z.object({ article_id: z.string().uuid(), target_status: z.enum(["draft", "review", "published"]), before_id: z.string().uuid().nullable() }).parse({ article_id: id, target_status: status, before_id: beforeId });
    const { error } = await supabase.rpc("move_newsroom_article", args);
    if (error) return { error: "Unable to move the story. Refresh the board and try again." };
    refreshNewsroom();
    return { error: "" };
  } catch { return { error: "Editor access required to arrange stories." }; }
}
