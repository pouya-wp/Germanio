import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import { normalizeKey, type Lexeme, type LookupResult } from '@germanio/core';

/**
 * Read-only access to data/dictionary.sqlite (built by packages/data).
 * Every query here is synchronous and sub-millisecond — real-time lookups
 * never wait for AI.
 */
export interface ExampleSentence {
  id: number;
  de: string;
  en: string | null;
  fa: string | null;
  audioUrl: string | null;
  audioAuthor: string | null;
}

export interface LexemeDetail extends Lexeme {
  extra: Record<string, unknown>;
  paradigm: [string, string[]][] | null;
}

interface LexemeRow {
  id: number;
  lemma: string;
  pos: string;
  gender: string | null;
  plural: string | null;
  ipa: string | null;
  freq_rank: number | null;
  cefr: string | null;
  domains: string;
  senses: string;
  extra: string;
  paradigm: string | null;
  parts: string | null;
}

const POS_PRIORITY = ['verb', 'noun', 'det', 'prep', 'conj', 'pron', 'adj', 'adv', 'particle', 'num', 'intj', 'postp', 'contraction'];

function pickPrimary<T extends { pos: string }>(rows: T[]): T[] {
  const sorted = [...rows].sort((a, b) => POS_PRIORITY.indexOf(a.pos) - POS_PRIORITY.indexOf(b.pos));
  const [first, ...rest] = sorted;
  if (!first) return [];
  const second = rest.find(
    (r) => (r.pos === 'pron' || r.pos === 'det') && r.pos !== first.pos,
  );
  return second ? [first, second] : [first];
}

export class Dictionary {
  private db: Database.Database | null;

  constructor(path: string) {
    this.db = existsSync(path) ? new Database(path, { readonly: true, fileMustExist: true }) : null;
  }

  get available(): boolean {
    return this.db !== null;
  }

  private toLexeme(row: LexemeRow): LexemeDetail {
    return {
      id: row.id,
      lemma: row.lemma,
      pos: row.pos,
      gender: row.gender as Lexeme['gender'],
      plural: row.plural,
      ipa: row.ipa,
      freqRank: row.freq_rank,
      cefr: row.cefr as Lexeme['cefr'],
      domains: JSON.parse(row.domains),
      senses: JSON.parse(row.senses),
      forms: [],
      parts: row.parts ? JSON.parse(row.parts) : null,
      extra: JSON.parse(row.extra),
      paradigm: row.paradigm ? JSON.parse(row.paradigm) : null,
    };
  }

  /**
   * Resolve any surface form to lexemes. Exact-case lemma matches rank first
   * (so "Essen" prefers the noun, "essen" the verb), then by frequency.
   */
  lookup(query: string, limit = 5): LookupResult & { matches: LexemeDetail[] } {
    const q = query.trim();
    if (!this.db || !q) return { query: q, matches: [], inflection: null };
    const rows = this.db
      .prepare(
        `SELECT l.*, f.form AS matched_form, f.tags AS matched_tags
           FROM forms f JOIN lexemes l ON l.id = f.lexeme_id
          WHERE f.form_key = ?
          ORDER BY (l.lemma = ?) DESC, (f.form = ?) DESC, l.freq_rank ASC
          LIMIT ?`,
      )
      .all(normalizeKey(q), q, q, limit) as (LexemeRow & { matched_form: string; matched_tags: string })[];

    const matches = rows.map((r) => this.toLexeme(r));
    const top = rows[0];
    const tags: string[] = top ? JSON.parse(top.matched_tags) : [];
    const inflection =
      top && normalizeKey(top.lemma) !== normalizeKey(q) ? { lemma: top.lemma, tags } : null;
    return { query: q, matches, inflection };
  }

  /**
   * Stable lookup. Lexeme ids change whenever the dictionary is rebuilt, so the
   * learner database refers to words by (lemma, pos) and resolves ids here.
   */
  byLemmaPos(lemma: string, pos: string): LexemeDetail | null {
    if (!this.db) return null;
    const row = this.db.prepare('SELECT * FROM lexemes WHERE lemma = ? AND pos = ? ORDER BY freq_rank LIMIT 1').get(lemma, pos) as
      | LexemeRow
      | undefined;
    return row ? this.toLexeme(row) : null;
  }

  byId(id: number): LexemeDetail | null {
    if (!this.db) return null;
    const row = this.db.prepare('SELECT * FROM lexemes WHERE id = ?').get(id) as LexemeRow | undefined;
    return row ? this.toLexeme(row) : null;
  }

  /** Example sentences; ones containing the lemma itself rank first (paradigms of pronouns are broad). */
  examples(lexemeId: number, limit = 5): ExampleSentence[] {
    if (!this.db) return [];
    const lemma = (this.db.prepare('SELECT lemma FROM lexemes WHERE id = ?').get(lexemeId) as { lemma: string } | undefined)?.lemma ?? '';
    const rows = this.db
      .prepare(
        `SELECT s.* FROM sentence_lexemes sl JOIN sentences s ON s.id = sl.sentence_id
          WHERE sl.lexeme_id = ?
          ORDER BY (' ' || lower(s.de) || ' ') NOT LIKE ('% ' || lower(?) || '%'),
                   (s.en IS NULL), (s.audio_id IS NULL), length(s.de)
          LIMIT ?`,
      )
      .all(lexemeId, lemma, limit) as {
      id: number;
      de: string;
      en: string | null;
      fa: string | null;
      audio_id: number | null;
      audio_author: string | null;
    }[];
    return rows.map((r) => ({
      id: r.id,
      de: r.de,
      en: r.en,
      fa: r.fa,
      audioUrl: r.audio_id ? `https://audio.tatoeba.org/sentences/deu/${r.id}.mp3` : null,
      audioAuthor: r.audio_author,
    }));
  }

  /**
   * Most frequent lexemes the learner has no card for yet — the "core" new-word
   * stream. One lexeme per lemma (its primary part of speech), plus a second one
   * only when it is a pronoun/determiner ("sein" the verb and "sein" = his).
   * `exclude` holds `lemma|pos` keys of existing cards.
   */
  nextCore(exclude: Set<string>, limit: number): LexemeDetail[] {
    if (!this.db) return [];
    const out: LexemeDetail[] = [];
    const stmt = this.db.prepare(
      `SELECT * FROM lexemes WHERE freq_rank IS NOT NULL ORDER BY freq_rank LIMIT ? OFFSET ?`,
    );
    let offset = 0;
    let pending: LexemeRow[] = [];
    const flush = () => {
      for (const lex of pickPrimary(pending)) {
        if (out.length < limit && !exclude.has(`${lex.lemma}|${lex.pos}`)) out.push(this.toLexeme(lex));
      }
      pending = [];
    };
    while (out.length < limit) {
      const rows = stmt.all(500, offset) as LexemeRow[];
      if (rows.length === 0) break;
      for (const r of rows) {
        if (pending[0] && pending[0].lemma !== r.lemma) flush();
        pending.push(r);
      }
      offset += 500;
    }
    flush();
    return out;
  }

  /** Lemma → lexeme id map for a set of surface tokens (used by the reader's known-word overlay). */
  resolveTokens(tokens: string[]): Map<string, { lexemeId: number; lemma: string }> {
    const out = new Map<string, { lexemeId: number; lemma: string }>();
    if (!this.db) return out;
    const stmt = this.db.prepare(
      `SELECT l.id, l.lemma FROM forms f JOIN lexemes l ON l.id = f.lexeme_id
        WHERE f.form_key = ? ORDER BY l.freq_rank LIMIT 1`,
    );
    for (const t of new Set(tokens.map(normalizeKey))) {
      const row = stmt.get(t) as { id: number; lemma: string } | undefined;
      if (row) out.set(t, { lexemeId: row.id, lemma: row.lemma });
    }
    return out;
  }

  meta(): Record<string, string> {
    if (!this.db) return {};
    const rows = this.db.prepare('SELECT key, value FROM meta').all() as { key: string; value: string }[];
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  close(): void {
    this.db?.close();
  }
}
