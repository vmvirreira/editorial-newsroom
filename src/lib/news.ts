import { unstable_noStore as noStore } from "next/cache";
import { demoArticles, demoCategories } from "./demo-data";
import { createSupabaseServerClient } from "./supabase/server";
import type { Article, Category, ContentBlock, ArticleStatus } from "./types";

type ArticleRow = {
  id: string;
  category_id: string;
  title: string;
  slug: string;
  dek: string;
  body: string;
  author: string;
  image_url: string;
  image_alt: string;
  status: ArticleStatus;
  source_name: string | null;
  source_url: string | null;
  source_published_at: string | null;
  owner_id: string | null;
  position: number;
  content_blocks: ContentBlock[];
  is_featured: boolean;
  published_at: string;
  updated_at: string;
  categories: { name: string; slug: string } | null;
};

function mapArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    source_name: row.source_name,
    source_url: row.source_url,
    source_published_at: row.source_published_at,
    owner_id: row.owner_id,
    position: row.position,
    content_blocks: row.content_blocks,
    category_id: row.category_id,
    category_name: row.categories?.name ?? "News",
    category_slug: row.categories?.slug ?? "news",
    title: row.title,
    slug: row.slug,
    dek: row.dek,
    body: row.body,
    author: row.author,
    image_url: row.image_url,
    image_alt: row.image_alt,
    status: row.status,
    is_featured: row.is_featured,
    published_at: row.published_at,
    updated_at: row.updated_at,
  };
}

export async function getCategories(): Promise<Category[]> {
  noStore();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return demoCategories;

  const { data, error } = await supabase
    .from("newsroom_categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw new Error("Unable to load categories. Check the database setup.");
  return data as Category[];
}

export async function getPublishedArticles(): Promise<Article[]> {
  noStore();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return demoArticles;

  const { data, error } = await supabase
    .from("newsroom_articles")
    .select("*, categories:newsroom_categories(name, slug)")
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("position", { ascending: true })
    .order("published_at", { ascending: false });

  if (error) throw new Error("Unable to load articles. Check the database setup.");
  return (data as ArticleRow[]).map(mapArticle);
}

export async function getAllArticlesForAdmin(ownerId?: string): Promise<Article[]> {
  noStore();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return demoArticles;

  let query = supabase.from("newsroom_articles").select("*, categories:newsroom_categories(name, slug)");
  if (ownerId) query = query.eq("owner_id", ownerId);
  const { data, error } = await query
    .order("position", { ascending: true })
    .order("published_at", { ascending: false });

  if (error) throw new Error("Unable to load the newsroom. Check the database setup.");
  return ((data ?? []) as ArticleRow[]).map(mapArticle);
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const articles = await getPublishedArticles();
  return articles.find((article) => article.slug === slug) ?? null;
}

export async function getCategoryBySlug(slug: string) {
  const categories = await getCategories();
  return categories.find((category) => category.slug === slug) ?? null;
}

export async function getArticlesByCategory(slug: string) {
  const articles = await getPublishedArticles();
  return articles.filter((article) => article.category_slug === slug);
}
