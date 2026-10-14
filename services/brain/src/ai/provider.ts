import type { z } from 'zod';

/**
 * The one seam between Germanio and any language model.
 *
 * Implementations: CodexProvider (ChatGPT subscription via Codex CLI — the
 * default for personal use) and RecordedProvider (fixtures for tests and the
 * public demo). Ollama / OpenAI API / Claude API can be added here without
 * touching any caller.
 */
export interface GenerateRequest<T> {
  /** Stable task name — used for caching, logging and recorded fixtures. */
  task: string;
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  /** Higher effort for exam grading or long-form feedback; low for everything else. */
  effort?: 'low' | 'medium' | 'high';
  signal?: AbortSignal;
}

export interface GenerateResult<T> {
  value: T;
  cached: boolean;
  ms: number;
  tokens: number | null;
}

export interface LLMProvider {
  readonly name: string;
  generate<T>(req: GenerateRequest<T>): Promise<GenerateResult<T>>;
  /** Cheap readiness check for /health (does not spend a model call). */
  status(): Promise<{ ready: boolean; detail: string }>;
}

export class AiError extends Error {
  constructor(
    message: string,
    readonly kind: 'unavailable' | 'invalid-output' | 'timeout' | 'failed' | 'rate-limited',
    /** For 'rate-limited': when the subscription allows calls again. */
    readonly retryAt: Date | null = null,
  ) {
    super(message);
  }
}

/**
 * Parse the subscription's "try again at 5:04 PM" hint into a Date (local time,
 * rolling to tomorrow if the time already passed). Falls back to one hour.
 */
export function parseRetryAt(message: string, now = new Date()): Date {
  const m = message.match(/try again at (\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return new Date(now.getTime() + 3_600_000);
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ampm = m[3]?.toUpperCase();
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  const at = new Date(now);
  at.setHours(h, min, 0, 0);
  if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 1);
  return at;
}
