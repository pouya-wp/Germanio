import { serve } from '@hono/node-server';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ConceptNode } from '@germanio/core';
import { CachedProvider } from './ai/cache';
import { CodexProvider } from './ai/codex';
import type { LLMProvider } from './ai/provider';
import { RecordedProvider } from './ai/recorded';
import { createApp } from './app';
import { loadConfig } from './config';
import { Dictionary } from './db/dictionary';
import { openLearnerDb } from './db/learner';
import { Learner } from './domain/learner';
import { Lesesaal } from './domain/lesesaal';
import { Studio } from './domain/studio';
import { Tagesfunk } from './domain/tagesfunk';
import { createLabClient } from './lab';
import { Nachtschicht } from './jobs/nachtschicht';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(here, '../package.json'), 'utf8')) as { version: string };
const grammar = (JSON.parse(readFileSync(resolve(here, '../../../content/grammar.json'), 'utf8')) as { nodes: ConceptNode[] }).nodes;

const config = loadConfig();
const { db, close } = openLearnerDb(config.learnerPath);
const dict = new Dictionary(config.dictionaryPath);
const base: LLMProvider =
  config.ai.provider === 'recorded'
    ? new RecordedProvider()
    : new CodexProvider({ model: config.ai.model, defaultEffort: config.ai.reasoningEffort, concurrency: 1 });
const ai = new CachedProvider(base, db);
const learner = new Learner(db, dict, grammar);

if (!dict.available) {
  console.warn(`⚠ dictionary not found at ${config.dictionaryPath} — run: pnpm data:build`);
}

const lesesaal = new Lesesaal(db, dict, learner, ai);
const studio = new Studio(db, learner, ai, grammar);
const lab = createLabClient();
const tagesfunk = new Tagesfunk(db, learner, ai, lab);
const nachtschicht = config.ai.provider === 'codex' ? new Nachtschicht(db, dict, ai, undefined, tagesfunk) : null;
const app = createApp({ config, dict, learner, lesesaal, studio, tagesfunk, lab, dataDir: config.dataDir, ai, nachtschicht, grammar, version: pkg.version });
const server = serve({ fetch: app.fetch, hostname: config.host, port: config.port }, (info) => {
  console.log(`🧠 Germanio brain → http://${config.host}:${info.port}  (ai: ${ai.name}, data: ${config.dataDir})`);
  nachtschicht?.start();
});

const shutdown = () => {
  nachtschicht?.stop();
  server.close();
  dict.close();
  close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
