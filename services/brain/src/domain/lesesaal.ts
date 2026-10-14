import { Readability } from '@mozilla/readability';
import { desc, eq } from 'drizzle-orm';
import { parseHTML } from 'linkedom';
import { tokenize, type Cefr } from '@germanio/core';
import { simplifyText, writeStory, type ReaderText } from '../ai/tasks';
import type { LLMProvider } from '../ai/provider';
import type { Dictionary } from '../db/dictionary';
import type { LearnerDb } from '../db/learner';
import { texts } from '../db/schema';
import { NotFound, type Learner } from './learner';

const MAX_BYTES = 2_000_000;

export type TextRow = typeof texts.$inferSelect;

/**
 * Lesesaal — the reading room. Any text becomes comprehensible input:
 * imported (URL or paste), simplified to the learner's level, or generated
 * from the learner's own vocabulary.
 */
export class Lesesaal {
  constructor(
    private readonly db: LearnerDb,
    private readonly dict: Dictionary,
    private readonly learner: Learner,
    private readonly ai: LLMProvider,
  ) {}

  list(limit = 50) {
    return this.db
      .select({ id: texts.id, title: texts.title, kind: texts.kind, level: texts.level, coverage: texts.coverage, sourceUrl: texts.sourceUrl, createdAt: texts.createdAt, readAt: texts.readAt })
      .from(texts)
      .orderBy(desc(texts.createdAt))
      .limit(limit)
      .all();
  }

  /** A text plus a token overlay (lemma + known/learning/new) and its coverage. */
  open(id: number) {
    const row = this.db.select().from(texts).where(eq(texts.id, id)).get();
    if (!row) throw new NotFound(`text ${id}`);
    const analysis = this.analyze(row.body);
    this.db.update(texts).set({ coverage: analysis.coverage, readAt: new Date().toISOString() }).where(eq(texts.id, id)).run();
    return { ...row, ...analysis };
  }

  analyze(body: string) {
    const tokens = tokenize(body);
    const resolved = this.dict.resolveTokens(tokens.map((t) => t.text));
    const lemmas = [...new Set([...resolved.values()].map((r) => r.lemma))];
    const status = this.learner.wordStatus(lemmas);
    const out = tokens.map((t) => {
      const r = resolved.get(t.text.toLocaleLowerCase('de-DE'));
      return { ...t, lemma: r?.lemma ?? null, status: r ? (status[r.lemma] ?? 'new') : ('unknown' as const) };
    });
    const counted = out.filter((t) => t.status !== 'unknown');
    const known = counted.filter((t) => t.status === 'known').length;
    return { tokens: out, coverage: counted.length ? known / counted.length : 0 };
  }

  importText(input: { title: string; body: string; sourceUrl?: string | null }): TextRow {
    return this.db
      .insert(texts)
      .values({ title: input.title.slice(0, 200) || 'Ohne Titel', body: input.body.trim(), kind: 'import', sourceUrl: input.sourceUrl ?? null })
      .returning()
      .get();
  }

  /** Fetch a web page and keep only its article text (Mozilla Readability). */
  async importUrl(url: string): Promise<TextRow> {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('only http(s) URLs');
    const res = await fetch(u, { signal: AbortSignal.timeout(15_000), headers: { 'user-agent': 'Mozilla/5.0 Germanio-Lesesaal' } });
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const html = (await res.text()).slice(0, MAX_BYTES);
    const { document } = parseHTML(html);
    const article = new Readability(document as unknown as ConstructorParameters<typeof Readability>[0]).parse();
    const body = (article?.textContent ?? '')
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s+/g, ' ').trim())
      .filter((p) => p.length > 30)
      .join('\n\n');
    if (body.length < 100) throw new Error('no readable article found');
    return this.importText({ title: article?.title ?? u.hostname, body, sourceUrl: url });
  }

  /** Rewrite a text for the learner's level; the simplified version is its own text linked to the original. */
  async simplify(id: number, level?: Cefr): Promise<TextRow> {
    const row = this.db.select().from(texts).where(eq(texts.id, id)).get();
    if (!row) throw new NotFound(`text ${id}`);
    const lvl = level ?? this.learner.level();
    const r = await simplifyText(this.ai, { text: row.body, level: lvl });
    return this.save(r, 'simplified', lvl, row.id, row.sourceUrl);
  }

  /** A fresh story from known words plus the learner's newest learning words. */
  async story(topic: string, level?: Cefr): Promise<TextRow> {
    const lvl = level ?? this.learner.level();
    const known = this.learner.knownLemmas();
    const targets = this.learner.learningLemmas(6);
    const r = await writeStory(this.ai, { level: lvl, topic, known: known.length ? known : this.learner.coreLemmas(300), targets });
    return this.save(r, 'story', lvl, null, null);
  }

  private save(r: ReaderText, kind: 'simplified' | 'story', level: Cefr, parentId: number | null, sourceUrl: string | null): TextRow {
    return this.db
      .insert(texts)
      .values({ title: r.title, body: r.body.trim(), glossary: r.glossary, kind, level, parentId, sourceUrl })
      .returning()
      .get();
  }
}
