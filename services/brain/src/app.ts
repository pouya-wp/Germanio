import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import {
  CefrSchema,
  MineRequestSchema,
  ReviewRequestSchema,
  TimeLogSchema,
  tokenize,
  type ConceptNode,
} from '@germanio/core';
import { AiError, type LLMProvider } from './ai/provider';
import { correctText } from './ai/tasks';
import type { Config } from './config';
import type { Dictionary } from './db/dictionary';
import { NotFound, type Learner } from './domain/learner';
import type { Lesesaal } from './domain/lesesaal';
import type { Studio } from './domain/studio';
import type { Tagesfunk } from './domain/tagesfunk';
import type { LabClient } from './lab';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Nachtschicht } from './jobs/nachtschicht';

export interface AppDeps {
  config: Pick<Config, 'port' | 'allowedOrigins'>;
  dict: Dictionary;
  learner: Learner;
  lesesaal: Lesesaal;
  studio: Studio;
  tagesfunk: Tagesfunk;
  lab: LabClient;
  dataDir: string;
  ai: LLMProvider;
  nachtschicht: Nachtschicht | null;
  grammar: ConceptNode[];
  version: string;
}

const SettingsPatchSchema = z
  .object({
    target: CefrSchema,
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    minutesPerDay: z.number().int().min(10).max(600),
    newCardsPerDay: z.number().int().min(0).max(100),
    priorHours: z.number().min(0).max(5000),
  })
  .partial();

const CorrectRequestSchema = z.object({
  text: z.string().min(1).max(4000),
  level: CefrSchema.optional(),
  context: z.string().max(500).optional(),
});

export function createApp(deps: AppDeps): Hono {
  const { dict, learner, ai, config, lesesaal, studio, tagesfunk, lab } = deps;
  const app = new Hono();

  // ── Local-only guard ────────────────────────────────────────────────────
  // Brain binds to 127.0.0.1, but any web page in the browser could still try
  // to reach it. Reject foreign Host headers (DNS rebinding) and unknown
  // browser origins; non-browser clients (CLI, VS Code, desktop) send no Origin.
  app.use('*', async (c, next) => {
    const host = c.req.header('host') ?? '';
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) return c.json({ error: 'forbidden host' }, 403);
    const origin = c.req.header('origin');
    if (origin && !config.allowedOrigins(origin)) return c.json({ error: 'forbidden origin' }, 403);
    await next();
  });
  app.use('*', cors({ origin: (o) => (config.allowedOrigins(o) ? o : null), allowHeaders: ['Content-Type'] }));

  app.onError((err, c) => {
    if (err instanceof NotFound) return c.json({ error: err.message }, 404);
    if (err instanceof z.ZodError) return c.json({ error: 'invalid request', issues: err.issues }, 400);
    if (err instanceof AiError) {
      const status = err.kind === 'rate-limited' ? 429 : err.kind === 'unavailable' ? 503 : 502;
      return c.json({ error: err.message, kind: err.kind, retryAt: err.retryAt?.toISOString() ?? null }, status);
    }
    console.error(err);
    return c.json({ error: 'internal error' }, 500);
  });

  const body = async <T>(c: Context, schema: z.ZodType<T>): Promise<T> => schema.parse(await c.req.json());

  // ── Health ──────────────────────────────────────────────────────────────
  app.get('/health', async (c) => {
    const aiStatus = await ai.status();
    return c.json({
      ok: true,
      version: deps.version,
      dictionary: dict.available ? { ready: true, ...dict.meta() } : { ready: false },
      ai: { provider: ai.name, ...aiStatus },
      nachtschicht: deps.nachtschicht?.history.slice(0, 5) ?? [],
      aiPausedUntil: deps.nachtschicht?.pausedUntil?.toISOString() ?? null,
      lab: { ready: await lab.available() },
    });
  });

  // ── Dictionary ──────────────────────────────────────────────────────────
  app.get('/lookup', (c) => {
    const q = c.req.query('q') ?? '';
    const result = dict.lookup(q, 5);
    const top = result.matches[0];
    return c.json({
      ...result,
      examples: top ? dict.examples(top.id, 3) : [],
      status: top ? (learner.wordStatus([top.lemma])[top.lemma] ?? 'new') : null,
      gloss: top ? learner.gloss(top.lemma) : null,
    });
  });

  app.get('/lexeme/:id', (c) => {
    const lex = dict.byId(Number(c.req.param('id')));
    if (!lex) throw new NotFound('lexeme');
    return c.json({ lexeme: lex, examples: dict.examples(lex.id, 8) });
  });

  /** Reader overlay: tokenise a text and return each token's lemma + status. */
  app.post('/analyze', async (c) => {
    const { text } = await body(c, z.object({ text: z.string().max(50_000) }));
    const tokens = tokenize(text);
    const resolved = dict.resolveTokens(tokens.map((t) => t.text));
    const lemmas = [...new Set([...resolved.values()].map((r) => r.lemma))];
    const status = learner.wordStatus(lemmas);
    const out = tokens.map((t) => {
      const r = resolved.get(t.text.toLocaleLowerCase('de-DE'));
      return { ...t, lemma: r?.lemma ?? null, status: r ? (status[r.lemma] ?? 'new') : 'unknown' };
    });
    const counted = out.filter((t) => t.status !== 'unknown');
    const known = counted.filter((t) => t.status === 'known').length;
    return c.json({ tokens: out, coverage: counted.length ? known / counted.length : 0 });
  });

  // ── Cards ───────────────────────────────────────────────────────────────
  app.get('/queue', (c) => {
    learner.ensureCorePool();
    const limit = Math.min(200, Number(c.req.query('limit') ?? 50));
    return c.json(learner.queue(new Date(), limit));
  });

  app.post('/mine', async (c) => c.json(learner.mine(await body(c, MineRequestSchema)), 201));

  app.post('/review', async (c) => c.json(learner.review(await body(c, ReviewRequestSchema))));

  app.get('/known', (c) => c.json({ lemmas: learner.knownLemmas() }));

  // ── Time, plan, forecast ────────────────────────────────────────────────
  app.post('/time', async (c) => {
    learner.logTime(await body(c, TimeLogSchema));
    return c.json({ ok: true }, 201);
  });

  app.get('/today', (c) => c.json(learner.today()));
  app.get('/forecast', (c) => c.json(learner.forecast()));
  app.get('/stats', (c) => c.json(learner.stats()));

  app.get('/settings', (c) => c.json(learner.settings()));
  app.patch('/settings', async (c) => c.json(learner.updateSettings(await body(c, SettingsPatchSchema))));

  // ── Grammar & writing ───────────────────────────────────────────────────
  app.get('/grammar', (c) => {
    const state = learner.conceptState();
    return c.json({ nodes: deps.grammar.map((n) => ({ ...n, pKnown: state[n.id] ?? null })) });
  });

  app.post('/correct', async (c) => {
    const req = await body(c, CorrectRequestSchema);
    const level = req.level ?? 'A2';
    const correction = await correctText(ai, {
      text: req.text,
      level,
      conceptIds: deps.grammar.map((n) => n.id),
      ...(req.context ? { context: req.context } : {}),
    });
    const { zettelIds } = learner.applyCorrection(req.text, correction);
    learner.logTime({ source: 'manual', activity: 'writing', seconds: Math.max(30, req.text.length), active: true });
    return c.json({ correction, zettelIds });
  });

  // ── Lesesaal ────────────────────────────────────────────────────────────
  app.get('/texts', (c) => c.json({ texts: lesesaal.list() }));
  app.get('/texts/:id', (c) => c.json(lesesaal.open(Number(c.req.param('id')))));
  app.post('/texts', async (c) => {
    const req = await body(
      c,
      z.union([
        z.object({ url: z.string().url() }),
        z.object({ title: z.string().max(200), body: z.string().min(20).max(60_000) }),
      ]),
    );
    const row = 'url' in req ? await lesesaal.importUrl(req.url) : lesesaal.importText(req);
    return c.json(row, 201);
  });
  app.post('/texts/:id/simplify', async (c) => {
    const { level } = await body(c, z.object({ level: CefrSchema.optional() }));
    return c.json(await lesesaal.simplify(Number(c.req.param('id')), level), 201);
  });
  app.post('/stories', async (c) => {
    const { topic, level } = await body(c, z.object({ topic: z.string().min(2).max(200), level: CefrSchema.optional() }));
    return c.json(await lesesaal.story(topic, level), 201);
  });

  // ── Schreiben ───────────────────────────────────────────────────────────
  app.get('/journal', (c) => c.json({ entries: studio.journal() }));
  app.post('/journal', async (c) => {
    const req = await body(c, z.object({ text: z.string().min(1).max(4000), prompt: z.string().max(500).nullable().optional(), level: CefrSchema.optional() }));
    return c.json(await studio.write(req), 201);
  });
  app.get('/zettels', (c) => c.json({ zettels: learner.zettels() }));

  // ── Grammatik drills ────────────────────────────────────────────────────
  app.get('/grammar/:id/drills', async (c) => c.json(await studio.drills(c.req.param('id'), c.req.query('fresh') === '1')));
  app.post('/grammar/answer', async (c) =>
    c.json(studio.answer(await body(c, z.object({ setId: z.number().int(), index: z.number().int().min(0), given: z.string().max(100) })))),
  );

  // ── Tagesfunk & speech ──────────────────────────────────────────────────
  app.get('/tagesfunk', (c) => c.json({ episodes: tagesfunk.list() }));
  app.post('/tagesfunk', async (c) => c.json({ id: await tagesfunk.produce() }, 201));
  app.get('/tagesfunk/:id', (c) => c.json(tagesfunk.get(c.req.param('id'))));
  app.get('/tagesfunk/:id/audio', async (c) => {
    const ep = tagesfunk.get(c.req.param('id'));
    if (!ep.audioFile) throw new NotFound('audio not rendered yet');
    const bytes = await readFile(join(deps.dataDir, 'podcasts', ep.audioFile));
    return c.body(bytes, 200, { 'content-type': 'audio/wav', 'cache-control': 'max-age=86400' });
  });
  app.post('/tagesfunk/:id/listened', async (c) => {
    const { seconds } = await body(c, z.object({ seconds: z.number().min(0).max(7200) }));
    tagesfunk.listened(c.req.param('id'), Math.round(seconds));
    return c.json({ ok: true });
  });

  /** Local neural TTS (Piper via lab). Browsers can't reach lab directly, so brain relays. */
  app.get('/tts', async (c) => {
    const text = (c.req.query('text') ?? '').slice(0, 500);
    const voice = c.req.query('voice') === 'kerstin' ? 'kerstin' : 'thorsten';
    if (!text.trim()) return c.json({ error: 'text required' }, 400);
    if (!(await lab.available())) return c.json({ error: 'lab offline' }, 503);
    return c.body(await lab.tts(text, voice), 200, { 'content-type': 'audio/wav', 'cache-control': 'max-age=31536000, immutable' });
  });

  return app;
}
