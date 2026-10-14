'use client';

import { useEffect, useState } from 'react';
import type { JournalEntry } from '@germanio/client';
import { expandUmlautShortcuts, type Correction } from '@germanio/core';
import { brain } from '@/lib/brain';
import { AiError } from '@/components/ai-error';
import { RevealLines } from '@/components/reveal';
import { useLearner } from '@/components/providers';
import { T } from '@/components/t';

const IMPULSE = [
  'Was hast du heute gemacht?',
  'Beschreibe dein Zimmer.',
  'Schreib eine kurze E-Mail an deinen Vermieter: Die Heizung ist kaputt.',
  'Warum möchtest du eine Ausbildung in Deutschland machen?',
  'Was ist dein Lieblingsprojekt am Computer? Erkläre es.',
  'Stell dich vor: Name, Herkunft, Hobbys, Ziele.',
];

/** Mark each corrected span inside the learner's own text: wrong struck through, right beside it. */
function Marked({ text, correction }: { text: string; correction: Correction }) {
  const marks = correction.errors
    .map((e, i) => ({ i, at: text.indexOf(e.original), e }))
    .filter((m) => m.at >= 0 && m.e.original.length > 0)
    .sort((a, b) => a.at - b.at);
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  for (const m of marks) {
    if (m.at < cursor) continue;
    nodes.push(text.slice(cursor, m.at));
    nodes.push(
      <span key={m.i} className="whitespace-nowrap">
        <s className="text-muted decoration-1">{m.e.original}</s>{' '}
        <span className="border-b-2 border-ink font-medium">{m.e.correction}</span>
        <sup className="label ml-0.5">{m.i + 1}</sup>
      </span>,
    );
    cursor = m.at + m.e.original.length;
  }
  nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}

export function Journal() {
  const [prompt, setPrompt] = useState(IMPULSE[0]!);
  const [text, setText] = useState('');
  const [result, setResult] = useState<{ text: string; correction: Correction } | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const { t, refresh } = useLearner();

  const load = () => brain.journal().then((r) => setEntries(r.entries)).catch(() => {});
  useEffect(() => void load(), []);

  const submit = async () => {
    const value = text.trim();
    if (!value) return;
    setBusy(true);
    setError(null);
    try {
      const r = await brain.write(value, prompt);
      setResult({ text: value, correction: r.correction });
      setText('');
      void load();
      void refresh();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="px-4 pt-8 pb-24 sm:px-12 sm:pt-14">
      <p className="label">Output-Hypothese · Noticing</p>
      <h1 className="mt-3 font-display text-[clamp(3rem,8vw,7.5rem)] leading-[0.88] font-semibold tracking-[-0.045em]">
        <RevealLines lines={[<T key="t" k="schreiben.title" />]} />
      </h1>

      <div className="mt-12 flex flex-wrap gap-2">
        {IMPULSE.map((p) => (
          <button
            key={p}
            onClick={() => setPrompt(p)}
            className={`border px-3 py-1.5 text-left text-sm transition-colors ${prompt === p ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink'}`}
          >
            {p}
          </button>
        ))}
      </div>

      <section className="mt-8 max-w-4xl">
        <p className="text-2xl font-medium tracking-tight">{prompt}</p>
        <textarea
          value={text}
          onChange={(e) => setText(expandUmlautShortcuts(e.target.value))}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') void submit();
          }}
          rows={9}
          placeholder={t('schreiben.placeholder').text}
          className="mt-4 w-full resize-y border border-line bg-surface p-5 text-xl leading-relaxed outline-none focus:border-ink"
          lang="de"
          spellCheck={false}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <span className="label">{words} Wörter · a: → ä · o: → ö · u: → ü · s: → ß · Strg+Enter</span>
          <button
            onClick={() => void submit()}
            disabled={busy || !text.trim()}
            className="border border-ink bg-ink px-5 py-3 font-medium text-paper transition-colors hover:bg-transparent hover:text-ink disabled:opacity-40"
          >
            {busy ? 'Codex liest …' : <T k="schreiben.submit" />}
          </button>
        </div>
        <div className="mt-4"><AiError error={error} /></div>
      </section>

      {result && <CorrectionView text={result.text} c={result.correction} />}

      <section className="mt-20 max-w-4xl">
        <h2 className="border-b border-ink pb-3 text-2xl font-semibold tracking-tight">
          <T k="schreiben.history" />
        </h2>
        <ul>
          {entries.map((e) => (
            <li key={e.id} className="border-b border-line py-5">
              <p className="label">{new Date(e.createdAt).toLocaleDateString('de-DE')} · {e.correction?.cefrEstimate ?? '—'} · {e.correction?.errors.length ?? 0} Fehler</p>
              <p className="mt-2 text-lg leading-relaxed">{e.correction ? <Marked text={e.text} correction={e.correction} /> : e.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function CorrectionView({ text, c }: { text: string; c: Correction }) {
  return (
    <section className="mt-14 max-w-4xl border-t border-ink pt-8">
      <div className="flex items-baseline justify-between">
        <p className="label">Korrektur · geschätzt {c.cefrEstimate}</p>
        <p className="label">{c.errors.length} Fehler</p>
      </div>
      <p className="mt-6 text-2xl leading-relaxed"><Marked text={text} correction={c} /></p>
      <p className="mt-6 text-lg">„{c.praiseDe}“</p>
      <ol className="mt-10">
        {c.errors.map((e, i) => (
          <li key={i} className="grid gap-2 border-b border-line py-5 sm:grid-cols-[2rem_1fr_1fr]">
            <span className="label">{i + 1}</span>
            <div>
              <p className="font-medium">
                <s className="text-muted">{e.original}</s> → {e.correction}
              </p>
              <p className="mt-1 text-ink-2">{e.explanationDe}</p>
              <p className="label mt-2">{e.conceptId}{e.severity === 'major' ? ' · wichtig' : ''}</p>
            </div>
            <p lang="fa" className="text-lg">{e.explanationFa}</p>
          </li>
        ))}
      </ol>
      <p className="mt-6 border-l-2 border-ink pl-4 text-xl">{c.corrected}</p>
    </section>
  );
}
