import { desc, eq } from 'drizzle-orm';
import { answersMatch, type Cefr, type ConceptNode, type Correction } from '@germanio/core';
import { correctText, DrillSetSchema, grammarDrills, type DrillSet } from '../ai/tasks';
import type { LLMProvider } from '../ai/provider';
import type { LearnerDb } from '../db/learner';
import { drillSets, journal } from '../db/schema';
import { NotFound, type Learner } from './learner';

/**
 * Output practice: the Tagebuch (writing with correction) and Grammatik drills.
 * Both feed the Fehlerprofil — every corrected error and every drill answer is
 * evidence for one grammar concept.
 */
export class Studio {
  constructor(
    private readonly db: LearnerDb,
    private readonly learner: Learner,
    private readonly ai: LLMProvider,
    private readonly grammar: ConceptNode[],
  ) {}

  // ── Schreiben ────────────────────────────────────────────────────────────

  journal(limit = 30) {
    return this.db.select().from(journal).orderBy(desc(journal.createdAt)).limit(limit).all();
  }

  async write(input: { text: string; prompt?: string | null; level?: Cefr }): Promise<{ id: number; correction: Correction; zettelIds: number[] }> {
    const level = input.level ?? this.learner.level();
    const correction = await correctText(this.ai, {
      text: input.text,
      level,
      conceptIds: this.grammar.map((n) => n.id),
      ...(input.prompt ? { context: input.prompt } : {}),
    });
    const { zettelIds } = this.learner.applyCorrection(input.text, correction);
    const row = this.db.insert(journal).values({ text: input.text, prompt: input.prompt ?? null, correction }).returning().get();
    // Writing time: ~20 characters per minute at A2 is a fair, conservative estimate.
    this.learner.logTime({ source: 'manual', activity: 'writing', seconds: Math.max(60, Math.round((input.text.length / 20) * 60)), active: true });
    return { id: row.id, correction, zettelIds };
  }

  // ── Grammatik ────────────────────────────────────────────────────────────

  concept(id: string): ConceptNode {
    const node = this.grammar.find((n) => n.id === id);
    if (!node) throw new NotFound(`concept ${id}`);
    return node;
  }

  /** The current drill set for a concept; generated on first use or when `fresh` is asked for. */
  async drills(conceptId: string, fresh = false): Promise<{ id: number; set: DrillSet }> {
    const node = this.concept(conceptId);
    if (!fresh) {
      const existing = this.db.select().from(drillSets).where(eq(drillSets.conceptId, conceptId)).orderBy(desc(drillSets.id)).get();
      const parsed = existing ? DrillSetSchema.safeParse(existing.data) : null;
      if (existing && parsed?.success) return { id: existing.id, set: parsed.data };
    }
    const set = await grammarDrills(this.ai, {
      conceptId,
      title: node.title,
      level: this.learner.level(),
      known: this.learner.knownLemmas(),
      mistakes: this.learner.mistakesFor(conceptId),
    });
    const row = this.db.insert(drillSets).values({ conceptId, data: set }).returning().get();
    return { id: row.id, set };
  }

  /** Check one drill answer locally (no AI) and update the concept's BKT estimate. */
  answer(input: { setId: number; index: number; given: string }): { correct: boolean; answer: string; explanationDe: string; pKnown: number } {
    const row = this.db.select().from(drillSets).where(eq(drillSets.id, input.setId)).get();
    if (!row) throw new NotFound(`drill set ${input.setId}`);
    const set = DrillSetSchema.parse(row.data);
    const item = set.items[input.index];
    if (!item) throw new NotFound(`drill item ${input.index}`);
    const correct = [item.answer, ...item.alternatives].some((a) => answersMatch(input.given, a));
    const pKnown = this.learner.observeConcept(row.conceptId, correct);
    this.learner.logTime({ source: 'manual', activity: 'grammar', seconds: 20, active: true });
    return { correct, answer: item.answer, explanationDe: item.explanationDe, pKnown };
  }
}
