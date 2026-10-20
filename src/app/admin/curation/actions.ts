"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStaffSession } from "@/lib/staff";
import { collectSuggestions } from "@/lib/curation/feed";

async function editorSession() {
  const session = await getStaffSession();
  if (!session.supabase || !session.user || session.role !== "editor") throw new Error("Editor access required.");
  return { supabase: session.supabase, user: session.user };
}
export async function refreshSuggestions() {
  try {
    const { supabase } = await editorSession();
    const [{ stories, unavailable }, { data: categories, error }] = await Promise.all([
      collectSuggestions(), supabase.from("newsroom_categories").select("id, slug"),
    ]);
    if (error || !categories) throw new Error("Unable to load categories.");
    if (!stories.length) return { error: "No recent stories were available. Existing suggestions are still saved. Try again later." };
    const categoryIds = new Map(categories.map((category) => [category.slug, category.id]));
    const rows = stories.flatMap(({ category_slug, ...story }) => {
      const category_id = categoryIds.get(category_slug);
      return category_id ? [{ ...story, category_id }] : [];
    });
    const { data, error: saveError } = await supabase.from("newsroom_suggestions").upsert(rows, { onConflict: "source_url", ignoreDuplicates: true }).select("id");
    if (saveError) throw new Error("Unable to save suggestions. Please try again.");
    revalidatePath("/admin/curation");
    return { message: `${data?.length ?? 0} new suggestions added. Previously reviewed stories stay saved.${unavailable.length ? ` Some feeds were unavailable: ${unavailable.join(", ")}.` : ""}` };
  } catch (error) { return { error: error instanceof Error ? error.message : "Unable to refresh sources." }; }
}
export async function reviewSuggestion(id: string, status: "new" | "dismissed") {
  try {
    const { supabase, user } = await editorSession();
    if (!z.uuid().safeParse(id).success || !["new", "dismissed"].includes(status)) throw new Error("Invalid suggestion.");
    const { data, error } = await supabase.from("newsroom_suggestions").update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq("id", id).is("article_id", null).select("id");
    if (error || !data?.length) throw new Error("This suggestion has changed. Refresh the inbox and try again.");
    revalidatePath("/admin/curation");
    return { message: status === "dismissed" ? "Suggestion dismissed." : "Suggestion restored." };
  } catch (error) { return { error: error instanceof Error ? error.message : "Unable to review suggestion." }; }
}
export async function prepareCuratedDraft(id: string) {
  try {
    const { supabase } = await editorSession();
    if (!z.uuid().safeParse(id).success) throw new Error("Invalid suggestion.");
    const { data, error } = await supabase.rpc("newsroom_create_curated_draft", { suggestion_id: id });
    if (error || typeof data !== "string") throw new Error("Unable to prepare this draft. Refresh the inbox and try again.");
    revalidatePath("/admin/curation"); revalidatePath("/admin");
    return { articleId: data };
  } catch (error) { return { error: error instanceof Error ? error.message : "Unable to prepare draft." }; }
}
