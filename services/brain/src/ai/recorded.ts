import { AiError, type GenerateRequest, type GenerateResult, type LLMProvider } from './provider';

/**
 * Deterministic provider backed by fixtures keyed by task name. Used by tests
 * and by the public portfolio demo, which must never spend a real model call.
 */
export class RecordedProvider implements LLMProvider {
  readonly name = 'recorded';
  readonly calls: GenerateRequest<unknown>[] = [];

  constructor(private readonly fixtures: Record<string, (req: GenerateRequest<unknown>) => unknown> = {}) {}

  async status() {
    return { ready: true, detail: `recorded (${Object.keys(this.fixtures).length} fixtures)` };
  }

  async generate<T>(req: GenerateRequest<T>): Promise<GenerateResult<T>> {
    this.calls.push(req as GenerateRequest<unknown>);
    const fixture = this.fixtures[req.task];
    if (!fixture) throw new AiError(`No recorded response for task "${req.task}"`, 'unavailable');
    const parsed = req.schema.safeParse(fixture(req as GenerateRequest<unknown>));
    if (!parsed.success) throw new AiError(`Recorded fixture for ${req.task} is invalid`, 'invalid-output');
    return { value: parsed.data, cached: false, ms: 0, tokens: 0 };
  }
}
