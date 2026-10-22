"use client";

import { useActionState, useState } from "react";
import { ContentEditor } from "./content-editor";
import { saveArticle } from "@/app/actions";
import type { Article, Category, StaffRole } from "@/lib/types";

type AdminFormProps = {
  categories: Category[];
  article?: Article;
  role: StaffRole;
  publicationValue?: string;
};

export function AdminForm({ categories, article, role, publicationValue = "" }: AdminFormProps) {
  const [state, action, pending] = useActionState(saveArticle, { error: "" });
  const [headline, setHeadline] = useState(article?.title ?? "");


  return (
    <form
      action={action}
      className="grid gap-4 border border-stone-300 bg-white p-5 shadow-sm"
    >
      {article?.source_url && <p className="border border-stone-300 bg-stone-50 p-3 text-sm leading-6">Curated from {article.source_name}. <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="underline">Read the original report ↗</a>. Review the headline and add your own context before publishing. Source attribution stays with this story.</p>}
      <input type="hidden" name="id" defaultValue={article?.id} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-stone-800">
          Title
          <input
            required
            name="title"
            value={headline}
            onChange={event => setHeadline(event.target.value)}
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
            <option value="review">Ready for review</option>
            {role === "editor" && <option value="published">Published</option>}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-stone-800">
          Publication date and time (UTC)
          <input
            type="datetime-local"
            name="published_at"
            defaultValue={publicationValue}
            className="border border-stone-300 px-3 py-2 font-normal outline-none focus:border-stone-950"
          />
          <span className="text-xs font-normal leading-5 text-stone-500">Leave blank to use the time you publish. A future date schedules a published story.</span>
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
          name="image_alt"
          defaultValue={article?.image_alt}
          className="border border-stone-300 px-3 py-2 font-normal outline-none focus:border-stone-950"
        />
      </label>
      <ContentEditor initialBlocks={article?.content_blocks} headline={headline} />
      {role === "editor" && <label className="inline-flex items-center gap-2 text-sm font-semibold text-stone-800">
        <input
          type="checkbox"
          name="is_featured"
          defaultChecked={article?.is_featured}
          className="h-4 w-4 accent-stone-950"
        />
        Feature on the front page
      </label>}
      {state.error && <p role="alert" className="text-sm text-red-900">{state.error}</p>}
      <button disabled={pending} className="w-fit bg-stone-950 px-5 py-2.5 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-red-950">
        {pending ? "Saving…" : "Save article"}
      </button>
    </form>
  );
}
