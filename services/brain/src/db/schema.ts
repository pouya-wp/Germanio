import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import type { MemoryState } from '@germanio/core';

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;

/** Every card is one (lexeme, kind) pair. Memory is FSRS state; `due` is duplicated for indexing. */
export const cards = sqliteTable(
  'cards',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    lexemeId: integer('lexeme_id'),
    kind: text('kind').notNull(),
    lemma: text('lemma').notNull(),
    pos: text('pos').notNull(),
    gender: text('gender'),
    meaning: text('meaning').notNull(),
    sentence: text('sentence'),
    sentenceTranslation: text('sentence_translation'),
    source: text('source').notNull(),
    sourceUrl: text('source_url'),
    memory: text('memory', { mode: 'json' }).$type<MemoryState>().notNull(),
    due: text('due').notNull(),
    suspended: integer('suspended', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull().default(now),
  },
  (t) => [
    index('cards_due').on(t.due),
    uniqueIndex('cards_lemma_pos_kind').on(t.lemma, t.pos, t.kind),
  ],
);

export const reviews = sqliteTable(
  'reviews',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    cardId: integer('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    stateBefore: integer('state_before').notNull(),
    durationMs: integer('duration_ms').notNull(),
    scheduledDays: real('scheduled_days').notNull(),
    reviewedAt: text('reviewed_at').notNull(),
  },
  (t) => [index('reviews_at').on(t.reviewedAt)],
);

/** Stundenzähler: every surface reports time here. `day` is the learner's local date. */
export const timeLogs = sqliteTable(
  'time_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    source: text('source').notNull(),
    activity: text('activity').notNull(),
    seconds: integer('seconds').notNull(),
    active: integer('active', { mode: 'boolean' }).notNull(),
    day: text('day').notNull(),
    at: text('at').notNull().default(now),
  },
  (t) => [index('time_day').on(t.day)],
);

/** Fehlerprofil: BKT estimate per grammar concept. */
export const concepts = sqliteTable('concepts', {
  id: text('id').primaryKey(),
  pKnown: real('p_known').notNull(),
  observations: integer('observations').notNull().default(0),
  updatedAt: text('updated_at').notNull().default(now),
});

export const zettels = sqliteTable('zettels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  body: text('body').notNull(),
  kind: text('kind').notNull(),
  links: text('links', { mode: 'json' }).$type<number[]>().notNull().default(sql`'[]'`),
  createdAt: text('created_at').notNull().default(now),
});

/** Content-addressed cache for AI output — the same prompt never costs twice. */
export const aiCache = sqliteTable('ai_cache', {
  key: text('key').primaryKey(),
  task: text('task').notNull(),
  value: text('value', { mode: 'json' }).notNull(),
  createdAt: text('created_at').notNull().default(now),
});

/** Nachtschicht: persistent background jobs (glossing, stories, podcast scripts …). */
export const jobs = sqliteTable(
  'jobs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    kind: text('kind').notNull(),
    payload: text('payload', { mode: 'json' }).notNull(),
    status: text('status', { enum: ['queued', 'running', 'done', 'failed'] }).notNull().default('queued'),
    attempts: integer('attempts').notNull().default(0),
    runAfter: text('run_after').notNull().default(now),
    error: text('error'),
    createdAt: text('created_at').notNull().default(now),
    finishedAt: text('finished_at'),
  },
  (t) => [index('jobs_status').on(t.status, t.runAfter)],
);

/** Learner-generated glosses (Persian meanings etc.) that extend the read-only dictionary. */
export const glosses = sqliteTable('glosses', {
  lemma: text('lemma').primaryKey(),
  fa: text('fa').notNull(),
  en: text('en').notNull(),
  cefr: text('cefr'),
  domains: text('domains', { mode: 'json' }).$type<string[]>().notNull(),
  exampleDe: text('example_de'),
  exampleFa: text('example_fa'),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull(),
});

/** Lesesaal: texts the learner reads (imported, simplified, or generated stories). */
export const texts = sqliteTable(
  'texts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    body: text('body').notNull(),
    kind: text('kind', { enum: ['import', 'simplified', 'story', 'library'] }).notNull(),
    level: text('level'),
    sourceUrl: text('source_url'),
    parentId: integer('parent_id'),
    /** Words still new at the text's level, with Persian meanings. */
    glossary: text('glossary', { mode: 'json' }).$type<{ de: string; fa: string }[]>().notNull().default(sql`'[]'`),
    /** Share of tokens known when last opened — Krashen's comprehensibility. */
    coverage: real('coverage'),
    createdAt: text('created_at').notNull().default(now),
    readAt: text('read_at'),
  },
  (t) => [index('texts_created').on(t.createdAt)],
);

/** Schreiben: journal entries with their correction. */
export const journal = sqliteTable('journal', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  prompt: text('prompt'),
  text: text('text').notNull(),
  correction: text('correction', { mode: 'json' }),
  createdAt: text('created_at').notNull().default(now),
});

/** Grammatik: generated drill sets per concept, reused until replaced. */
export const drillSets = sqliteTable(
  'drill_sets',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    conceptId: text('concept_id').notNull(),
    data: text('data', { mode: 'json' }).notNull(),
    createdAt: text('created_at').notNull().default(now),
  },
  (t) => [index('drill_sets_concept').on(t.conceptId)],
);

/** Tagesfunk: one personal two-voice episode per learner day. */
export const episodes = sqliteTable('episodes', {
  id: text('id').primaryKey(), // learner day, e.g. 2026-10-14
  title: text('title').notNull(),
  script: text('script', { mode: 'json' }).notNull(),
  audioFile: text('audio_file'),
  duration: real('duration'),
  timings: text('timings', { mode: 'json' }).$type<{ index: number; start: number; end: number }[]>(),
  level: text('level').notNull(),
  createdAt: text('created_at').notNull().default(now),
  listenedAt: text('listened_at'),
});
