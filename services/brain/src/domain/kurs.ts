import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eq, isNotNull } from 'drizzle-orm';
import {
  CurriculumSchema,
  Rating,
  UnitContentSchema,
  unitStatuses,
  type Curriculum,
  type UnitContent,
  type UnitMeta,
} from '@germanio/core';
import type { LearnerDb } from '../db/learner';
import { glosses, unitProgress } from '../db/schema';
import { NotFound, type Learner } from './learner';

export interface UnitResult {
  /** Exercises answered correctly on the first try / total. */
  score: number;
  /** Per word: answered correctly in the lesson's checks. */
  words: Record<string, boolean>;
  /** Per grammar concept: correct / attempted in the exercises. */
  grammar: Record<string, { correct: number; total: number }>;
  seconds: number;
}

/**
 * Der Weg — the guided course from zero to B2. The course decides *what* to
 * learn next; FSRS (via the cards each unit creates) decides *when to repeat*.
 */
export class Kurs {
  readonly curriculum: Curriculum;

  constructor(
    private readonly db: LearnerDb,
    private readonly learner: Learner,
    private readonly contentDir: string,
  ) {
    this.curriculum = CurriculumSchema.parse(JSON.parse(readFileSync(join(contentDir, 'curriculum.json'), 'utf8')));
  }

  private completed(): Set<string> {
    return new Set(
      this.db.select({ id: unitProgress.unitId }).from(unitProgress).where(isNotNull(unitProgress.completedAt)).all().map((r) => r.id),
    );
  }

  authored(id: string): boolean {
    return existsSync(join(this.contentDir, 'units', `${id}.json`));
  }

  /** The whole path with each unit's status, plus the learner's growing can-do list. */
  map() {
    const done = this.completed();
    const status = unitStatuses(this.curriculum.units, done);
    const scores = Object.fromEntries(this.db.select().from(unitProgress).all().map((r) => [r.unitId, r.score]));
    const units = this.curriculum.units.map((u) => ({ ...u, status: status[u.id]!, authored: this.authored(u.id), score: scores[u.id] ?? null }));
    const current = units.find((u) => u.status === 'current') ?? null;
    const levels = this.curriculum.levels.map((l) => {
      const inLevel = units.filter((u) => u.level === l.id);
      return { ...l, total: inLevel.length, done: inLevel.filter((u) => u.status === 'done').length };
    });
    const canDo = units.filter((u) => u.status === 'done').map((u) => ({ unitId: u.id, ...u.canDo }));
    return { levels, units, current, canDo, completedCount: done.size };
  }

  meta(id: string): UnitMeta {
    const meta = this.curriculum.units.find((u) => u.id === id);
    if (!meta) throw new NotFound(`unit ${id}`);
    return meta;
  }

  content(id: string): { meta: UnitMeta; content: UnitContent } {
    const meta = this.meta(id);
    const file = join(this.contentDir, 'units', `${id}.json`);
    if (!existsSync(file)) throw new NotFound(`unit ${id} is not written yet`);
    return { meta, content: UnitContentSchema.parse(JSON.parse(readFileSync(file, 'utf8'))) };
  }

  /** Starting a unit creates its word cards (with the Persian meanings from the lesson). */
  start(id: string): { cardIds: number[] } {
    const { content } = this.content(id);
    this.db.insert(unitProgress).values({ unitId: id }).onConflictDoNothing().run();
    const cardIds: number[] = [];
    for (const w of content.words) {
      // The lesson's own gloss is the best one: it matches the lesson's sense of the word.
      this.db
        .insert(glosses)
        .values({ lemma: w.de, fa: w.fa, en: w.en, cefr: 'A1', domains: ['alltag'], exampleDe: w.example.de, exampleFa: w.example.fa })
        .onConflictDoUpdate({ target: glosses.lemma, set: { fa: w.fa, en: w.en, exampleDe: w.example.de, exampleFa: w.example.fa } })
        .run();
      const cards = this.learner.addKursWord(w, id);
      cardIds.push(...cards.map((c) => c.id));
    }
    return { cardIds };
  }

  /**
   * Finishing a unit: words the learner got right enter FSRS as "seen and
   * recalled" (Good), the rest as "seen but shaky" (Again) so they return soon.
   */
  complete(id: string, result: UnitResult) {
    const { content, meta } = this.content(id);
    const now = new Date();
    for (const w of content.words) {
      const ok = result.words[w.de] ?? true;
      for (const card of this.learner.cardsFor(w.de)) {
        if (card.memory.state === 0) this.learner.review({ cardId: card.id, rating: ok ? Rating.Good : Rating.Again, durationMs: 5000 }, now);
      }
    }
    for (const [concept, r] of Object.entries(result.grammar)) {
      for (let i = 0; i < r.correct; i++) this.learner.observeConcept(concept, true);
      for (let i = 0; i < r.total - r.correct; i++) this.learner.observeConcept(concept, false);
    }
    const prev = this.db.select().from(unitProgress).where(eq(unitProgress.unitId, id)).get();
    this.db
      .insert(unitProgress)
      .values({ unitId: id, completedAt: now.toISOString(), score: result.score, attempts: 1 })
      .onConflictDoUpdate({
        target: unitProgress.unitId,
        set: { completedAt: prev?.completedAt ?? now.toISOString(), score: Math.max(prev?.score ?? 0, result.score), attempts: (prev?.attempts ?? 0) + 1 },
      })
      .run();
    this.learner.logTime({ source: 'manual', activity: 'grammar', seconds: Math.max(60, Math.min(result.seconds, 3 * 3600)), active: true });
    const map = this.map();
    return { canDo: meta.canDo, next: map.current, completedCount: map.completedCount };
  }

  /** Until A1.1 is done the course is the only source of new words (no context-free frequency cards). */
  coreWordsUnlocked(): boolean {
    const a11 = this.curriculum.units.filter((u) => u.level === 'A1.1').map((u) => u.id);
    const done = this.completed();
    return a11.every((id) => done.has(id));
  }
}
