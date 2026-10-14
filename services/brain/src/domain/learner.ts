import { and, asc, count, desc, eq, gte, inArray, lt, lte, ne, sql, sum } from 'drizzle-orm';
import {
  bktUpdate,
  buildPlan,
  DEFAULT_BKT,
  forecast,
  frontier,
  isKnown,
  levelFromProgress,
  newMemory,
  review as fsrsReview,
  State,
  type Card,
  type CardSchema,
  type Cefr,
  type ConceptNode,
  type Correction,
  type MineRequest,
  type ReviewRequest,
  type Skill,
  type TimeLog,
} from '@germanio/core';
import type { z } from 'zod';
import type { Dictionary, LexemeDetail } from '../db/dictionary';
import type { LearnerDb } from '../db/learner';
import { cards, concepts, glosses, reviews, settings, timeLogs, zettels } from '../db/schema';
import { addDays, learnerDay, learnerDayBounds } from './time';

export interface LearnerSettings {
  target: Cefr;
  /** ISO date the learner wants to reach the target by. */
  deadline: string;
  minutesPerDay: number;
  newCardsPerDay: number;
  /** Hours studied before Germanio existed (counted toward the forecast). */
  priorHours: number;
}

export const DEFAULT_SETTINGS: LearnerSettings = {
  target: 'B2',
  deadline: '2027-04-14',
  minutesPerDay: 210,
  newCardsPerDay: 20,
  priorHours: 60,
};

/** Passive exposure (background podcast, ambient pages) counts at a discount. */
const PASSIVE_WEIGHT = 0.35;

type CardRow = typeof cards.$inferSelect;

export class Learner {
  constructor(
    private readonly db: LearnerDb,
    private readonly dict: Dictionary,
    private readonly grammar: ConceptNode[],
  ) {}

  // ── Settings ────────────────────────────────────────────────────────────

  settings(): LearnerSettings {
    const rows = this.db.select().from(settings).all();
    const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return { ...DEFAULT_SETTINGS, ...stored } as LearnerSettings;
  }

  updateSettings(patch: Partial<LearnerSettings>): LearnerSettings {
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      this.db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } }).run();
    }
    return this.settings();
  }

  // ── Cards ───────────────────────────────────────────────────────────────

  private toCard(row: CardRow): Card {
    const g = this.db.select().from(glosses).where(eq(glosses.lemma, row.lemma)).get();
    return {
      id: row.id,
      // Re-resolved on read: dictionary ids are not stable across rebuilds.
      lexemeId: row.pos === 'unknown' ? null : (this.dict.byLemmaPos(row.lemma, row.pos)?.id ?? null),
      kind: row.kind as Card['kind'],
      lemma: row.lemma,
      gender: row.gender as Card['gender'],
      sentence: row.sentence,
      sentenceTranslation: row.sentenceTranslation,
      meaning: g ? `${g.fa} · ${g.en}` : row.meaning,
      source: row.source as Card['source'],
      sourceUrl: row.sourceUrl,
      memory: row.memory,
      createdAt: row.createdAt,
    } satisfies z.infer<typeof CardSchema>;
  }

  /** Create cards for a lexeme: recognition always; a gender card for nouns. Idempotent. */
  private addLexeme(
    lex: LexemeDetail,
    source: Card['source'],
    context: { sentence: string | null; translation: string | null; url: string | null },
  ): CardRow[] {
    const example = context.sentence ? null : this.dict.examples(lex.id, 1)[0];
    const sentence = context.sentence ?? example?.de ?? null;
    const translation = context.translation ?? example?.fa ?? example?.en ?? null;
    const meaning = lex.senses.slice(0, 2).flatMap((s) => s.en).join('; ');
    const kinds: Card['kind'][] = lex.pos === 'noun' && lex.gender ? ['recognition', 'genus'] : ['recognition'];
    const memory = newMemory();
    const created: CardRow[] = [];
    for (const kind of kinds) {
      const row = this.db
        .insert(cards)
        .values({
          lexemeId: lex.id,
          kind,
          lemma: lex.lemma,
          pos: lex.pos,
          gender: lex.gender,
          meaning,
          sentence,
          sentenceTranslation: translation,
          source,
          sourceUrl: context.url,
          memory,
          due: memory.due,
        })
        .onConflictDoNothing()
        .returning()
        .get();
      if (row) created.push(row);
    }
    return created;
  }

  /** Sentence mining from any surface. Unknown words still become cards (meaning filled by Nachtschicht). */
  mine(req: MineRequest): { cards: Card[]; lexeme: LexemeDetail | null; alreadyKnown: boolean } {
    const lookup = this.dict.lookup(req.word, 1);
    const lex = lookup.matches[0] ?? null;
    if (lex) {
      const existing = this.db
        .select()
        .from(cards)
        .where(and(eq(cards.lemma, lex.lemma), eq(cards.pos, lex.pos)))
        .all();
      if (existing.length > 0) {
        // Re-mining a word is a signal: give the existing card the fresh context sentence.
        if (req.sentence) {
          this.db
            .update(cards)
            .set({ sentence: req.sentence, sentenceTranslation: null, sourceUrl: req.sourceUrl })
            .where(inArray(cards.id, existing.map((c) => c.id)))
            .run();
        }
        return { cards: existing.map((c) => this.toCard({ ...c, sentence: req.sentence ?? c.sentence })), lexeme: lex, alreadyKnown: existing.some((c) => isKnown(c.memory)) };
      }
      const created = this.addLexeme(lex, req.source, { sentence: req.sentence, translation: null, url: req.sourceUrl });
      return { cards: created.map((c) => this.toCard(c)), lexeme: lex, alreadyKnown: false };
    }
    const memory = newMemory();
    const row = this.db
      .insert(cards)
      .values({
        lexemeId: null,
        kind: 'recognition',
        lemma: req.word.trim(),
        pos: 'unknown',
        gender: null,
        meaning: '…',
        sentence: req.sentence,
        sentenceTranslation: null,
        source: req.source,
        sourceUrl: req.sourceUrl,
        memory,
        due: memory.due,
      })
      .onConflictDoNothing()
      .returning()
      .get();
    return { cards: row ? [this.toCard(row)] : [], lexeme: null, alreadyKnown: false };
  }

  /** Top up the new-card pool from the frequency list so there is always something to learn. */
  ensureCorePool(minNew = 40): number {
    const pool = this.db.select({ n: count() }).from(cards).where(sql`json_extract(${cards.memory}, '$.state') = 0`).get();
    const missing = minNew - (pool?.n ?? 0);
    if (missing <= 0) return 0;
    const existing = new Set(
      this.db.select({ lemma: cards.lemma, pos: cards.pos }).from(cards).all().map((r) => `${r.lemma}|${r.pos}`),
    );
    let added = 0;
    for (const lex of this.dict.nextCore(existing, missing)) {
      added += this.addLexeme(lex, 'core', { sentence: null, translation: null, url: null }).length;
    }
    return added;
  }

  /** Today's queue: due reviews first, then new cards up to the daily allowance. */
  queue(now = new Date(), limit = 50): { cards: Card[]; dueCount: number; newRemaining: number } {
    const iso = now.toISOString();
    const notNew = ne(sql`json_extract(${cards.memory}, '$.state')`, State.New);
    const due = this.db
      .select()
      .from(cards)
      .where(and(lte(cards.due, iso), notNew, eq(cards.suspended, false)))
      .orderBy(asc(cards.due))
      .limit(limit)
      .all();
    const dueCount =
      this.db.select({ n: count() }).from(cards).where(and(lte(cards.due, iso), notNew, eq(cards.suspended, false))).get()?.n ?? 0;

    const { start, end } = learnerDayBounds(now);
    const introducedToday =
      this.db
        .select({ n: count() })
        .from(reviews)
        .where(and(eq(reviews.stateBefore, State.New), gte(reviews.reviewedAt, start), lt(reviews.reviewedAt, end)))
        .get()?.n ?? 0;
    const newRemaining = Math.max(0, this.settings().newCardsPerDay - introducedToday);

    const room = Math.max(0, limit - due.length);
    const fresh =
      newRemaining > 0 && room > 0
        ? this.db
            .select()
            .from(cards)
            .where(and(eq(sql`json_extract(${cards.memory}, '$.state')`, State.New), eq(cards.suspended, false)))
            .orderBy(asc(cards.id))
            .limit(Math.min(room, newRemaining))
            .all()
        : [];

    // Interleave new cards between reviews instead of front-loading them.
    const mixed: CardRow[] = [];
    const step = fresh.length ? Math.max(1, Math.floor(due.length / fresh.length)) : Infinity;
    let fi = 0;
    due.forEach((c, i) => {
      mixed.push(c);
      if ((i + 1) % step === 0 && fi < fresh.length) mixed.push(fresh[fi++]!);
    });
    while (fi < fresh.length) mixed.push(fresh[fi++]!);

    return { cards: mixed.map((c) => this.toCard(c)), dueCount, newRemaining };
  }

  review(req: ReviewRequest, now = new Date()): { card: Card; nextDue: string } {
    const row = this.db.select().from(cards).where(eq(cards.id, req.cardId)).get();
    if (!row) throw new NotFound(`card ${req.cardId}`);
    const { memory, log } = fsrsReview(row.memory, req.rating, now);
    this.db.transaction((tx) => {
      tx.update(cards).set({ memory, due: memory.due }).where(eq(cards.id, row.id)).run();
      tx.insert(reviews)
        .values({
          cardId: row.id,
          rating: req.rating,
          stateBefore: log.stateBefore,
          durationMs: req.durationMs,
          scheduledDays: log.scheduledDays,
          reviewedAt: log.reviewedAt,
        })
        .run();
      tx.insert(timeLogs)
        .values({ source: 'manual', activity: 'review', seconds: Math.max(1, Math.round(req.durationMs / 1000)), active: true, day: learnerDay(now) })
        .run();
    });
    return { card: this.toCard({ ...row, memory, due: memory.due }), nextDue: memory.due };
  }

  /** Current CEFR level for prompts (never below A1 — prompts need a target). */
  level(): Cefr {
    const p = this.forecast().progress;
    return levelFromProgress(Math.max(1, p)).level as Cefr;
  }

  /** Lemmas currently in learning (reviewed, not yet stable), most recently reviewed first. */
  learningLemmas(limit: number): string[] {
    const rows = this.db
      .select({ lemma: cards.lemma, memory: cards.memory })
      .from(cards)
      .where(and(eq(cards.kind, 'recognition'), ne(sql`json_extract(${cards.memory}, '$.state')`, State.New)))
      .orderBy(desc(sql`json_extract(${cards.memory}, '$.lastReview')`))
      .limit(limit * 3)
      .all();
    return [...new Set(rows.filter((r) => !isKnown(r.memory)).map((r) => r.lemma))].slice(0, limit);
  }

  /** The most frequent lemmas — a stand-in vocabulary before the learner knows any words. */
  coreLemmas(limit: number): string[] {
    return this.dict.nextCore(new Set(), limit).map((l) => l.lemma);
  }

  /** Learner-side gloss (Persian meaning etc.) produced by Nachtschicht, if any. */
  gloss(lemma: string) {
    return this.db.select().from(glosses).where(eq(glosses.lemma, lemma)).get() ?? null;
  }

  /** Lemmas the learner reliably knows — drives the adaptive German UI and the reader overlay. */
  knownLemmas(): string[] {
    const rows = this.db.select({ lemma: cards.lemma, memory: cards.memory }).from(cards).where(eq(cards.kind, 'recognition')).all();
    return [...new Set(rows.filter((r) => isKnown(r.memory)).map((r) => r.lemma))];
  }

  /** Word status for a set of lemmas: known / learning / new — the LingQ-style overlay. */
  wordStatus(lemmas: string[]): Record<string, 'known' | 'learning'> {
    if (lemmas.length === 0) return {};
    const rows = this.db
      .select({ lemma: cards.lemma, memory: cards.memory })
      .from(cards)
      .where(and(eq(cards.kind, 'recognition'), inArray(cards.lemma, lemmas)))
      .all();
    const out: Record<string, 'known' | 'learning'> = {};
    for (const r of rows) {
      if (isKnown(r.memory)) out[r.lemma] = 'known';
      else if (out[r.lemma] !== 'known' && r.memory.state !== State.New) out[r.lemma] = 'learning';
    }
    return out;
  }

  // ── Time (Stundenzähler) ────────────────────────────────────────────────

  logTime(entry: TimeLog, now = new Date()): void {
    this.db.insert(timeLogs).values({ ...entry, day: learnerDay(now) }).run();
  }

  /** Effective hours per day for the last `days` days (oldest first), passive time discounted. */
  dailyHours(days: number, now = new Date()): { day: string; hours: number }[] {
    const today = learnerDay(now);
    const from = addDays(today, -(days - 1));
    const rows = this.db
      .select({ day: timeLogs.day, active: timeLogs.active, seconds: sum(timeLogs.seconds) })
      .from(timeLogs)
      .where(gte(timeLogs.day, from))
      .groupBy(timeLogs.day, timeLogs.active)
      .all();
    const byDay = new Map<string, number>();
    for (const r of rows) {
      const h = (Number(r.seconds) / 3600) * (r.active ? 1 : PASSIVE_WEIGHT);
      byDay.set(r.day, (byDay.get(r.day) ?? 0) + h);
    }
    return Array.from({ length: days }, (_, i) => {
      const day = addDays(from, i);
      return { day, hours: byDay.get(day) ?? 0 };
    });
  }

  totalHours(): number {
    const rows = this.db
      .select({ active: timeLogs.active, seconds: sum(timeLogs.seconds) })
      .from(timeLogs)
      .groupBy(timeLogs.active)
      .all();
    const logged = rows.reduce((a, r) => a + (Number(r.seconds) / 3600) * (r.active ? 1 : PASSIVE_WEIGHT), 0);
    return logged + this.settings().priorHours;
  }

  // ── Fehlerprofil (BKT) ──────────────────────────────────────────────────

  conceptState(): Record<string, number> {
    return Object.fromEntries(this.db.select().from(concepts).all().map((c) => [c.id, c.pKnown]));
  }

  observeConcept(id: string, correct: boolean): number {
    const prev = this.db.select().from(concepts).where(eq(concepts.id, id)).get();
    const p = bktUpdate(prev?.pKnown ?? DEFAULT_BKT.pInit, correct);
    this.db
      .insert(concepts)
      .values({ id, pKnown: p, observations: 1 })
      .onConflictDoUpdate({
        target: concepts.id,
        set: { pKnown: p, observations: sql`${concepts.observations} + 1`, updatedAt: new Date().toISOString() },
      })
      .run();
    return p;
  }

  /** Apply a writing/speaking correction: update BKT and file each error as a Zettel. */
  applyCorrection(text: string, c: Correction): { zettelIds: number[] } {
    const zettelIds: number[] = [];
    this.db.transaction(() => {
      for (const e of c.errors) {
        this.observeConcept(e.conceptId, false);
        const node = this.grammar.find((n) => n.id === e.conceptId);
        const z = this.db
          .insert(zettels)
          .values({
            title: `${e.original} → ${e.correction}`,
            body: `${e.explanationDe}\n\n${e.explanationFa}\n\n> ${text.slice(0, 280)}`,
            kind: 'correction',
            links: [],
          })
          .returning({ id: zettels.id })
          .get();
        zettelIds.push(z.id);
        if (node) this.linkToRule(z.id, node);
      }
      for (const id of c.correctConcepts) this.observeConcept(id, true);
    });
    return { zettelIds };
  }

  /** Recent corrections filed under a concept ("in der Schule → in die Schule"), newest first. */
  mistakesFor(conceptId: string, limit = 5): string[] {
    const node = this.grammar.find((n) => n.id === conceptId);
    if (!node) return [];
    const rule = this.db.select().from(zettels).where(and(eq(zettels.kind, 'rule'), eq(zettels.title, node.title))).get();
    if (!rule || rule.links.length === 0) return [];
    return this.db
      .select({ title: zettels.title })
      .from(zettels)
      .where(inArray(zettels.id, rule.links))
      .orderBy(desc(zettels.id))
      .limit(limit)
      .all()
      .map((z) => z.title);
  }

  zettels(limit = 200) {
    return this.db.select().from(zettels).orderBy(desc(zettels.id)).limit(limit).all();
  }

  /** Every correction Zettel links to the rule Zettel of its concept (created on first use). */
  private linkToRule(zettelId: number, node: ConceptNode): void {
    let rule = this.db
      .select()
      .from(zettels)
      .where(and(eq(zettels.kind, 'rule'), eq(zettels.title, node.title)))
      .get();
    if (!rule) {
      rule = this.db
        .insert(zettels)
        .values({ title: node.title, body: `Konzept: ${node.id} (${node.level})`, kind: 'rule', links: [] })
        .returning()
        .get();
    }
    this.db.update(zettels).set({ links: [...new Set([...rule.links, zettelId])] }).where(eq(zettels.id, rule.id)).run();
    this.db.update(zettels).set({ links: [rule.id] }).where(eq(zettels.id, zettelId)).run();
  }

  // ── Plan & forecast ─────────────────────────────────────────────────────

  skills(): Record<Skill, number> {
    // Phase 1: estimated from vocabulary until skill modules report their own evidence.
    const vocab = Math.min(1, this.knownLemmas().length / 4000);
    return { lesen: vocab, hoeren: vocab * 0.7, schreiben: vocab * 0.6, sprechen: vocab * 0.5 };
  }

  today(now = new Date()) {
    this.ensureCorePool();
    const s = this.settings();
    const q = this.queue(now, 1000);
    const known = this.conceptState();
    const weak = frontier(this.grammar, known, 3);
    const plan = buildPlan({
      minutes: s.minutesPerDay,
      dueCards: q.dueCount,
      newCardsAvailable: q.newRemaining,
      skills: this.skills(),
      weakConcepts: weak,
      newCardsPerDay: s.newCardsPerDay,
    });
    const todayHours = this.dailyHours(1, now)[0]?.hours ?? 0;
    return { day: learnerDay(now), plan, dueCount: q.dueCount, newRemaining: q.newRemaining, todayHours, weakConcepts: weak };
  }

  forecast(now = new Date()) {
    const s = this.settings();
    const recent = this.dailyHours(14, now);
    const knownLemmas = this.knownLemmas().length;
    const totalHours = this.totalHours();
    const f = forecast({
      hoursLogged: totalHours,
      recentDailyHours: recent.map((d) => d.hours),
      knownLemmas,
      target: s.target,
      deadline: new Date(`${s.deadline}T00:00:00`),
      now,
    });
    return { ...f, totalHours, knownLemmas, recent, settings: s };
  }

  stats() {
    const total = this.db.select({ n: count() }).from(cards).get()?.n ?? 0;
    const reviewsTotal = this.db.select({ n: count() }).from(reviews).get()?.n ?? 0;
    return { cards: total, reviews: reviewsTotal, known: this.knownLemmas().length };
  }
}

export class NotFound extends Error {}
