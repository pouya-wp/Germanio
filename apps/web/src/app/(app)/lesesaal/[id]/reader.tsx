'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { AnalyzedToken, LookupResponse, TextDetail } from '@germanio/client';
import { brain } from '@/lib/brain';
import { AiError } from '@/components/ai-error';
import { LookupCard } from '@/components/lookup-card';
import { T } from '@/components/t';

/** LingQ-style overlay: new words dotted, learning words tinted, known words plain. */
const STATUS_CLASS: Record<AnalyzedToken['status'], string> = {
  new: 'underline decoration-dotted decoration-1 underline-offset-[5px] decoration-muted',
  learning: 'bg-ink/[0.07]',
  known: '',
  unknown: '',
};

function sentenceAt(body: string, index: number): string {
  const start = Math.max(body.lastIndexOf('.', index), body.lastIndexOf('!', index), body.lastIndexOf('?', index), body.lastIndexOf('\n', index)) + 1;
  const ends = ['.', '!', '?', '\n'].map((c) => body.indexOf(c, index)).filter((i) => i >= 0);
  const end = ends.length ? Math.min(...ends) + 1 : body.length;
  return body.slice(start, end).trim();
}

export function Reader() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [text, setText] = useState<TextDetail | null>(null);
  const [selected, setSelected] = useState<{ token: AnalyzedToken; sentence: string } | null>(null);
  const [lookup, setLookup] = useState<LookupResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const interacted = useRef(false);

  useEffect(() => {
    brain.text(Number(id)).then(setText).catch(setError);
  }, [id]);

  // Reading time: each visible minute with some interaction counts as active reading.
  useEffect(() => {
    const mark = () => (interacted.current = true);
    window.addEventListener('scroll', mark, { passive: true });
    window.addEventListener('pointerdown', mark);
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void brain.logTime({ source: 'reader', activity: 'reading', seconds: 60, active: interacted.current }).catch(() => {});
      interacted.current = false;
    }, 60_000);
    return () => {
      clearInterval(timer);
      window.removeEventListener('scroll', mark);
      window.removeEventListener('pointerdown', mark);
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    brain.lookup(selected.token.lemma ?? selected.token.text).then(setLookup).catch(() => setLookup(null));
  }, [selected]);

  /** Render the body as paragraphs of interactive tokens, keeping the original spacing. */
  const paragraphs = useMemo(() => {
    if (!text) return [];
    const out: { start: number; end: number }[] = [];
    let pos = 0;
    for (const part of text.body.split(/\n\s*\n/)) {
      const start = text.body.indexOf(part, pos);
      out.push({ start, end: start + part.length });
      pos = start + part.length;
    }
    return out;
  }, [text]);

  if (error && !text) return <div className="px-12 pt-14"><AiError error={error} /></div>;
  if (!text) return <div className="label px-12 pt-14">…</div>;

  const simplify = async () => {
    setBusy(true);
    setError(null);
    try {
      const t = await brain.simplify(text.id);
      router.push(`/lesesaal/${t.id}`);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const renderRange = (start: number, end: number) => {
    const nodes: React.ReactNode[] = [];
    let cursor = start;
    for (const tok of text.tokens) {
      if (tok.start < start || tok.end > end) continue;
      if (tok.start > cursor) nodes.push(text.body.slice(cursor, tok.start));
      const active = selected?.token.start === tok.start;
      nodes.push(
        <span
          key={tok.start}
          role="button"
          tabIndex={-1}
          onClick={() => setSelected({ token: tok, sentence: sentenceAt(text.body, tok.start) })}
          className={`cursor-pointer rounded-[1px] transition-colors hover:bg-ink hover:text-paper ${STATUS_CLASS[tok.status]} ${active ? 'bg-ink text-paper' : ''}`}
        >
          {tok.text}
        </span>,
      );
      cursor = tok.end;
    }
    if (cursor < end) nodes.push(text.body.slice(cursor, end));
    return nodes;
  };

  const coverage = Math.round((text.coverage ?? 0) * 100);

  return (
    <div className="grid gap-10 px-4 pt-8 pb-24 sm:px-12 sm:pt-14 xl:grid-cols-[minmax(0,1fr)_380px]">
      <article>
        <Link href="/lesesaal" className="label hover:text-ink">← Lesesaal</Link>
        <h1 className="mt-4 max-w-[22ch] font-display text-[clamp(2.25rem,5vw,4.5rem)] leading-[0.95] font-semibold tracking-[-0.04em]">{text.title}</h1>
        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 border-y border-line py-3">
          <span className="label">{text.kind}{text.level ? ` · ${text.level}` : ''}</span>
          <span className="flex items-center gap-3">
            <span className="label"><T k="lesesaal.coverage" /></span>
            <span className="h-px w-24 bg-line"><span className="block h-px bg-ink" style={{ width: `${coverage}%` }} /></span>
            <span className="label tabular-nums">{coverage} %</span>
          </span>
          {text.sourceUrl && (
            <a href={text.sourceUrl} target="_blank" rel="noreferrer" className="label hover:text-ink">Quelle ↗</a>
          )}
          {text.kind === 'import' && (
            <button onClick={() => void simplify()} disabled={busy} className="label border border-ink px-3 py-1.5 text-ink hover:bg-ink hover:text-paper disabled:opacity-40">
              {busy ? 'Codex schreibt …' : <T k="lesesaal.simplify" />}
            </button>
          )}
        </div>
        <div className="mt-2"><AiError error={error} /></div>

        <div className="mt-10 max-w-[68ch] space-y-6 text-[clamp(1.15rem,1.6vw,1.4rem)] leading-[1.7]">
          {paragraphs.map((p, i) => (
            <p key={i}>{renderRange(p.start, p.end).map((n, j) => <Fragment key={j}>{n}</Fragment>)}</p>
          ))}
        </div>

        {text.glossary.length > 0 && (
          <section className="mt-16 max-w-[68ch]">
            <h2 className="label border-b border-ink pb-2">Wörter</h2>
            <dl className="grid grid-cols-2 gap-x-8">
              {text.glossary.map((g) => (
                <div key={g.de} className="flex items-baseline justify-between gap-4 border-b border-line py-2">
                  <dt className="font-medium">{g.de}</dt>
                  <dd lang="fa">{g.fa}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </article>

      <aside className="xl:sticky xl:top-8 xl:self-start">
        <div className="border border-ink bg-surface p-5">
          {selected && lookup ? (
            <>
              <p className="label mb-4 line-clamp-2 normal-case">„{selected.sentence}“</p>
              <LookupCard res={lookup} sentence={selected.sentence} source="reader" sourceUrl={text.sourceUrl} />
            </>
          ) : (
            <p className="text-muted">
              Klicke auf ein Wort.
              <span lang="fa" className="mt-2 block">روی هر واژه کلیک کن تا معنی و تلفظش را ببینی.</span>
            </p>
          )}
        </div>
        <ul className="label mt-4 space-y-1">
          <li><span className="underline decoration-dotted underline-offset-4">neu</span> · <span className="bg-ink/[0.07] px-1">lernend</span> · bekannt</li>
        </ul>
      </aside>
    </div>
  );
}
