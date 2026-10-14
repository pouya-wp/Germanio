import { execFile, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { z } from 'zod';
import { AiError, parseRetryAt, type GenerateRequest, type GenerateResult, type LLMProvider } from './provider';

const execFileAsync = promisify(execFile);

/**
 * Runs the Codex CLI non-interactively, authenticated with the learner's own
 * ChatGPT subscription (`codex login`). Personal use only — the public demo
 * never reaches this class.
 *
 * Every call runs in a fresh empty temp dir with a read-only sandbox and is
 * ephemeral (no session files), so the model can't touch the learner's files.
 */
export class CodexProvider implements LLMProvider {
  readonly name = 'codex';
  private entry: Promise<string[]> | null = null;
  private running = 0;
  private queue: (() => void)[] = [];

  constructor(
    private readonly opts: {
      model: string | null;
      defaultEffort: 'low' | 'medium' | 'high';
      timeoutMs?: number;
      /** Subscription-friendly: one or two concurrent calls are plenty. */
      concurrency?: number;
    },
  ) {}

  /** Resolve the CLI once. On Windows the npm shim is a .cmd, so call node + codex.js directly. */
  private command(): Promise<string[]> {
    this.entry ??= (async () => {
      if (process.env.GERMANIO_CODEX_BIN) return [process.env.GERMANIO_CODEX_BIN];
      if (process.platform !== 'win32') return ['codex'];
      const { stdout } = await execFileAsync('cmd.exe', ['/d', '/s', '/c', 'npm root -g'], { windowsHide: true });
      const js = join(stdout.trim(), '@openai', 'codex', 'bin', 'codex.js');
      if (!existsSync(js)) throw new AiError('Codex CLI not found. Run: npm i -g @openai/codex', 'unavailable');
      return [process.execPath, js];
    })();
    return this.entry;
  }

  async status(): Promise<{ ready: boolean; detail: string }> {
    try {
      const [bin, ...pre] = await this.command();
      const { stdout, stderr } = await execFileAsync(bin!, [...pre, 'login', 'status'], { timeout: 15_000 });
      const out = `${stdout}${stderr}`.trim();
      return { ready: /logged in/i.test(out), detail: out.split('\n')[0] ?? out };
    } catch (e) {
      return { ready: false, detail: e instanceof Error ? e.message : String(e) };
    }
  }

  private async slot(): Promise<() => void> {
    const limit = this.opts.concurrency ?? 2;
    if (this.running >= limit) await new Promise<void>((r) => this.queue.push(r));
    this.running++;
    return () => {
      this.running--;
      this.queue.shift()?.();
    };
  }

  async generate<T>(req: GenerateRequest<T>): Promise<GenerateResult<T>> {
    const release = await this.slot();
    const dir = await mkdtemp(join(tmpdir(), 'germanio-codex-'));
    const started = Date.now();
    try {
      const schemaPath = join(dir, 'schema.json');
      const outPath = join(dir, 'out.json');
      await writeFile(schemaPath, JSON.stringify(toStrictJsonSchema(req.schema)));

      const [bin, ...pre] = await this.command();
      const effort = req.effort ?? this.opts.defaultEffort;
      const args = [
        ...pre,
        'exec',
        '--skip-git-repo-check',
        '--ephemeral',
        '--sandbox', 'read-only',
        '--color', 'never',
        '--json',
        '--output-schema', schemaPath,
        '-o', outPath,
        '-C', dir,
        '-c', `model_reasoning_effort="${effort}"`,
        ...(this.opts.model ? ['-m', this.opts.model] : []),
        '-', // prompt from stdin: no shell quoting, no length limits
      ];

      const prompt = `${req.system.trim()}\n\n---\n\n${req.prompt.trim()}\n\nRespond only with JSON matching the provided schema. Do not run any commands.`;
      const tokens = await run(bin!, args, prompt, this.opts.timeoutMs ?? 180_000, req.signal);

      const raw = await readFile(outPath, 'utf8').catch(() => '');
      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch {
        throw new AiError(`Codex returned non-JSON output for ${req.task}`, 'invalid-output');
      }
      const parsed = req.schema.safeParse(json);
      if (!parsed.success) {
        throw new AiError(`Codex output failed validation for ${req.task}: ${parsed.error.message}`, 'invalid-output');
      }
      return { value: parsed.data, cached: false, ms: Date.now() - started, tokens };
    } finally {
      release();
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

function run(bin: string, args: string[], stdin: string, timeoutMs: number, signal?: AbortSignal): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let tokens: number | null = null;
    let stderr = '';
    let lastEvents: string[] = [];
    let buffer = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new AiError(`Codex timed out after ${timeoutMs} ms`, 'timeout'));
    }, timeoutMs);
    const onAbort = () => {
      child.kill();
      reject(new AiError('aborted', 'failed'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
      buffer += chunk;
      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        tokens = usageFrom(line) ?? tokens;
        if (line.trim()) lastEvents = [...lastEvents.slice(-3), line.slice(0, 600)];
      }
    });
    child.stderr.setEncoding('utf8').on('data', (c: string) => (stderr += c));
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(new AiError(`Codex failed to start: ${e.message}`, 'unavailable'));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      if (code === 0) resolve(tokens);
      else {
        const detail = (stderr.slice(-500) || lastEvents.join('\n')).trim();
        if (/usage limit|rate limit/i.test(detail)) {
          reject(new AiError('ChatGPT usage limit reached', 'rate-limited', parseRetryAt(detail)));
        } else {
          reject(new AiError(`Codex exited with ${code}: ${detail}`, 'failed'));
        }
      }
    });
    child.stdin.end(stdin, 'utf8');
  });
}

/** Pull token usage out of a `--json` event line, if it carries any. */
function usageFrom(line: string): number | null {
  try {
    const ev = JSON.parse(line) as { usage?: { input_tokens?: number; output_tokens?: number } };
    if (ev.usage) return (ev.usage.input_tokens ?? 0) + (ev.usage.output_tokens ?? 0);
  } catch {
    /* non-JSON progress lines are fine */
  }
  return null;
}

/**
 * OpenAI structured outputs (strict) require every object to list all its
 * properties as required and forbid extra keys. Our LLM contracts are written
 * that way already (nullable instead of optional); this enforces it.
 */
export function toStrictJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { target: 'draft-7', io: 'output' }) as Record<string, unknown>;
  delete json.$schema;
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(visit);
    const obj = node as Record<string, unknown>;
    if (obj.type === 'object' && obj.properties && typeof obj.properties === 'object') {
      obj.additionalProperties = false;
      obj.required = Object.keys(obj.properties);
    }
    Object.values(obj).forEach(visit);
  };
  visit(json);
  return json;
}
