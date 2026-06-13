import { saveArticle } from "@/app/actions";
import type { Article, Category } from "@/lib/types";

type AdminFormProps = {
  categories: Category[];
  article?: Article;
};

export function AdminForm({ categories, article }: AdminFormProps) {
  const now = new Date().toISOString().slice(0, 16);

  return (
    <form
      action={saveArticle}
      className="grid gap-4 border border-stone-300 bg-white p-5 shadow-sm"
    >
      <input type="hidden" name="id" defaultValue={article?.id} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-stone-800">
          Title
          <input
            required
            name="title"
            defaultValue={article?.title}
            className="border border-stone-300 px-3 py-2 font-normal outline-none focus:border-stone-950"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-stone-800">
          Slug
          <input
            required
            name="slug"
            defaultValue={article?.slug}
            placeholder="story-headline-slug"
            className="border border-stone-300 px-3 py-2 font-normal outline-none focus:border-stone-950"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1 text-sm font-semibold text-stone-800">
          Category
          <select
            required
            name="category_id"
            defaultValue={article?.category_id ?? categories[0]?.id}
            className="border border-stone-300 px-3 py-2 font-normal outline-none focus:border-stone-950"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-stone-800">
          Status
          <select
            name="status"
            defaultValue={article?.status ?? "draft"}
            className="border border-stone-300 px-3 py-2 font-normal outline-none focus:border-stone-950"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-stone-800">
          Publish date
          <input
            required
            type="datetime-local"
            name="published_at"
            defaultValue={
              article?.published_at
                ? new Date(article.published_at).toISOString().slice(0, 16)
                : now
            }
            className="border border-stone-300 px-3 py-2 font-normal outline-none focus:border-stone-950"
          />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-semibold text-stone-800">
        Dek
        <textarea
          required
          name="dek"
          defaultValue={article?.dek}
          rows={2}
          className="border border-stone-300 px-3 py-2 font-normal outline-none focus:border-stone-950"
        />
      </label>
      <label className="grid gap-1 text-sm font-semibold text-stone-800">
        Body
        <textarea
          required
          name="body"
          defaultValue={article?.body}
          rows={9}
          className="border border-stone-300 px-3 py-2 font-normal outline-none focus:border-stone-950"
        />
      </label>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1 text-sm font-semibold text-stone-800">
          Author
          <input
            required
            name="author"
            defaultValue={article?.author}
            className="border border-stone-300 px-3 py-2 font-normal outline-none focus:border-stone-950"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-stone-800 md:col-span-2">
          Image URL
          <input
            required
            type="url"
            name="image_url"
            defaultValue={article?.image_url}
            className="border border-stone-300 px-3 py-2 font-normal outline-none focus:border-stone-950"
          />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-semibold text-stone-800">
        Image alt text
        <input
          required
          name="image_alt"
          defaultValue={article?.image_alt}
          className="border border-stone-300 px-3 py-2 font-normal outline-none focus:border-stone-950"
        />
      </label>
      <label className="inline-flex items-center gap-2 text-sm font-semibold text-stone-800">
        <input
          type="checkbox"
          name="is_featured"
          defaultChecked={article?.is_featured}
          className="h-4 w-4 accent-stone-950"
        />
        Feature on the front page
      </label>
      <button className="w-fit bg-stone-950 px-5 py-2.5 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-red-950">
        Save article
      </button>
    </form>
  );
}
