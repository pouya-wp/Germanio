import { and, eq, isNull, notInArray, sql } from 'drizzle-orm';
import type { Dictionary } from '../db/dictionary';
import type { LearnerDb } from '../db/learner';
import { cards, glosses } from '../db/schema';
import { glossBatch } from '../ai/tasks';
import { AiError, type LLMProvider } from '../ai/provider';

/**
 * Nachtschicht — background generation so that nothing interactive ever waits
 * on the model. Each tick runs one bounded unit of work; the scheduler is a
 * plain interval because brain is a single-user local process.
 *
 * Current shifts:
 *  - gloss: Persian meanings + CEFR/domain tags for card lemmas lacking them,
 *    batched (~25 lemmas per call) to amortise Codex's fixed per-call cost.
 */
export interface ShiftReport {
  shift: string;
  processed: number;
  ms: number;
  error?: string;
}

export class Nachtschicht {
  private timer: NodeJS.Timeout | null = null;
  private busy = false;
  readonly history: ShiftReport[] = [];
  /** Set when the subscription's usage limit is hit — no calls until then. */
  pausedUntil: Date | null = null;

  constructor(
    private readonly db: LearnerDb,
    private readonly dict: Dictionary,
    private readonly ai: LLMProvider,
    private readonly opts: { intervalMs: number; batchSize: number } = { intervalMs: 60_000, batchSize: 25 },
  ) {}

  start(): void {
    this.timer ??= setInterval(() => void this.tick(), this.opts.intervalMs);
    setTimeout(() => void this.tick(), 5_000);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick(): Promise<ShiftReport | null> {
    if (this.busy) return null;
    if (this.pausedUntil && Date.now() < this.pausedUntil.getTime()) return null;
    this.pausedUntil = null;
    this.busy = true;
    const started = Date.now();
    try {
      const processed = await this.glossShift();
      if (processed === 0) return null;
      return this.record({ shift: 'gloss', processed, ms: Date.now() - started });
    } catch (e) {
      if (e instanceof AiError && e.kind === 'rate-limited') this.pausedUntil = e.retryAt;
      return this.record({ shift: 'gloss', processed: 0, ms: Date.now() - started, error: e instanceof Error ? e.message : String(e) });
    } finally {
      this.busy = false;
    }
  }

  private record(r: ShiftReport): ShiftReport {
    this.history.unshift(r);
    this.history.length = Math.min(this.history.length, 50);
    return r;
  }

  /** Lemmas with cards but no gloss yet, oldest first (the learner sees those soonest). */
  pendingGlosses(limit: number): { lemma: string; pos: string; gender: string | null; en: string[] }[] {
    const rows = this.db
      .select({ lemma: cards.lemma, pos: cards.pos, gender: cards.gender })
      .from(cards)
      .leftJoin(glosses, eq(glosses.lemma, cards.lemma))
      .where(and(isNull(glosses.lemma), notInArray(cards.pos, ['unknown'])))
      .orderBy(sql`min(${cards.id})`)
      .groupBy(cards.lemma)
      .limit(limit)
      .all();
    return rows.map((r) => {
      const lex = this.dict.byLemmaPos(r.lemma, r.pos);
      return { lemma: r.lemma, pos: r.pos, gender: r.gender, en: lex ? lex.senses.flatMap((s) => s.en) : [] };
    });
  }

  private async glossShift(): Promise<number> {
    const batch = this.pendingGlosses(this.opts.batchSize);
    if (batch.length === 0) return 0;
    const items = await glossBatch(this.ai, batch);
    const wanted = new Set(batch.map((b) => b.lemma));
    let n = 0;
    for (const g of items) {
      if (!wanted.has(g.lemma)) continue; // never let the model invent rows
      this.db
        .insert(glosses)
        .values({ lemma: g.lemma, fa: g.fa, en: g.en, cefr: g.cefr, domains: g.domains, exampleDe: g.exampleDe, exampleFa: g.exampleFa })
        .onConflictDoNothing()
        .run();
      n++;
    }
    return n;
  }
}
