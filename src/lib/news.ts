import { unstable_noStore as noStore } from "next/cache";
import { demoArticles, demoCategories } from "./demo-data";
import { createSupabaseServerClient } from "./supabase/server";
import type { Article, Category } from "./types";

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
  status: "draft" | "published";
  is_featured: boolean;
  published_at: string;
  updated_at: string;
  categories: { name: string; slug: string } | null;
};

function mapArticle(row: ArticleRow): Article {
  return {
    id: row.id,
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
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error || !data?.length) return demoCategories;
  return data as Category[];
}

export async function getPublishedArticles(): Promise<Article[]> {
  noStore();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return demoArticles;

  const { data, error } = await supabase
    .from("articles")
    .select("*, categories(name, slug)")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error || !data?.length) return demoArticles;
  return (data as ArticleRow[]).map(mapArticle);
}

export async function getAllArticlesForAdmin(): Promise<Article[]> {
  noStore();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return demoArticles;

  const { data, error } = await supabase
    .from("articles")
    .select("*, categories(name, slug)")
    .order("updated_at", { ascending: false });

  if (error) return [];
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
