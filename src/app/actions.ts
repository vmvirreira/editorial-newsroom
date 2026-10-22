"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/staff";
import { articleSchema } from "@/lib/article-validation";
import { resolvePublicationTime } from "@/lib/publication-time";

async function requireStaff(editorOnly = false) {
  const session = await getStaffSession();
  if (!session.supabase || !session.user || !session.role) throw new Error("Staff access required.");
  if (editorOnly && session.role !== "editor") throw new Error("Editor access required.");
  return { ...session, supabase: session.supabase, user: session.user };
}
function refreshNewsroom() {
  revalidatePath("/", "layout");
}

export async function requestEmailSignIn(_state: { error: string; sent: boolean }, formData: FormData) {
  const email = z.string().trim().email().safeParse(formData.get("email"));
  if (!email.success) return { error: "Enter a valid email address.", sent: false };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Staff sign-in is being configured.", sent: false };
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const { error } = await supabase.auth.signInWithOtp({ email: email.data, options: { emailRedirectTo: `${appUrl}/auth/callback` } });
  if (error) return { error: "Unable to send a sign-in email. Please wait before trying again.", sent: false };
  return { error: "", sent: true };
}
export async function verifyEmailSignIn(_state: { error: string }, formData: FormData): Promise<{ error: string }> {
  const parsed = z.object({ email: z.string().trim().email(), token: z.string().trim().regex(/^[0-9]{6,10}$/) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter the email address and code from your sign-in email." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Staff sign-in is being configured." };
  const { error } = await supabase.auth.verifyOtp({ ...parsed.data, type: "email" });
  if (error) return { error: "This code is invalid or expired. Request a new sign-in email." };
  redirect("/admin");
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
    const articleId = fields.id ? z.string().uuid().parse(fields.id) : undefined;
    let existing: { owner_id: string | null; status: string; published_at: string } | null = null;
    if (articleId) {
      const result = await supabase.from("newsroom_articles").select("owner_id,status,published_at").eq("id", articleId).maybeSingle();
      if (result.error || !result.data) return { error: "This story is unavailable. Refresh the newsroom and try again." };
      existing = result.data;
      if (role === "writer" && (existing.owner_id !== user.id || existing.status === "published")) return { error: "You can edit only your own unpublished stories." };
    }
    const publishedAt = resolvePublicationTime(String(fields.published_at ?? ""), existing?.status === "published" || String(fields.published_at ?? "").trim() ? existing?.published_at : undefined);
    const parsed = articleSchema.safeParse({ ...fields, id: fields.id || undefined, published_at: publishedAt, is_featured: fields.is_featured === "on", content_blocks: JSON.parse(String(fields.content_blocks || "[]")) });
    if (!parsed.success) return { error: parsed.error.issues.map((i) => `${i.path.join(".") || "Article"}: ${i.message}`).join(" ") };
    const { id, ...article } = parsed.data;
    if (role === "writer" && (article.status === "published" || article.is_featured)) return { error: "Editors handle publication and front-page placement. Submit your story for review." };
    const { error } = await supabase.rpc("save_newsroom_article", { article_id: id ?? null, fields: article });
    if (error) return { error: error.code === "23505" ? "That slug is already in use." : "Unable to save. Refresh the newsroom and try again." };
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
    const { error } = await supabase.from("newsroom_articles").delete().eq("id", parsed).select("id").single();
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
