import { articleTextParts } from "@/lib/text/article-text";

export function ArticleText({ text, inline = false }: { text: string; inline?: boolean }) {
  return <span className={inline ? "[overflow-wrap:anywhere]" : "whitespace-pre-line [overflow-wrap:anywhere]"}>
    {articleTextParts(text).map((part, index) => part.href ? <a key={index} href={part.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-red-900">{part.text}</a> : part.text)}
  </span>;
}
