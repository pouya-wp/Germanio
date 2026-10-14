import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { LearnerDb } from '../db/learner';
import { aiCache } from '../db/schema';
import type { GenerateRequest, GenerateResult, LLMProvider } from './provider';

/**
 * Content-addressed cache in front of any provider. The subscription is the
 * scarce resource: identical requests are answered from SQLite forever.
 */
export class CachedProvider implements LLMProvider {
  readonly name: string;

  constructor(
    private readonly inner: LLMProvider,
    private readonly db: LearnerDb,
  ) {
    this.name = `${inner.name}+cache`;
  }

  status() {
    return this.inner.status();
  }

  async generate<T>(req: GenerateRequest<T>): Promise<GenerateResult<T>> {
    const key = createHash('sha256')
      .update(JSON.stringify([req.task, req.system, req.prompt, z.toJSONSchema(req.schema)]))
      .digest('hex');
    const hit = this.db.select().from(aiCache).where(eq(aiCache.key, key)).get();
    if (hit) {
      const parsed = req.schema.safeParse(hit.value);
      if (parsed.success) return { value: parsed.data, cached: true, ms: 0, tokens: 0 };
    }
    const result = await this.inner.generate(req);
    this.db
      .insert(aiCache)
      .values({ key, task: req.task, value: result.value as unknown })
      .onConflictDoUpdate({ target: aiCache.key, set: { value: result.value as unknown } })
      .run();
    return result;
  }
}
