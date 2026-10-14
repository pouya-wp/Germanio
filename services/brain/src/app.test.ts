import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// Response bodies are asserted structurally below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
import { CachedProvider } from './ai/cache';
import { toStrictJsonSchema } from './ai/codex';
import { RecordedProvider } from './ai/recorded';
import { GlossBatchSchema } from './ai/tasks';
import { createApp } from './app';
import { Dictionary } from './db/dictionary';
import { openLearnerDb } from './db/learner';
import { Learner } from './domain/learner';
import { Nachtschicht } from './jobs/nachtschicht';
import { fixtureGrammar, makeFixtureDictionary } from './test/fixtures';

const dictPath = makeFixtureDictionary();

function setup() {
  const { db, close } = openLearnerDb(':memory:');
  const dict = new Dictionary(dictPath);
  const recorded = new RecordedProvider({
    'gloss-batch': (req) => ({
      items: req.prompt
        .split('\n')
        .map((l) => l.match(/^- (?:(?:der|die|das) )?(\S+)/)?.[1])
        .filter(Boolean)
        .map((lemma) => ({
          lemma,
          fa: `فا-${lemma}`,
          en: `en-${lemma}`,
          cefr: 'A1',
          domains: ['alltag'],
          exampleDe: 'Beispiel.',
          exampleFa: 'مثال.',
        })),
    }),
    correct: () => ({
      corrected: 'Ich gehe in die Schule.',
      errors: [
        {
          original: 'in der Schule',
          correction: 'in die Schule',
          conceptId: 'praep.wechsel',
          explanationDe: 'Wohin? → Akkusativ.',
          explanationFa: 'جهت حرکت ← مفعولی.',
          severity: 'major',
        },
      ],
      correctConcepts: ['kasus.akkusativ'],
      cefrEstimate: 'A2',
      praiseDe: 'Super!',
    }),
  });
  const ai = new CachedProvider(recorded, db);
  const learner = new Learner(db, dict, fixtureGrammar);
  const nachtschicht = new Nachtschicht(db, dict, ai, { intervalMs: 1e9, batchSize: 10 });
  const app = createApp({
    config: { port: 4317, allowedOrigins: (o) => o === 'http://localhost:3000' },
    dict,
    learner,
    ai,
    nachtschicht,
    grammar: fixtureGrammar,
    version: 'test',
  });
  const req = (path: string, init: RequestInit & { json?: unknown } = {}) =>
    app.request(`http://127.0.0.1:4317${path}`, {
      ...init,
      headers: { host: '127.0.0.1:4317', 'content-type': 'application/json', ...(init.headers ?? {}) },
      ...(init.json !== undefined ? { body: JSON.stringify(init.json) } : {}),
    });
  return { req, learner, recorded, nachtschicht, close: () => (dict.close(), close()) };
}

let t: ReturnType<typeof setup>;
beforeEach(() => (t = setup()));
afterEach(() => t.close());

describe('guards', () => {
  it('rejects foreign hosts (DNS rebinding) and unknown origins', async () => {
    expect((await t.req('/health', { headers: { host: 'evil.com' } })).status).toBe(403);
    expect((await t.req('/health', { headers: { origin: 'https://evil.com' } })).status).toBe(403);
    expect((await t.req('/health', { headers: { origin: 'http://localhost:3000' } })).status).toBe(200);
  });
});

describe('dictionary', () => {
  it('resolves inflected forms to their lemma', async () => {
    const res = (await (await t.req('/lookup?q=ging')).json()) as Json;
    expect(res.matches[0].lemma).toBe('gehen');
    expect(res.inflection).toEqual({ lemma: 'gehen', tags: ['past'] });
  });

  it('returns gender, plural and examples for nouns', async () => {
    const res = (await (await t.req('/lookup?q=Häuser')).json()) as Json;
    expect(res.matches[0]).toMatchObject({ lemma: 'Haus', gender: 'das', plural: 'Häuser' });
    expect(res.examples[0].audioUrl).toBe('https://audio.tatoeba.org/sentences/deu/10.mp3');
  });
});

describe('cards', () => {
  it('mines a noun into recognition + genus cards, idempotently', async () => {
    const mine = () =>
      t.req('/mine', {
        method: 'POST',
        json: { word: 'Bewerbungen', sentence: 'Ich schreibe Bewerbungen.', source: 'web', sourceUrl: null, sourceTitle: null },
      });
    const first = (await (await mine()).json()) as Json;
    expect(first.cards.map((c: { kind: string }) => c.kind).sort()).toEqual(['genus', 'recognition']);
    expect(first.cards[0].lemma).toBe('Bewerbung');
    const second = (await (await mine()).json()) as Json;
    expect(second.cards).toHaveLength(2);
    expect(t.learner.stats().cards).toBe(2);
  });

  it('fills the core pool with one lexeme per lemma (+det/pron)', async () => {
    const q = (await (await t.req('/queue')).json()) as Json;
    const keys = q.cards.map((c: { lemma: string; kind: string }) => `${c.lemma}:${c.kind}`);
    expect(keys).toContain('sein:recognition');
    expect(keys.filter((k: string) => k === 'schön:recognition')).toHaveLength(1); // adj only, not adv
    expect(keys).toContain('Haus:genus');
  });

  it('reviews a card and schedules it into the future', async () => {
    const q = (await (await t.req('/queue')).json()) as Json;
    const card = q.cards[0];
    const res = (await (await t.req('/review', { method: 'POST', json: { cardId: card.id, rating: 3, durationMs: 4000 } })).json()) as Json;
    expect(new Date(res.nextDue).getTime()).toBeGreaterThan(Date.now());
    expect(t.learner.dailyHours(1)[0]!.hours).toBeGreaterThan(0);
  });

  it('rejects invalid review payloads', async () => {
    const res = await t.req('/review', { method: 'POST', json: { cardId: 1, rating: 7, durationMs: 1 } });
    expect(res.status).toBe(400);
  });
});

describe('nachtschicht', () => {
  it('glosses card lemmas in one batch and only accepts requested lemmas', async () => {
    t.learner.ensureCorePool();
    const pending = t.nachtschicht.pendingGlosses(50).length;
    expect(pending).toBeGreaterThan(0);
    const report = await t.nachtschicht.tick();
    expect(report?.processed).toBe(Math.min(pending, 10));
    expect(t.recorded.calls).toHaveLength(1);
    const q = (await (await t.req('/queue')).json()) as Json;
    expect(q.cards.some((c: { meaning: string }) => c.meaning.startsWith('فا-'))).toBe(true);
  });
});

describe('writing correction', () => {
  it('updates the Fehlerprofil and files Zettels', async () => {
    const res = (await (await t.req('/correct', { method: 'POST', json: { text: 'Ich gehe in der Schule.' } })).json()) as Json;
    expect(res.correction.errors).toHaveLength(1);
    expect(res.zettelIds).toHaveLength(1);
    const state = t.learner.conceptState();
    expect(state['praep.wechsel']).toBeLessThan(0.2);
    expect(state['kasus.akkusativ']).toBeGreaterThan(0.2);
  });

  it('caches identical AI requests', async () => {
    await t.req('/correct', { method: 'POST', json: { text: 'Hallo Welt' } });
    await t.req('/correct', { method: 'POST', json: { text: 'Hallo Welt' } });
    expect(t.recorded.calls).toHaveLength(1);
  });
});

describe('codex schema', () => {
  it('produces strict-mode JSON schema (all required, no extra props)', () => {
    const s = toStrictJsonSchema(GlossBatchSchema) as { required: string[]; additionalProperties: boolean; properties: { items: { items: { required: string[] } } } };
    expect(s.additionalProperties).toBe(false);
    expect(s.properties.items.items.required).toEqual(['lemma', 'fa', 'en', 'cefr', 'domains', 'exampleDe', 'exampleFa']);
  });
});

describe('forecast & today', () => {
  it('builds a plan and an honest forecast', async () => {
    const today = (await (await t.req('/today')).json()) as Json;
    expect(today.plan.length).toBeGreaterThan(0);
    const f = (await (await t.req('/forecast')).json()) as Json;
    expect(f.settings.target).toBe('B2');
    expect(f.totalHours).toBeGreaterThanOrEqual(60);
  });
});

describe('rate limits', () => {
  it('parses the subscription retry hint', async () => {
    const { parseRetryAt } = await import('./ai/provider');
    const now = new Date(2026, 9, 14, 15, 30);
    const at = parseRetryAt('You’ve hit your usage limit … try again at 5:04 PM.', now);
    expect([at.getHours(), at.getMinutes(), at.getDate()]).toEqual([17, 4, 14]);
    expect(parseRetryAt('try again at 9:00 AM', now).getDate()).toBe(15);
  });
});
