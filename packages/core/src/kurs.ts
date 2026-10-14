import { z } from 'zod';
import { GENDERS } from './genus';

/**
 * Der Weg — the guided course. A unit is one complete lesson ending in a
 * concrete can-do ("Ich kann mich vorstellen."). Content lives in content/kurs.
 */
export const LEVEL_IDS = ['A1.1', 'A1.2', 'A2.1', 'A2.2', 'B1.1', 'B1.2', 'B2.1', 'B2.2'] as const;
export type LevelId = (typeof LEVEL_IDS)[number];

const Bilingual = z.object({ de: z.string(), fa: z.string() });

export const UnitMetaSchema = z.object({
  id: z.string(),
  level: z.enum(LEVEL_IDS),
  title: z.string(),
  fa: z.string(),
  canDo: Bilingual,
  grammar: z.array(z.string()),
});
export type UnitMeta = z.infer<typeof UnitMetaSchema>;

export const CurriculumSchema = z.object({
  levels: z.array(z.object({ id: z.enum(LEVEL_IDS), title: z.string(), fa: z.string(), hours: z.number() })),
  units: z.array(UnitMetaSchema),
});
export type Curriculum = z.infer<typeof CurriculumSchema>;

export const UnitWordSchema = z.object({
  de: z.string(),
  article: z.enum(GENDERS).optional(),
  plural: z.string().optional(),
  fa: z.string(),
  en: z.string(),
  example: Bilingual,
});
export type UnitWord = z.infer<typeof UnitWordSchema>;

export const ExerciseSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('gap'), de: z.string(), answer: z.string(), accept: z.array(z.string()).optional(), fa: z.string() }),
  z.object({ type: z.literal('order'), words: z.array(z.string()), answer: z.string(), fa: z.string() }),
  z.object({ type: z.literal('translate'), fa: z.string(), answer: z.string(), accept: z.array(z.string()) }),
]);
export type Exercise = z.infer<typeof ExerciseSchema>;

export const UnitContentSchema = z.object({
  id: z.string(),
  intro: Bilingual,
  words: z.array(UnitWordSchema).min(4),
  grammar: z.object({
    title: z.string(),
    fa: z.string(),
    table: z.array(z.array(z.string())),
    tableHead: z.array(z.string()),
    examples: z.array(Bilingual),
  }),
  dialogue: z.object({
    title: z.string(),
    fa: z.string(),
    lines: z.array(z.object({ speaker: z.string(), de: z.string(), fa: z.string() })),
  }),
  exercises: z.array(ExerciseSchema),
  speaking: z.object({ fa: z.string(), model: z.string() }),
});
export type UnitContent = z.infer<typeof UnitContentSchema>;

export type UnitStatus = 'done' | 'current' | 'open' | 'locked';

/**
 * Linear by default (a beginner needs one obvious next step), but finished
 * units stay open for repetition and the next one is always reachable.
 */
export function unitStatuses(units: { id: string }[], completed: ReadonlySet<string>): Record<string, UnitStatus> {
  const out: Record<string, UnitStatus> = {};
  let currentAssigned = false;
  for (const u of units) {
    if (completed.has(u.id)) out[u.id] = 'done';
    else if (!currentAssigned) {
      out[u.id] = 'current';
      currentAssigned = true;
    } else out[u.id] = 'locked';
  }
  return out;
}

/** Normalise a sentence for order/translate checks: case, punctuation and spacing don't count. */
export function sentenceKey(s: string): string {
  return s
    .toLocaleLowerCase('de-DE')
    .replace(/[.,!?;:„“"'’()–-]/g, ' ')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ')
    .trim();
}
