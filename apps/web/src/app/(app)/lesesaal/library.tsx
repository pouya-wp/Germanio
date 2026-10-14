'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { TextSummary } from '@germanio/client';
import { brain } from '@/lib/brain';
import { AiError } from '@/components/ai-error';
import { RevealLines } from '@/components/reveal';
import { T } from '@/components/t';

const TOPICS = ['WG-Suche in Köln', 'Mein erster Tag in der Ausbildung', 'Ein Bug am Freitag', 'Das Vorstellungsgespräch', 'Einkaufen im Supermarkt', 'Ein Projekt für einen Kunden'];
const KIND_LABEL: Record<TextSummary['kind'], string> = { import: 'Import', simplified: 'Vereinfacht', story: 'Geschichte', library: 'Bibliothek' };

export function Library() {
  const router = useRouter();
  const [texts, setTexts] = useState<TextSummary[] | null>(null);
  const [input, setInput] = useState('');
  const [topic, setTopic] = useState(TOPICS[0]!);
  const [busy, setBusy] = useState<'import' | 'story' | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    brain.texts().then((r) => setTexts(r.texts)).catch(() => setTexts([]));
  }, []);

  const run = async (kind: 'import' | 'story', fn: () => Promise<TextSummary>) => {
    setBusy(kind);
    setError(null);
    try {
      const t = await fn();
      router.push(`/lesesaal/${t.id}`);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  };

  const doImport = () => {
    const value = input.trim();
    if (!value) return;
    const isUrl = /^https?:\/\/\S+$/.test(value);
    const firstLine = value.split('\n')[0]!.slice(0, 80);
    void run('import', () => brain.importText(isUrl ? { url: value } : { title: firstLine, body: value }));
  };

  return (
    <div className="px-4 pt-8 pb-24 sm:px-12 sm:pt-14">
      <p className="label">Comprehensible Input · i + 1</p>
      <h1 className="mt-3 font-display text-[clamp(3rem,8vw,7.5rem)] leading-[0.88] font-semibold tracking-[-0.045em]">
        <RevealLines lines={['Lesesaal']} />
      </h1>

      <div className="mt-14 grid gap-12 lg:grid-cols-2">
        <section>
          <h2 className="border-b border-ink pb-3 text-xl font-semibold tracking-tight">
            <T k="lesesaal.import" />
          </h2>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={6}
            placeholder="https://www.tagesschau.de/…  oder einfach Text einfügen"
            className="mt-4 w-full resize-y border border-line bg-surface p-4 font-sans text-lg outline-none focus:border-ink"
            spellCheck={false}
          />
          <button
            onClick={doImport}
            disabled={busy !== null || !input.trim()}
            className="mt-3 border border-ink px-5 py-3 font-medium transition-colors hover:bg-ink hover:text-paper disabled:opacity-40"
          >
            {busy === 'import' ? '…' : <T k="lesesaal.importBtn" />}
          </button>
        </section>

        <section>
          <h2 className="border-b border-ink pb-3 text-xl font-semibold tracking-tight">
            <T k="lesesaal.story" />
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {TOPICS.map((t) => (
              <button
                key={t}
                onClick={() => setTopic(t)}
                className={`border px-3 py-1.5 text-sm transition-colors ${topic === t ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink'}`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="mt-4 w-full border-b border-line bg-transparent py-2 text-lg outline-none focus:border-ink"
          />
          <button
            onClick={() => void run('story', () => brain.story(topic))}
            disabled={busy !== null || topic.trim().length < 2}
            className="mt-4 border border-ink bg-ink px-5 py-3 font-medium text-paper transition-colors hover:bg-transparent hover:text-ink disabled:opacity-40"
          >
            {busy === 'story' ? 'Codex schreibt …' : <T k="lesesaal.write" />}
          </button>
          <p className="label mt-3">Bekannte Wörter + deine neuesten Lernwörter</p>
        </section>
      </div>
      <div className="mt-6">
        <AiError error={error} />
      </div>

      <section className="mt-20">
        <h2 className="flex items-baseline justify-between border-b border-ink pb-3">
          <span className="text-2xl font-semibold tracking-tight">
            <T k="lesesaal.texts" />
          </span>
          <span className="label">{texts?.length ?? 0}</span>
        </h2>
        <ul>
          {texts?.map((t) => (
            <li key={t.id} className="border-b border-line">
              <Link href={`/lesesaal/${t.id}`} className="group grid grid-cols-[1fr_auto] items-baseline gap-4 py-5 sm:grid-cols-[1fr_120px_80px_120px]">
                <span className="text-xl font-medium tracking-tight transition-transform group-hover:translate-x-2">{t.title}</span>
                <span className="label hidden sm:block">{KIND_LABEL[t.kind]}</span>
                <span className="label hidden sm:block">{t.level ?? '—'}</span>
                <span className="flex items-center gap-2">
                  <span className="h-px w-16 bg-line">
                    <span className="block h-px bg-ink" style={{ width: `${(t.coverage ?? 0) * 100}%` }} />
                  </span>
                  <span className="label tabular-nums">{t.coverage === null ? '–' : `${Math.round(t.coverage * 100)} %`}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {texts?.length === 0 && <p className="py-8 text-muted">Noch keine Texte. Importiere einen Artikel oder lass dir eine Geschichte schreiben.</p>}
      </section>
    </div>
  );
}
