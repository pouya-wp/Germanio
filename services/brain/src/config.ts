import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

export interface Config {
  host: string;
  port: number;
  dataDir: string;
  dictionaryPath: string;
  learnerPath: string;
  /** Browser origins allowed to talk to brain. Non-browser clients send no Origin. */
  allowedOrigins: (origin: string) => boolean;
  ai: { provider: 'codex' | 'recorded'; model: string | null; reasoningEffort: 'low' | 'medium' | 'high' };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const dataDir = resolve(env.GERMANIO_DATA ?? resolve(repoRoot, 'data'));
  mkdirSync(dataDir, { recursive: true });

  // Firefox gives each install a random UUID origin (moz-extension://<uuid>); pin it via env once known.
  const extensionId = env.GERMANIO_EXTENSION_ID;
  const webOrigins = new Set(
    (env.GERMANIO_WEB_ORIGINS ?? 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:1420,http://tauri.localhost,tauri://localhost')
      .split(',')
      .map((s) => s.trim()),
  );

  return {
    host: '127.0.0.1',
    port: Number(env.GERMANIO_PORT ?? 4317),
    dataDir,
    dictionaryPath: resolve(dataDir, 'dictionary.sqlite'),
    learnerPath: env.GERMANIO_LEARNER_DB ?? resolve(dataDir, 'learner.sqlite'),
    allowedOrigins: (origin) =>
      webOrigins.has(origin) ||
      (extensionId
        ? origin === `moz-extension://${extensionId}` || origin === `chrome-extension://${extensionId}`
        : origin.startsWith('moz-extension://') || origin.startsWith('chrome-extension://')),
    ai: {
      provider: env.GERMANIO_AI === 'recorded' ? 'recorded' : 'codex',
      model: env.GERMANIO_MODEL ?? null,
      reasoningEffort: (env.GERMANIO_REASONING as Config['ai']['reasoningEffort']) ?? 'low',
    },
  };
}
