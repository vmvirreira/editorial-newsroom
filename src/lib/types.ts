export type StaffRole = "writer" | "editor";
export type ArticleStatus = "draft" | "review" | "published";
export type ContentBlock = { type: "text"; text: string } | { type: "audio" | "video" | "link"; url: string; caption: string };

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
  status: ArticleStatus;
  is_featured: boolean;
  published_at: string;
  updated_at: string;
  owner_id?: string | null;
  position?: number;
  content_blocks?: ContentBlock[];
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
  status: ArticleStatus;
  is_featured: boolean;
  published_at: string;
};
