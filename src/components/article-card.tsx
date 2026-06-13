import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/lib/types";

type ArticleCardProps = {
  article: Article;
  priority?: boolean;
  variant?: "lead" | "compact" | "feature";
};

export function ArticleCard({
  article,
  priority = false,
  variant = "compact",
}: ArticleCardProps) {
  const isLead = variant === "lead";

  return (
    <article
      className={
        isLead
          ? "grid gap-5 border-b border-stone-300 pb-6 lg:grid-cols-[1.2fr_0.8fr]"
          : "border-b border-stone-300 pb-5"
      }
    >
      <Link
        href={`/article/${article.slug}`}
        className={isLead ? "block overflow-hidden bg-stone-200" : "hidden"}
      >
        <Image
          src={article.image_url}
          alt={article.image_alt}
          width={1200}
          height={760}
          priority={priority}
          className="aspect-[1.45] h-full w-full object-cover grayscale-[18%] transition duration-500 hover:scale-[1.02]"
        />
      </Link>
      <div className={isLead ? "flex flex-col justify-center" : ""}>
        <Link
          href={`/category/${article.category_slug}`}
          className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.16em] text-red-900"
        >
          {article.category_name}
        </Link>
        <Link href={`/article/${article.slug}`} className="group">
          <h2
            className={
              isLead
                ? "font-serif text-4xl font-black leading-[0.95] tracking-[-0.035em] text-stone-950 group-hover:text-red-950 sm:text-6xl"
                : "font-serif text-2xl font-bold leading-tight tracking-[-0.02em] text-stone-950 group-hover:text-red-950"
            }
          >
            {article.title}
          </h2>
        </Link>
        <p
          className={
            isLead
              ? "mt-4 max-w-2xl text-lg leading-8 text-stone-700"
              : "mt-2 text-sm leading-6 text-stone-700"
          }
        >
          {article.dek}
        </p>
        <p className="mt-4 text-xs uppercase tracking-[0.14em] text-stone-500">
          By {article.author}
        </p>
      </div>
    </article>
  );
}
