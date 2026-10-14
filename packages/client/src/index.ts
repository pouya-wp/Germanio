import type {
  Card,
  Correction,
  Forecast,
  Lexeme,
  MineRequest,
  PlanBlock,
  ReviewRequest,
  TimeLog,
  Cefr,
} from '@germanio/core';

/**
 * Typed SDK for the local brain service — shared by web, extension, desktop,
 * VS Code and CLI. Plain fetch, no dependencies, works in browsers, Node and
 * extension service workers.
 */

export const DEFAULT_BRAIN_URL = 'http://127.0.0.1:4317';

export interface LexemeDetail extends Lexeme {
  extra: { genitive?: string; praeteritum?: string; partizip2?: string; aux?: string[]; komparativ?: string; superlativ?: string; pluraleTantum?: boolean };
  paradigm: [string, string[]][] | null;
}

export interface ExampleSentence {
  id: number;
  de: string;
  en: string | null;
  fa: string | null;
  audioUrl: string | null;
  audioAuthor: string | null;
}

export type WordStatus = 'known' | 'learning' | 'new';

export interface LookupResponse {
  query: string;
  matches: LexemeDetail[];
  inflection: { lemma: string; tags: string[] } | null;
  examples: ExampleSentence[];
  status: WordStatus | null;
  gloss: { lemma: string; fa: string; en: string; cefr: Cefr | null; exampleDe: string | null; exampleFa: string | null } | null;
}

export interface Health {
  ok: boolean;
  version: string;
  dictionary: { ready: boolean; built_at?: string; sources?: string };
  ai: { provider: string; ready: boolean; detail: string };
  nachtschicht: { shift: string; processed: number; ms: number; error?: string }[];
}

export interface QueueResponse {
  cards: Card[];
  dueCount: number;
  newRemaining: number;
}

export interface Settings {
  target: Cefr;
  deadline: string;
  minutesPerDay: number;
  newCardsPerDay: number;
  priorHours: number;
}

export interface TodayResponse {
  day: string;
  plan: PlanBlock[];
  dueCount: number;
  newRemaining: number;
  todayHours: number;
  weakConcepts: { id: string; title: string; level: string }[];
}

export interface ForecastResponse extends Omit<Forecast, 'eta'> {
  eta: string | null;
  totalHours: number;
  knownLemmas: number;
  recent: { day: string; hours: number }[];
  settings: Settings;
}

export interface AnalyzedToken {
  text: string;
  start: number;
  end: number;
  lemma: string | null;
  status: WordStatus | 'unknown';
}

export interface MineResponse {
  cards: Card[];
  lexeme: LexemeDetail | null;
  alreadyKnown: boolean;
}

export class BrainError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export interface BrainClient {
  baseUrl: string;
  health(): Promise<Health>;
  lookup(q: string): Promise<LookupResponse>;
  analyze(text: string): Promise<{ tokens: AnalyzedToken[]; coverage: number }>;
  queue(limit?: number): Promise<QueueResponse>;
  review(req: ReviewRequest): Promise<{ card: Card; nextDue: string }>;
  mine(req: MineRequest): Promise<MineResponse>;
  known(): Promise<{ lemmas: string[] }>;
  logTime(entry: TimeLog): Promise<void>;
  today(): Promise<TodayResponse>;
  forecast(): Promise<ForecastResponse>;
  settings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;
  correct(text: string, level?: Cefr, context?: string): Promise<{ correction: Correction; zettelIds: number[] }>;
}

export function createBrainClient(baseUrl: string = DEFAULT_BRAIN_URL, fetchImpl: typeof fetch = fetch): BrainClient {
  const call = async <T>(path: string, init?: { method?: string; body?: unknown; timeoutMs?: number }): Promise<T> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), init?.timeoutMs ?? 10_000);
    try {
      const res = await fetchImpl(`${baseUrl}${path}`, {
        method: init?.method ?? 'GET',
        signal: ctrl.signal,
        ...(init?.body !== undefined
          ? { body: JSON.stringify(init.body), headers: { 'Content-Type': 'application/json' } }
          : {}),
      });
      const data = (await res.json().catch(() => ({}))) as T & { error?: string };
      if (!res.ok) throw new BrainError(data.error ?? res.statusText, res.status);
      return data;
    } catch (e) {
      if (e instanceof BrainError) throw e;
      throw new BrainError(e instanceof Error && e.name === 'AbortError' ? 'brain timeout' : 'brain offline', 0);
    } finally {
      clearTimeout(timer);
    }
  };

  return {
    baseUrl,
    health: () => call('/health'),
    lookup: (q) => call(`/lookup?q=${encodeURIComponent(q)}`),
    analyze: (text) => call('/analyze', { method: 'POST', body: { text } }),
    queue: (limit = 50) => call(`/queue?limit=${limit}`),
    review: (req) => call('/review', { method: 'POST', body: req }),
    mine: (req) => call('/mine', { method: 'POST', body: req }),
    known: () => call('/known'),
    logTime: async (entry) => void (await call('/time', { method: 'POST', body: entry })),
    today: () => call('/today'),
    forecast: () => call('/forecast'),
    settings: () => call('/settings'),
    updateSettings: (patch) => call('/settings', { method: 'PATCH', body: patch }),
    correct: (text, level, context) =>
      call('/correct', { method: 'POST', body: { text, ...(level ? { level } : {}), ...(context ? { context } : {}) }, timeoutMs: 240_000 }),
  };
}
