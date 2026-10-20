import type { Article } from "../types";

export function storyNarration(article: Pick<Article, "title" | "dek" | "body" | "content_blocks" | "source_name">): string {
  return [article.title, article.source_name ? `Original reporting from ${article.source_name}.` : "", article.dek, article.body,
    ...(article.content_blocks ?? []).flatMap(block => block.type === "text" ? [block.text] : block.caption ? [block.caption] : []),
  ].map(text => text.trim()).filter(Boolean).join("\n\n");
}

// Short utterances avoid browsers cutting off a long story mid-sentence.
export function speechChunks(text: string): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const chunks: string[] = []; let chunk = "";
  for (const word of words) {
    if (chunk && chunk.length + word.length + 1 > 220) { chunks.push(chunk); chunk = ""; }
    if (word.length > 220) {
      if (chunk) { chunks.push(chunk); chunk = ""; }
      for (let index = 0; index < word.length; index += 220) chunks.push(word.slice(index, index + 220));
    } else chunk = chunk ? `${chunk} ${word}` : word;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

type SpeechEngine = Pick<SpeechSynthesis, "cancel" | "speak" | "pause" | "resume">;
type Environment = { engine: SpeechEngine; utterance: (text: string) => SpeechSynthesisUtterance };
export type SpeechState = { id: string | null; status: "idle" | "playing" | "paused"; error: string };
export const IDLE_SPEECH: SpeechState = { id: null, status: "idle", error: "" };

export class StorySpeech {
  private state = IDLE_SPEECH;
  private listeners = new Set<() => void>();
  private generation = 0;
  private environment: Environment | null = null;
  // Keep an active utterance referenced until it finishes (Safari/Chromium).
  private current: SpeechSynthesisUtterance | null = null;
  private getEnvironment: () => Environment;
  constructor(getEnvironment: () => Environment) { this.getEnvironment = getEnvironment; }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.state;
  private update(state: SpeechState) { this.state = state; this.listeners.forEach(listener => listener()); }
  stop = () => {
    this.generation++;
    this.environment?.engine.cancel(); this.current = null;
    this.update(IDLE_SPEECH);
  };
  toggle(id: string, text: string) {
    if (this.state.id === id && this.state.status !== "idle") {
      try {
        if (this.state.status === "playing") { this.environment?.engine.pause(); this.update({ id, status: "paused", error: "" }); }
        else { this.environment?.engine.resume(); this.update({ id, status: "playing", error: "" }); }
      } catch { this.fail(id); }
      return;
    }
    this.stop();
    const chunks = speechChunks(text);
    if (!chunks.length) return;
    const generation = this.generation;
    try {
      this.environment = this.getEnvironment();
      // Cancel clears queued speech, but may leave the browser paused.
      this.environment.engine.cancel(); this.environment.engine.resume();
      this.update({ id, status: "playing", error: "" });
      let index = 0;
      const next = () => {
        if (generation !== this.generation) return;
        if (index >= chunks.length) { this.current = null; this.update(IDLE_SPEECH); return; }
        try {
          const utterance = this.environment!.utterance(chunks[index++]);
          this.current = utterance;
          utterance.onend = next;
          utterance.onerror = () => { if (generation === this.generation) this.fail(id); };
          this.environment!.engine.speak(utterance);
        } catch { if (generation === this.generation) this.fail(id); }
      };
      next();
    } catch { this.fail(id); }
  }
  private fail(id: string) {
    this.generation++; this.environment?.engine.cancel(); this.current = null;
    this.update({ id, status: "idle", error: "Audio could not play. Try again, or try another browser." });
  }
}
