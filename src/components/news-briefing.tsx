import { getPublishedArticles } from "@/lib/news";
import { newsBriefing } from "@/lib/speech/narration";
import type { Article } from "@/lib/types";
import { BriefingListen } from "./briefing-listen";

export async function NewsBriefing({ articles }: { articles?: Article[] }) {
  const briefing = newsBriefing(articles ?? await getPublishedArticles());
  return <BriefingListen text={briefing.text} count={briefing.count} />;
}
