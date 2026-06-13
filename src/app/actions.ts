"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";

const articleSchema = z.object({
  id: z.string().optional(),
  category_id: z.string().min(1),
  title: z.string().min(3),
  slug: z
    .string()
    .min(3)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  dek: z.string().min(10),
  body: z.string().min(50),
  author: z.string().min(2),
  image_url: z.string().url(),
  image_alt: z.string().min(3),
  status: z.enum(["draft", "published"]),
  is_featured: z.boolean(),
  published_at: z.string().min(1),
});

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin");

  const { data } = await supabase
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) throw new Error("This account is not an admin.");
  return supabase;
}

export async function signInWithGoogle() {
  if (!hasSupabaseEnv()) redirect("/admin?setup=1");

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/admin?setup=1");

  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appUrl}/auth/callback?next=/admin`,
    },
  });

  if (error || !data.url) throw new Error(error?.message ?? "Sign-in failed.");
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/");
}

export async function saveArticle(formData: FormData) {
  const supabase = await requireAdmin();

  const parsed = articleSchema.parse({
    id: formData.get("id")?.toString() || undefined,
    category_id: formData.get("category_id")?.toString(),
    title: formData.get("title")?.toString(),
    slug: formData.get("slug")?.toString(),
    dek: formData.get("dek")?.toString(),
    body: formData.get("body")?.toString(),
    author: formData.get("author")?.toString(),
    image_url: formData.get("image_url")?.toString(),
    image_alt: formData.get("image_alt")?.toString(),
    status: formData.get("status")?.toString(),
    is_featured: formData.get("is_featured") === "on",
    published_at: formData.get("published_at")?.toString(),
  });

  const { error } = await supabase.from("articles").upsert({
    ...parsed,
    published_at: new Date(parsed.published_at).toISOString(),
  });

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/article/${parsed.slug}`);
  redirect("/admin?saved=1");
}

export async function deleteArticle(formData: FormData) {
  const supabase = await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) throw new Error("Missing article id.");

  const { error } = await supabase.from("articles").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/admin");
}
