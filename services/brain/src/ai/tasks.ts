import { z } from 'zod';
import { CorrectionSchema, GlossSchema, type Cefr, type Correction, type Gloss } from '@germanio/core';
import type { LLMProvider } from './provider';

/**
 * Prompt library. Each task is small, schema-bound and cacheable. Persian
 * output targets an Iranian learner; German explanations stay at or below
 * the learner's level so feedback is itself comprehensible input.
 */

const LEARNER = `The learner is Pouya, a native Persian (Farsi) speaker who also reads English,
preparing for a German Ausbildung (Fachinformatiker or Mediengestalter).`;

export const GlossBatchSchema = z.object({ items: z.array(GlossSchema) });

/** Batch glossing — one call for many lemmas amortises the fixed per-call overhead. */
export async function glossBatch(
  ai: LLMProvider,
  lemmas: { lemma: string; pos: string; gender: string | null; en: string[] }[],
): Promise<Gloss[]> {
  const { value } = await ai.generate({
    task: 'gloss-batch',
    system: `You are a precise German–Persian lexicographer. ${LEARNER}
For each German lemma give:
- fa: the most common Persian meaning(s), natural modern Persian, max 6 words, separated by "؛".
- en: a short English gloss.
- cefr: the CEFR level at which this word is typically learned (Goethe/telc word lists as reference).
- domains: zero or more of alltag, it, design, beruf, behoerde, pruefung.
- exampleDe: one short, natural example sentence at the word's CEFR level (max 12 words).
- exampleFa: its Persian translation.
Keep the lemma exactly as given.`,
    prompt: lemmas
      .map((l) => `- ${l.gender ? `${l.gender} ` : ''}${l.lemma} (${l.pos}) — ${l.en.slice(0, 2).join('; ')}`)
      .join('\n'),
    schema: GlossBatchSchema,
  });
  return value.items;
}

/** Writing correction with a typed error taxonomy that feeds the Fehlerprofil. */
export async function correctText(
  ai: LLMProvider,
  input: { text: string; level: Cefr; conceptIds: string[]; context?: string },
): Promise<Correction> {
  const { value } = await ai.generate({
    task: 'correct',
    effort: 'medium',
    system: `You are a warm but exact German teacher. ${LEARNER}
Learner level: ${input.level}.
Correct the learner's German text minimally — keep their voice, fix only real errors
(grammar, word order, gender, case, spelling, clearly wrong word choice).
For each error give the original span, the correction, the grammar concept id, a one-sentence
explanation in simple German (at or below ${input.level}) and the same explanation in Persian.
Use one of these concept ids when it fits, otherwise invent a short dotted id:
${input.conceptIds.join(', ')}
Also list concept ids the learner used correctly (positive evidence).
Give one genuine sentence of praise in German.`,
    prompt: `${input.context ? `Context: ${input.context}\n\n` : ''}Text:\n"""\n${input.text}\n"""`,
    schema: CorrectionSchema,
  });
  return value;
}
