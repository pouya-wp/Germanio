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

// ── Lesesaal ─────────────────────────────────────────────────────────────────

export const ReaderTextSchema = z.object({
  title: z.string(),
  body: z.string(),
  /** Up to 12 words the learner probably doesn't know yet, with Persian meanings. */
  glossary: z.array(z.object({ de: z.string(), fa: z.string() })),
});
export type ReaderText = z.infer<typeof ReaderTextSchema>;

/** Rewrite any German text to comprehensible input (i+1) for the learner's level. */
export async function simplifyText(ai: LLMProvider, input: { text: string; level: Cefr }): Promise<ReaderText> {
  const { value } = await ai.generate({
    task: 'simplify',
    effort: 'medium',
    system: `You rewrite German texts as graded readers. ${LEARNER}
Target level: ${input.level}. Keep the meaning, the facts and the tone; shorten long sentences,
replace rare words with frequent ones, keep the text natural German (never "Simple German" baby talk).
Aim for 95–98% of words being known at ${input.level} (i+1). Keep paragraphs separated by a blank line.
Return a short German title, the rewritten body, and a glossary of up to 12 words that are still new at this level.`,
    prompt: input.text.slice(0, 12_000),
    schema: ReaderTextSchema,
  });
  return value;
}

/** "Geschichten aus deinem Wortschatz": a story built from known words plus a few target words. */
export async function writeStory(
  ai: LLMProvider,
  input: { level: Cefr; topic: string; known: string[]; targets: string[] },
): Promise<ReaderText> {
  const { value } = await ai.generate({
    task: 'story',
    effort: 'medium',
    system: `You write short, genuinely interesting German stories for one learner. ${LEARNER}
Level: ${input.level}. Length: 180–300 words, 4–6 short paragraphs, natural dialogue welcome.
Use mainly words from the learner's known vocabulary. Use EVERY target word at least twice, in clear context.
Setting ideas: life in Germany, an Ausbildung (IT or media design), a WG, Berufsschule, colleagues, small everyday wins.`,
    prompt: `Topic: ${input.topic}
Target words: ${input.targets.join(', ')}
Known vocabulary (sample): ${input.known.slice(0, 400).join(', ')}`,
    schema: ReaderTextSchema,
  });
  return value;
}

// ── Grammatik ────────────────────────────────────────────────────────────────

export const DrillSetSchema = z.object({
  explanationDe: z.string(),
  explanationFa: z.string(),
  /** A compact rule table or pattern, plain text, one rule per line. */
  pattern: z.string(),
  items: z.array(
    z.object({
      /** Sentence with exactly one gap written as "___". */
      prompt: z.string(),
      answer: z.string(),
      /** Other accepted answers (spelling variants, synonyms that are equally correct). */
      alternatives: z.array(z.string()),
      hintFa: z.string(),
      explanationDe: z.string(),
    }),
  ),
});
export type DrillSet = z.infer<typeof DrillSetSchema>;

export async function grammarDrills(
  ai: LLMProvider,
  input: { conceptId: string; title: string; level: Cefr; known: string[]; mistakes: string[] },
): Promise<DrillSet> {
  const { value } = await ai.generate({
    task: 'drills',
    effort: 'medium',
    system: `You are a German grammar coach. ${LEARNER}
Concept: ${input.title} (${input.conceptId}), learner level ${input.level}.
Give a 2–3 sentence explanation in simple German and the same in Persian, a compact pattern/table,
and 10 gap-fill items (exactly one "___" gap each) that isolate this concept, progressing from easy to harder.
Use everyday and Ausbildung contexts. Prefer the learner's known words. Answers are short (1–3 words).`,
    prompt: `Known words (sample): ${input.known.slice(0, 200).join(', ')}
Recent mistakes on this concept: ${input.mistakes.slice(0, 5).join(' | ') || 'none yet'}`,
    schema: DrillSetSchema,
  });
  return value;
}

// ── Tagesfunk ────────────────────────────────────────────────────────────────

export const EpisodeScriptSchema = z.object({
  title: z.string(),
  summaryFa: z.string(),
  segments: z.array(z.object({ speaker: z.enum(['Lena', 'Jonas']), text: z.string() })),
  vocabulary: z.array(z.object({ de: z.string(), fa: z.string() })),
});
export type EpisodeScript = z.infer<typeof EpisodeScriptSchema>;

/** A short two-host radio show built from today's headlines, at the learner's level. */
export async function episodeScript(
  ai: LLMProvider,
  input: { level: Cefr; headlines: { title: string; description: string }[]; targets: string[]; day: string },
): Promise<EpisodeScript> {
  const { value } = await ai.generate({
    task: 'tagesfunk',
    effort: 'medium',
    system: `You write "Tagesfunk", a personal 5-minute German radio show for one learner. ${LEARNER}
Hosts: Lena (warm, curious) and Jonas (calm, a bit funny). Level: ${input.level} — speak in short, clear sentences
at this level, natural spoken German, du-Form with the listener.
Structure: greeting with the date → 3 news topics explained simply (in your own words, never copied) →
one short "Wort des Tages" segment explaining one target word → a tiny tip for life or Ausbildung in Germany → goodbye.
Weave EVERY target word in at least twice. 30–50 segments, each one or two sentences.
Also give a Persian summary (2–3 sentences) and a vocabulary list of up to 10 key words with Persian meanings.`,
    prompt: `Date: ${input.day}
Target words: ${input.targets.join(', ') || '(none yet)'}
Headlines:
${input.headlines.map((h) => `- ${h.title}: ${h.description}`).join('\n')}`,
    schema: EpisodeScriptSchema,
  });
  return value;
}
