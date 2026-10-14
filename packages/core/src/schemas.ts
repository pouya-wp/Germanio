import { z } from 'zod';
import { CEFR_LEVELS } from './cefr';
import { GENDERS } from './genus';

/**
 * Contracts shared by brain and every client (web, extension, desktop, vscode, cli).
 * Anything that crosses a process boundary is validated against these.
 */

export const CefrSchema = z.enum(CEFR_LEVELS);
export const GenderSchema = z.enum(GENDERS);

export const DOMAINS = ['alltag', 'it', 'design', 'beruf', 'behoerde', 'pruefung'] as const;
export const DomainSchema = z.enum(DOMAINS);

// ── Dictionary ───────────────────────────────────────────────────────────────

export const FormSchema = z.object({ form: z.string(), tags: z.array(z.string()) });

export const SenseSchema = z.object({
  en: z.array(z.string()),
  fa: z.string().nullable(),
});

export const LexemeSchema = z.object({
  id: z.number().int(),
  lemma: z.string(),
  pos: z.string(),
  gender: GenderSchema.nullable(),
  plural: z.string().nullable(),
  ipa: z.string().nullable(),
  freqRank: z.number().int().nullable(),
  cefr: CefrSchema.nullable(),
  domains: z.array(DomainSchema),
  senses: z.array(SenseSchema),
  forms: z.array(FormSchema),
  /** Compound split for the signature animation, e.g. ["Ausbildungs", "vertrag"]. */
  parts: z.array(z.string()).nullable(),
});
export type Lexeme = z.infer<typeof LexemeSchema>;

export const LookupResultSchema = z.object({
  query: z.string(),
  matches: z.array(LexemeSchema),
  /** Present when the query is an inflected form, e.g. "ging" → gehen (Präteritum). */
  inflection: z.object({ lemma: z.string(), tags: z.array(z.string()) }).nullable(),
});
export type LookupResult = z.infer<typeof LookupResultSchema>;

// ── Cards & reviews ──────────────────────────────────────────────────────────

export const CARD_KINDS = ['recognition', 'production', 'listening', 'genus', 'plural', 'cloze'] as const;
export const CardKindSchema = z.enum(CARD_KINDS);

export const SOURCES = ['web', 'youtube', 'desktop', 'reader', 'podcast', 'messenger', 'manual', 'core', 'kurs'] as const;
export const SourceSchema = z.enum(SOURCES);

export const MemoryStateSchema = z.object({
  due: z.string(),
  stability: z.number(),
  difficulty: z.number(),
  elapsedDays: z.number(),
  scheduledDays: z.number(),
  learningSteps: z.number(),
  reps: z.number(),
  lapses: z.number(),
  state: z.number().int().min(0).max(3),
  lastReview: z.string().nullable(),
});

export const CardSchema = z.object({
  id: z.number().int(),
  lexemeId: z.number().int().nullable(),
  kind: CardKindSchema,
  lemma: z.string(),
  gender: GenderSchema.nullable(),
  sentence: z.string().nullable(),
  sentenceTranslation: z.string().nullable(),
  meaning: z.string(),
  source: SourceSchema,
  sourceUrl: z.string().nullable(),
  memory: MemoryStateSchema,
  createdAt: z.string(),
});
export type Card = z.infer<typeof CardSchema>;

export const ReviewRequestSchema = z.object({
  cardId: z.number().int(),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  durationMs: z.number().int().nonnegative().max(600_000),
});
export type ReviewRequest = z.infer<typeof ReviewRequestSchema>;

export const MineRequestSchema = z.object({
  /** The word the learner selected, possibly inflected. */
  word: z.string().min(1).max(80),
  /** The surrounding sentence — mined cards are always contextual. */
  sentence: z.string().max(600).nullable(),
  source: SourceSchema,
  sourceUrl: z.string().url().nullable(),
  sourceTitle: z.string().max(300).nullable(),
});
export type MineRequest = z.infer<typeof MineRequestSchema>;

// ── Time & notes ─────────────────────────────────────────────────────────────

export const ACTIVITIES = ['review', 'reading', 'listening', 'speaking', 'writing', 'grammar', 'video', 'immersion'] as const;
export const TimeLogSchema = z.object({
  source: SourceSchema,
  activity: z.enum(ACTIVITIES),
  seconds: z.number().int().positive().max(6 * 3600),
  /** Passive time counts, but less: one hour of background audio ≠ one hour of study. */
  active: z.boolean(),
});
export type TimeLog = z.infer<typeof TimeLogSchema>;

export const ZettelSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  body: z.string(),
  kind: z.enum(['rule', 'correction', 'sentence', 'note']),
  links: z.array(z.number().int()),
  createdAt: z.string(),
});
export type Zettel = z.infer<typeof ZettelSchema>;

// ── LLM output contracts (strict-mode compatible: every field required, nullable instead of optional) ──

export const CorrectionSchema = z.object({
  corrected: z.string(),
  errors: z.array(
    z.object({
      original: z.string(),
      correction: z.string(),
      /** Grammar concept id from content/grammar.yaml, e.g. "kasus.dativ.praepositionen". */
      conceptId: z.string(),
      explanationDe: z.string(),
      explanationFa: z.string(),
      severity: z.enum(['minor', 'major']),
    }),
  ),
  /** Grammar concepts used *correctly* in the text — positive evidence for the Fehlerprofil. */
  correctConcepts: z.array(z.string()),
  cefrEstimate: CefrSchema,
  praiseDe: z.string(),
});
export type Correction = z.infer<typeof CorrectionSchema>;

export const GlossSchema = z.object({
  lemma: z.string(),
  fa: z.string(),
  en: z.string(),
  cefr: CefrSchema,
  domains: z.array(DomainSchema),
  exampleDe: z.string(),
  exampleFa: z.string(),
});
export type Gloss = z.infer<typeof GlossSchema>;
