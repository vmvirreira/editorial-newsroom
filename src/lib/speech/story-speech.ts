export { storyNarration } from "./narration.ts";

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

export function selectSpeechVoice(voices: SpeechSynthesisVoice[], language: string): SpeechSynthesisVoice | undefined {
  const normalized = language.toLowerCase().replaceAll("_", "-");
  const primary = normalized.split("-")[0];
  const matching = voices.filter(voice => voice.lang.toLowerCase().replaceAll("_", "-").split("-")[0] === primary);
  return matching.find(voice => voice.localService && voice.lang.toLowerCase() === normalized)
    ?? matching.find(voice => voice.localService && voice.default)
    ?? matching.find(voice => voice.localService)
    ?? matching.find(voice => voice.default)
    ?? matching[0];
}

type SpeechEngine = Pick<SpeechSynthesis, "cancel" | "speak" | "pause" | "resume"> & { readonly paused?: boolean };
type Environment = { engine: SpeechEngine; utterance: (text: string) => SpeechSynthesisUtterance };
export type SpeechState = { id: string | null; status: "idle" | "starting" | "playing" | "paused"; error: string };
export const IDLE_SPEECH: SpeechState = { id: null, status: "idle", error: "" };

type StartupTimer = { schedule: (callback: () => void) => unknown; clear: (handle: unknown) => void };
const browserTimer: StartupTimer = {
  schedule: callback => setTimeout(callback, 8000),
  clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
};
export class StorySpeech {
  private state = IDLE_SPEECH;
  private listeners = new Set<() => void>();
  private generation = 0;
  private environment: Environment | null = null;
  // Keep all queued utterances alive; Safari can lose unreferenced utterances.
  private queue: SpeechSynthesisUtterance[] = [];
  private startupHandle: unknown = null;
  private getEnvironment: () => Environment;
  private timer: StartupTimer;
  constructor(getEnvironment: () => Environment, timer: StartupTimer = browserTimer) {
    this.getEnvironment = getEnvironment; this.timer = timer;
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.state;
  private update(state: SpeechState) { this.state = state; this.listeners.forEach(listener => listener()); }
  private clearStartup() {
    if (this.startupHandle !== null) { this.timer.clear(this.startupHandle); this.startupHandle = null; }
  }
  stop = () => {
    this.generation++; this.clearStartup();
    // Avoid cancel/resume before first speech: iOS may leave the engine silent.
    const hadQueue = this.queue.length > 0; this.queue = [];
    if (hadQueue) this.environment?.engine.cancel();
    this.update(IDLE_SPEECH);
  };
  toggle(id: string, text: string) {
    if (this.state.id === id && this.state.status !== "idle") {
      if (this.state.status === "starting") return;
      try {
        if (this.state.status === "playing") { this.environment?.engine.pause(); this.update({ id, status: "paused", error: "" }); }
        else { this.environment?.engine.resume(); this.update({ id, status: "playing", error: "" }); }
      } catch { this.fail(id); }
      return;
    }
    const wasPaused = this.state.status === "paused";
    this.stop();
    const chunks = speechChunks(text);
    if (!chunks.length) return;
    const generation = this.generation;
    try {
      this.environment = this.getEnvironment();
      this.update({ id, status: "starting", error: "" });
      this.startupHandle = this.timer.schedule(() => {
        if (generation === this.generation && this.state.status === "starting") this.fail(id);
      });
      this.queue = chunks.map((chunk, index) => {
        const utterance = this.environment!.utterance(chunk);
        utterance.onstart = () => {
          if (generation !== this.generation) return;
          this.clearStartup();
          if (this.state.status === "starting") this.update({ id, status: "playing", error: "" });
        };
        utterance.onend = () => {
          if (generation !== this.generation || index !== chunks.length - 1) return;
          this.clearStartup(); this.queue = []; this.update(IDLE_SPEECH);
        };
        utterance.onerror = () => { if (generation === this.generation) this.fail(id); };
        return utterance;
      });
      // Enqueue synchronously inside the tap. iOS may reject speak() from a
      // later onend callback because it is outside the user gesture.
      for (const utterance of this.queue) {
        if (generation !== this.generation) break;
        this.environment.engine.speak(utterance);
      }
      if (generation === this.generation && (wasPaused || this.environment.engine.paused)) this.environment.engine.resume();
    } catch { this.fail(id); }
  }
  private fail(id: string) {
    this.generation++; this.clearStartup(); this.queue = [];
    this.environment?.engine.cancel();
    this.update({ id, status: "idle", error: "Narration did not start or was interrupted. Tap Listen to retry. On iPhone, check Silent Mode and media volume, or try Safari." });
  }
}
