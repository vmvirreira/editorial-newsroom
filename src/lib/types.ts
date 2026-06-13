export type Category = {
  id: string;
  name: string;
  slug: string;
  deck: string;
  sort_order: number;
};

export type Article = {
  id: string;
  category_id: string;
  category_slug: string;
  category_name: string;
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
};

export type ArticleInput = {
  id?: string;
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
};
