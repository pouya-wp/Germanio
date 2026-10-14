/**
 * Manual smoke test for the real Codex provider (spends one subscription call).
 *   pnpm --filter @germanio/brain exec tsx scripts/ai-smoke.ts
 */
import { CodexProvider, toStrictJsonSchema } from '../src/ai/codex';
import { glossBatch, GlossBatchSchema } from '../src/ai/tasks';

const ai = new CodexProvider({ model: null, defaultEffort: 'low', concurrency: 1 });
console.log('status:', await ai.status());
console.log('schema:', JSON.stringify(toStrictJsonSchema(GlossBatchSchema)).slice(0, 400));
const started = Date.now();
try {
  const items = await glossBatch(ai, [
    { lemma: 'sein', pos: 'verb', gender: null, en: ['to be'] },
    { lemma: 'Haus', pos: 'noun', gender: 'das', en: ['house'] },
  ]);
  console.log(`ok in ${Date.now() - started} ms`, items);
} catch (e) {
  console.error('failed:', e);
  process.exitCode = 1;
}
