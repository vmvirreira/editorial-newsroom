import { formatPublicationTime } from "@/lib/publication-time";

export function PublicationTime({ value, label = "Published" }: { value: string; label?: string }) {
  return <span>{label} <time dateTime={value}>{formatPublicationTime(value)}</time></span>;
}
