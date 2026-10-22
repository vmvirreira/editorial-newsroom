export function publicationInputValue(value: string): string {
  return new Date(value).toISOString().slice(0, 16);
}

export function resolvePublicationTime(input: string, previous?: string, now = new Date().toISOString()): string {
  const value = input.trim();
  if (!value) return previous ?? now;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Enter a valid publication date and time in UTC.");
  // The form edits minutes; retain stored seconds when that field is unchanged.
  if (previous && publicationInputValue(previous) === value) return previous;
  const date = new Date(`${value}:00.000Z`);
  if (!Number.isFinite(date.getTime()) || publicationInputValue(date.toISOString()) !== value) throw new Error("Enter a valid publication date and time in UTC.");
  return date.toISOString();
}

export function formatPublicationTime(value: string): string {
  return `${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC" }).format(new Date(value))} UTC`;
}
