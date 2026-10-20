import { z } from "zod";

export const httpUrl = z.string().url().max(2048).refine((url) => /^https?:\/\//i.test(url), "Use an HTTP or HTTPS URL.");
export const contentBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string().trim().min(1).max(50000) }),
  ...(["audio", "video", "link", "explainer"] as const).map((type) => z.object({ type: z.literal(type), url: httpUrl, caption: z.string().max(500).default("") })),
]);
export const articleSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid(),
  title: z.string().trim().min(3).max(300),
  slug: z.string().min(3).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  dek: z.string().trim().min(10).max(2000),
  body: z.string().max(100000).default(""),
  author: z.string().trim().min(2).max(200),
  image_url: z.union([httpUrl, z.literal("")]),
  image_alt: z.string().max(500),
  status: z.enum(["draft", "review", "published"]),
  is_featured: z.boolean(),
  published_at: z.string().datetime(),
  content_blocks: z.array(contentBlockSchema).max(100),
}).refine((article) => article.body.trim().length > 0 || article.content_blocks.length > 0, { message: "Add text or at least one content block." })
.refine((article) => !article.image_url || article.image_alt.trim().length > 0, { message: "Add alt text for the cover image." });
