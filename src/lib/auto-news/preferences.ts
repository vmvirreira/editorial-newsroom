import { cookies } from "next/headers";
import { newsView, type NewsView } from "./mode";
export async function requestedNewsView(value?: unknown): Promise<NewsView> {
  return newsView(value) ?? newsView((await cookies()).get("bb-news-view")?.value) ?? "smart";
}
