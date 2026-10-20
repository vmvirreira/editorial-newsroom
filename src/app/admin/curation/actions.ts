"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStaffSession } from "@/lib/staff";
import { wikipediaUrl } from "@/lib/curation/wikipedia";
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
    const { data, error: saveError } = await supabase.rpc("newsroom_refresh_source_previews", { items: rows });
    if (saveError) throw new Error("Unable to save suggestions. Please try again.");
    revalidatePath("/admin/curation");
    return { message: `${data ?? 0} new suggestions added. Source previews refreshed. Previously reviewed stories stay saved.${unavailable.length ? ` Some feeds were unavailable: ${unavailable.join(", ")}.` : ""}` };
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
export async function prepareCuratedDraft(id: string, brief: string, topics: { title: string; url: string }[] = []) {
  try {
    const { supabase } = await editorSession();
    if (!z.uuid().safeParse(id).success) throw new Error("Invalid suggestion.");
    const input = z.object({ brief:z.string().trim().min(10).max(2000), topics:z.array(z.object({ title:z.string().trim().min(1).max(200), url:z.string().refine(url => wikipediaUrl(url) !== null) })).max(4) }).safeParse({brief,topics});
    if (!input.success) throw new Error("Add a summary of 10–2000 characters and choose up to four valid Wikipedia links.");
    const { data, error } = await supabase.rpc("newsroom_prepare_brief", { suggestion_id: id, brief:input.data.brief, explainers:input.data.topics });
    if (error || typeof data !== "string") throw new Error("Unable to prepare this draft. Refresh the inbox and try again.");
    revalidatePath("/admin/curation"); revalidatePath("/admin");
    return { articleId: data };
  } catch (error) { return { error: error instanceof Error ? error.message : "Unable to prepare draft." }; }
}

export async function suggestBackgroundLinks(headline: string) {
  try {
    const session = await getStaffSession();
    if (!session.user || !session.role) throw new Error("Staff access required.");
    const title = z.string().trim().min(3).max(300).parse(headline);
    const { suggestWikipedia } = await import("@/lib/curation/wikipedia");
    const result = await suggestWikipedia(title);
    return { topics: result.topics, message: result.unavailable ? "Some Wikipedia lookups were unavailable. You can retry or add links manually." : result.topics.length ? "Open each page to check the match, then select the topics you want." : "No clear matches. Try a specific person, place, or concept." };
  } catch { return { topics: [], error: "Unable to suggest background links. Check your sign-in and try again." }; }
}
