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

export interface TextSummary {
  id: number;
  title: string;
  kind: 'import' | 'simplified' | 'story' | 'library';
  level: Cefr | null;
  coverage: number | null;
  sourceUrl: string | null;
  createdAt: string;
  readAt: string | null;
}

export interface TextDetail extends TextSummary {
  body: string;
  parentId: number | null;
  glossary: { de: string; fa: string }[];
  tokens: AnalyzedToken[];
}

export interface JournalEntry {
  id: number;
  prompt: string | null;
  text: string;
  correction: Correction | null;
  createdAt: string;
}

export interface Zettel {
  id: number;
  title: string;
  body: string;
  kind: 'rule' | 'correction' | 'sentence' | 'note';
  links: number[];
  createdAt: string;
}

export interface GrammarNode {
  id: string;
  title: string;
  level: Cefr;
  requires: string[];
  pKnown: number | null;
}

export interface DrillSet {
  explanationDe: string;
  explanationFa: string;
  pattern: string;
  items: { prompt: string; answer: string; alternatives: string[]; hintFa: string; explanationDe: string }[];
}

export interface EpisodeSummary {
  id: string;
  title: string;
  duration: number | null;
  level: Cefr;
  createdAt: string;
  listenedAt: string | null;
  audioFile: string | null;
}

export interface Episode extends EpisodeSummary {
  script: {
    title: string;
    summaryFa: string;
    segments: { speaker: 'Lena' | 'Jonas'; text: string }[];
    vocabulary: { de: string; fa: string }[];
  };
  timings: { index: number; start: number; end: number }[] | null;
}

export class BrainError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Set when the learner's AI subscription is rate-limited (HTTP 429). */
    readonly retryAt: string | null = null,
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
  texts(): Promise<{ texts: TextSummary[] }>;
  text(id: number): Promise<TextDetail>;
  importText(input: { title: string; body: string } | { url: string }): Promise<TextSummary>;
  simplify(id: number, level?: Cefr): Promise<TextSummary>;
  story(topic: string, level?: Cefr): Promise<TextSummary>;
  journal(): Promise<{ entries: JournalEntry[] }>;
  write(text: string, prompt?: string | null): Promise<{ id: number; correction: Correction; zettelIds: number[] }>;
  zettels(): Promise<{ zettels: Zettel[] }>;
  grammar(): Promise<{ nodes: GrammarNode[] }>;
  drills(conceptId: string, fresh?: boolean): Promise<{ id: number; set: DrillSet }>;
  answer(setId: number, index: number, given: string): Promise<{ correct: boolean; answer: string; explanationDe: string; pKnown: number }>;
  episodes(): Promise<{ episodes: EpisodeSummary[] }>;
  episode(id: string): Promise<Episode>;
  produceEpisode(): Promise<{ id: string }>;
  listened(id: string, seconds: number): Promise<void>;
  /** URL of a brain-served audio resource (episode audio, Piper TTS). */
  audioUrl(path: string): string;
  ttsUrl(text: string, voice?: 'thorsten' | 'kerstin'): string;
}

/** AI-backed calls go through the learner's subscription and can take a while. */
const AI = 240_000;

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
      const data = (await res.json().catch(() => ({}))) as T & { error?: string; retryAt?: string | null };
      if (!res.ok) throw new BrainError(data.error ?? res.statusText, res.status, data.retryAt ?? null);
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
      call('/correct', { method: 'POST', body: { text, ...(level ? { level } : {}), ...(context ? { context } : {}) }, timeoutMs: AI }),
    texts: () => call('/texts'),
    text: (id) => call(`/texts/${id}`),
    importText: (input) => call('/texts', { method: 'POST', body: input, timeoutMs: 30_000 }),
    simplify: (id, level) => call(`/texts/${id}/simplify`, { method: 'POST', body: level ? { level } : {}, timeoutMs: AI }),
    story: (topic, level) => call('/stories', { method: 'POST', body: { topic, ...(level ? { level } : {}) }, timeoutMs: AI }),
    journal: () => call('/journal'),
    write: (text, prompt) => call('/journal', { method: 'POST', body: { text, prompt: prompt ?? null }, timeoutMs: AI }),
    zettels: () => call('/zettels'),
    grammar: () => call('/grammar'),
    drills: (conceptId, fresh) => call(`/grammar/${encodeURIComponent(conceptId)}/drills${fresh ? '?fresh=1' : ''}`, { timeoutMs: AI }),
    answer: (setId, index, given) => call('/grammar/answer', { method: 'POST', body: { setId, index, given } }),
    episodes: () => call('/tagesfunk'),
    episode: (id) => call(`/tagesfunk/${id}`),
    produceEpisode: () => call('/tagesfunk', { method: 'POST', timeoutMs: 20 * 60_000 }),
    listened: async (id, seconds) => void (await call(`/tagesfunk/${id}/listened`, { method: 'POST', body: { seconds } })),
    audioUrl: (path) => `${baseUrl}${path}`,
    ttsUrl: (text, voice = 'thorsten') => `${baseUrl}/tts?voice=${voice}&text=${encodeURIComponent(text)}`,
  };
}
