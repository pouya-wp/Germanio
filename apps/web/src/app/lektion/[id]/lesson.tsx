'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { UnitSummary } from '@germanio/client';
import type { Phrase, UnitContent, UnitMeta, UnitWord } from '@germanio/core';
import { brain } from '@/lib/brain';
import { say, voiceFor } from '@/lib/speak';
import { FaText } from '@/components/fa-text';
import { GENUS_TEXT } from '@/components/genus';
import { buildPractice, itemKey, PracticeView, type PracticeItem, type Verdict } from '@/components/lesson/practice';
import { useLearner } from '@/components/providers';

/**
 * One lesson = one focused session, no sidebar, no distractions:
 * Ziel → Wörter → Grammatik → Dialog → Üben → Sprechen → Geschafft.
 * Persian explains, German is what you practise.
 */
type Phase = 'ziel' | 'woerter' | 'saetze' | 'grammatik' | 'dialog' | 'ueben' | 'sprechen' | 'fertig';
const PHASES: { id: Phase; de: string }[] = [
  { id: 'ziel', de: 'Ziel' },
  { id: 'woerter', de: 'Wörter' },
  { id: 'saetze', de: 'Sätze' },
  { id: 'grammatik', de: 'Grammatik' },
  { id: 'dialog', de: 'Dialog' },
  { id: 'ueben', de: 'Üben' },
  { id: 'sprechen', de: 'Sprechen' },
  { id: 'fertig', de: 'Geschafft' },
];

export function Lesson() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ meta: UnitMeta; content: UnitContent } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('ziel');
  const startedAt = useRef(0);
  const wordResults = useRef<Record<string, boolean>>({});

  useEffect(() => {
    startedAt.current = Date.now();
    brain
      .unit(id)
      .then((d) => {
        setData(d);
        void brain.startUnit(id);
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  const go = (p: Phase) => {
    setPhase(p);
    window.scrollTo({ top: 0 });
  };

  if (error) {
    return (
      <Shell phase="ziel" title="">
        <p lang="fa" className="text-2xl">این درس هنوز نوشته نشده. فعلاً درس‌های قبلی را مرور کن.</p>
        <Link href="/kurs" className="mt-8 inline-block border border-ink px-5 py-3">← Der Weg</Link>
      </Shell>
    );
  }
  if (!data) return <Shell phase="ziel" title=""><p className="label">…</p></Shell>;
  const { meta, content } = data;

  return (
    <Shell phase={phase} title={`${meta.level} · ${meta.title}`}>
      <AnimatePresence mode="wait">
        <motion.div key={phase} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
          {phase === 'ziel' && <Ziel meta={meta} content={content} onNext={() => go('woerter')} />}
          {phase === 'woerter' && <Woerter words={content.words} results={wordResults.current} onNext={() => go('saetze')} />}
          {phase === 'saetze' && <Saetze phrases={content.phrases} onNext={() => go('grammatik')} />}
          {phase === 'grammatik' && <Grammatik g={content.grammar} onNext={() => go('dialog')} />}
          {phase === 'dialog' && <Dialog d={content.dialogue} onNext={() => go('ueben')} />}
          {phase === 'ueben' && <Ueben content={content} meta={meta} wordResults={wordResults.current} startedAt={startedAt.current} onDone={() => go('sprechen')} />}
          {phase === 'sprechen' && <Sprechen s={content.speaking} onNext={() => go('fertig')} />}
          {phase === 'fertig' && <Fertig meta={meta} content={content} />}
        </motion.div>
      </AnimatePresence>
    </Shell>
  );
}

// ── Frame ────────────────────────────────────────────────────────────────────

function Shell({ phase, title, children }: { phase: Phase; title: string; children: React.ReactNode }) {
  const idx = PHASES.findIndex((p) => p.id === phase);
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-5 py-6 sm:px-10">
      <header className="flex items-center gap-4">
        <Link href="/heute" className="label hover:text-ink" aria-label="Lektion verlassen">✕</Link>
        <div className="flex flex-1 gap-1">
          {PHASES.map((p, i) => (
            <div key={p.id} className="flex-1">
              <div className="h-1 bg-line">
                <motion.div className="h-1 bg-ink" initial={false} animate={{ width: i < idx ? '100%' : i === idx ? '50%' : '0%' }} transition={{ duration: 0.5 }} />
              </div>
              <span className={`label mt-1.5 hidden sm:block ${i === idx ? 'text-ink' : ''}`}>{p.de}</span>
            </div>
          ))}
        </div>
      </header>
      <p className="label mt-6">{title}</p>
      <div className="flex flex-1 flex-col py-8">
        <div className="my-auto">{children}</div>
      </div>
    </main>
  );
}

function Next({ onClick, children = 'Weiter', fa }: { onClick: () => void; children?: React.ReactNode; fa?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'INPUT') onClick();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClick]);
  return (
    <button onClick={onClick} className="mt-12 inline-flex w-fit items-center gap-3 border border-ink bg-ink px-7 py-4 text-lg font-medium text-paper transition-colors hover:bg-transparent hover:text-ink">
      {children} →{fa && <span lang="fa" className="opacity-70">· {fa}</span>}
    </button>
  );
}

// ── 1 · Ziel ─────────────────────────────────────────────────────────────────

function Ziel({ meta, content, onNext }: { meta: UnitMeta; content: UnitContent; onNext: () => void }) {
  const { health } = useLearner();
  return (
    <div>
      <p className="label">Nach dieser Lektion</p>
      <h1 className="mt-3 font-display text-[clamp(2.75rem,7vw,6rem)] leading-[0.92] font-semibold tracking-[-0.045em]">{meta.canDo.de}</h1>
      <p lang="fa" className="mt-4 text-left text-2xl font-medium">{meta.canDo.fa}</p>
      <p lang="fa" className="mt-8 max-w-3xl text-xl leading-relaxed text-ink-2"><FaText>{content.intro.fa}</FaText></p>
      <div className="mt-10 grid max-w-3xl grid-cols-2 gap-y-4 border-y border-line py-4 sm:grid-cols-4">
        <Fact n={content.words.length} de="Wörter" />
        <Fact n={content.phrases.length} de="Satzbausteine" />
        <Fact n={content.dialogue.lines.length} de="Sätze im Dialog" />
        <Fact n={content.exercises.length + content.words.length} de="Übungen" />
      </div>
      {health && health !== 'offline' && health.lab?.ready === false && (
        <p lang="fa" className="mt-6 text-sm text-muted">صدای Piper خاموش است؛ از صدای مرورگر استفاده می‌شود.</p>
      )}
      <Next onClick={onNext} fa="بزن بریم">Los geht’s</Next>
    </div>
  );
}

function Fact({ n, de }: { n: number; de: string }) {
  return (
    <div>
      <p className="text-4xl font-semibold tracking-tight tabular-nums">{n}</p>
      <p className="label mt-1">{de}</p>
    </div>
  );
}

// ── 2 · Wörter ───────────────────────────────────────────────────────────────

function Woerter({ words, results, onNext }: { words: UnitWord[]; results: Record<string, boolean>; onNext: () => void }) {
  const [i, setI] = useState(0);
  const w = words[i]!;
  useEffect(() => {
    void say(w.article ? `${w.article} ${w.de}` : w.de);
  }, [w]);
  const next = useCallback(() => (i + 1 < words.length ? setI(i + 1) : onNext()), [i, words.length, onNext]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        void say(w.example.de);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [w]);
  return (
    <div>
      <p className="label tabular-nums">Wort {i + 1} / {words.length} · Leertaste = Beispiel anhören</p>
      <AnimatePresence mode="wait">
        <motion.div key={w.de} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
          <button onClick={() => void say(w.article ? `${w.article} ${w.de}` : w.de)} className="mt-6 block text-left font-display text-[clamp(3.5rem,11vw,9rem)] leading-[0.9] font-semibold tracking-[-0.05em]">
            {w.article && <span className={`${GENUS_TEXT[w.article]} mr-[0.2em]`}>{w.article}</span>}
            {w.de}
          </button>
          {w.plural && <p className="mt-3 font-mono text-muted">Plural: die {w.plural}</p>}
          <p lang="fa" className="mt-6 text-left text-3xl font-medium">{w.fa}</p>
          {/* English is the learner's strongest bridge to German: cognates (Haus · house) stick instantly. */}
          <p lang="en" className="mt-1 text-xl text-muted">{w.en}</p>
          <button onClick={() => void say(w.example.de)} className="mt-10 block border-l-2 border-ink pl-5 text-left">
            <span className="block text-2xl">{w.example.de} <span className="text-muted">▶</span></span>
            <span lang="fa" className="mt-1 block text-left text-lg text-ink-2">{w.example.fa}</span>
          </button>
        </motion.div>
      </AnimatePresence>
      <div className="mt-12 flex flex-wrap gap-3">
        <button
          onClick={() => {
            results[w.de] = true;
            next();
          }}
          className="border border-line px-5 py-4 text-lg hover:border-ink"
          lang="fa"
        >
          از قبل بلدم
        </button>
        <Next onClick={next}>{i + 1 < words.length ? 'Nächstes Wort' : 'Zu den Sätzen'}</Next>
      </div>
    </div>
  );
}

// ── 2b · Sätze (Satzbausteine) ───────────────────────────────────────────────
// Whole sentences learned as chunks, each with a note on where German differs from
// Persian. Every translation task later in the lesson is built on one of these.

function Saetze({ phrases, onNext }: { phrases: Phrase[]; onNext: () => void }) {
  const [i, setI] = useState(0);
  const p = phrases[i]!;
  const speakable = p.de.split(' · ')[0]!.replace(/…/g, '').replace(/\s+([.,?!])/g, '$1').trim();
  useEffect(() => {
    if (!p.de.includes('…')) void say(speakable);
  }, [p, speakable]);
  const next = useCallback(() => (i + 1 < phrases.length ? setI(i + 1) : onNext()), [i, phrases.length, onNext]);
  return (
    <div>
      <p className="label tabular-nums">Satzbaustein {i + 1} / {phrases.length} · ganze Sätze, nicht Wort für Wort</p>
      <AnimatePresence mode="wait">
        <motion.div key={p.de} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
          <button onClick={() => void say(speakable)} className="mt-6 block text-left font-display text-[clamp(2.5rem,7vw,5.5rem)] leading-[0.95] font-semibold tracking-[-0.04em]">
            {p.de}
          </button>
          <p lang="fa" className="mt-6 text-left text-3xl font-medium">{p.fa}</p>
          {p.note && (
            <div className="mt-10 max-w-3xl border-l-2 border-ink bg-ink/[0.04] p-5">
              <p className="label">Anders als im Persischen</p>
              <p lang="fa" className="mt-2 text-xl leading-relaxed"><FaText>{p.note}</FaText></p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      <Next onClick={next}>{i + 1 < phrases.length ? 'Nächster Satz' : 'Zur Grammatik'}</Next>
    </div>
  );
}

// ── 3 · Grammatik ────────────────────────────────────────────────────────────

function Grammatik({ g, onNext }: { g: UnitContent['grammar']; onNext: () => void }) {
  const colour = (cell: string) => {
    const first = cell.split(' ')[0] as 'der' | 'die' | 'das';
    return first in GENUS_TEXT && !cell.includes('(Pl.)') ? GENUS_TEXT[first] : '';
  };
  return (
    <div>
      <p className="label">Grammatik</p>
      <h2 className="mt-3 text-[clamp(2rem,5vw,3.75rem)] leading-none font-semibold tracking-[-0.04em]">{g.title}</h2>
      <p lang="fa" className="mt-8 max-w-3xl text-xl leading-relaxed"><FaText>{g.fa}</FaText></p>
      <div className="mt-10 overflow-x-auto">
        <table className="w-full max-w-3xl border-collapse text-left">
          <thead>
            <tr className="border-b border-ink">
              {g.tableHead.map((h, i) => (
                <th key={i} className="label py-3 pr-6 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {g.table.map((row, r) => (
              <motion.tr key={r} className="border-b border-line" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + r * 0.07 }}>
                {row.map((cell, c) => (
                  <td key={c} className={`py-3 pr-6 text-2xl tracking-tight ${c === 0 ? 'text-muted' : 'font-semibold'} ${colour(cell)}`}>
                    {cell}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-10 space-y-4">
        {g.examples.map((ex) => (
          <li key={ex.de}>
            <button onClick={() => void say(ex.de)} className="text-left">
              <span className="block text-2xl">{ex.de} <span className="text-muted">▶</span></span>
              <span lang="fa" className="block text-left text-ink-2">{ex.fa}</span>
            </button>
          </li>
        ))}
      </ul>
      <Next onClick={onNext}>Zum Dialog</Next>
    </div>
  );
}

// ── 4 · Dialog ───────────────────────────────────────────────────────────────

function Dialog({ d, onNext }: { d: UnitContent['dialogue']; onNext: () => void }) {
  const [shown, setShown] = useState(1);
  const [showFa, setShowFa] = useState(true);
  const [playing, setPlaying] = useState(false);
  const line = d.lines[shown - 1]!;

  useEffect(() => {
    void say(line.de, voiceFor(line.speaker));
  }, [line]);

  const playAll = async () => {
    setPlaying(true);
    for (const l of d.lines) await say(l.de, voiceFor(l.speaker));
    setPlaying(false);
  };

  return (
    <div>
      <p className="label">Dialog · {d.title}</p>
      <p lang="fa" className="mt-2 text-lg text-ink-2">{d.fa}</p>
      <ol className="mt-8 space-y-5">
        {d.lines.slice(0, shown).map((l, i) => (
          <motion.li key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`grid grid-cols-[96px_1fr] gap-4 ${l.speaker === 'Pouya' ? 'pl-0 sm:pl-16' : ''}`}>
            <span className="label pt-2">{l.speaker}</span>
            <button onClick={() => void say(l.de, voiceFor(l.speaker))} className="text-left">
              <span className="block text-[clamp(1.25rem,2.4vw,1.75rem)] leading-snug font-medium">{l.de}</span>
              {showFa && <span lang="fa" className="mt-1 block text-left text-ink-2">{l.fa}</span>}
            </button>
          </motion.li>
        ))}
      </ol>
      <div className="mt-10 flex flex-wrap items-center gap-3">
        <button onClick={() => setShowFa((v) => !v)} className="border border-line px-4 py-3 hover:border-ink" lang="fa">
          {showFa ? 'پنهان کردن ترجمه' : 'نمایش ترجمه'}
        </button>
        {shown === d.lines.length && (
          <button onClick={() => void playAll()} disabled={playing} className="border border-line px-4 py-3 hover:border-ink disabled:opacity-40">
            ▶ Alles anhören
          </button>
        )}
        {shown < d.lines.length ? <Next onClick={() => setShown(shown + 1)}>Nächster Satz</Next> : <Next onClick={onNext}>Jetzt üben</Next>}
      </div>
    </div>
  );
}

// ── 5 · Üben ─────────────────────────────────────────────────────────────────

function Ueben({
  content,
  meta,
  wordResults,
  startedAt,
  onDone,
}: {
  content: UnitContent;
  meta: UnitMeta;
  wordResults: Record<string, boolean>;
  startedAt: number;
  onDone: () => void;
}) {
  const initial = useMemo(() => buildPractice(content.words, content.exercises), [content]);
  const [queue, setQueue] = useState<PracticeItem[]>(initial);
  const [pos, setPos] = useState(0);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const firstTry = useRef<Map<string, boolean>>(new Map());
  const item = queue[pos];

  const answer = (v: Verdict) => {
    if (!item) return;
    const key = itemKey(item);
    if (!firstTry.current.has(key)) {
      firstTry.current.set(key, v.correct);
      if (item.kind !== 'authored') wordResults[item.word.de] = (wordResults[item.word.de] ?? true) && v.correct;
    }
    // Mastery learning: a missed item comes back once at the end.
    if (!v.correct) setQueue((q) => [...q, item]);
    setVerdict(v);
  };

  const finish = useCallback(async () => {
    const results = [...firstTry.current.entries()];
    const authored = results.filter(([k]) => k.startsWith('a:'));
    const correctAuthored = authored.filter(([, ok]) => ok).length;
    const grammar = Object.fromEntries(meta.grammar.map((g) => [g, { correct: correctAuthored, total: authored.length }]));
    await brain
      .completeUnit(meta.id, {
        score: results.length ? results.filter(([, ok]) => ok).length / results.length : 1,
        words: wordResults,
        grammar,
        seconds: Math.round((Date.now() - startedAt) / 1000),
      })
      .catch(() => {});
    onDone();
  }, [meta, wordResults, startedAt, onDone]);

  const advance = useCallback(() => {
    setVerdict(null);
    if (pos + 1 < queue.length) setPos(pos + 1);
    else void finish();
  }, [pos, queue.length, finish]);

  useEffect(() => {
    if (!verdict) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Enter' && advance();
    const id = setTimeout(() => window.addEventListener('keydown', onKey), 50);
    return () => {
      clearTimeout(id);
      window.removeEventListener('keydown', onKey);
    };
  }, [verdict, advance]);

  if (!item) return null;
  const firstCorrect = [...firstTry.current.values()].filter(Boolean).length;

  return (
    <div>
      <div className="mb-8 flex items-center gap-4">
        <span className="label tabular-nums">{Math.min(pos + 1, queue.length)} / {queue.length}</span>
        <div className="h-px flex-1 bg-line">
          <motion.div className="h-px bg-ink" animate={{ width: `${(pos / queue.length) * 100}%` }} />
        </div>
        <span className="label tabular-nums">✓ {firstCorrect}</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={`${pos}-${itemKey(item)}`} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
          <PracticeView item={item} phrases={content.phrases} onAnswer={answer} locked={verdict !== null} />
        </motion.div>
      </AnimatePresence>
      <AnimatePresence>
        {verdict && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className={`mt-10 flex flex-wrap items-center justify-between gap-4 border-t-2 border-ink pt-5 ${verdict.correct ? '' : ''}`}
          >
            <div>
              <p className="text-2xl font-semibold">{verdict.correct ? '✓ Richtig!' : '✗ Fast.'}</p>
              {!verdict.correct && (
                <>
                  <p className="mt-1 text-xl">{verdict.answer}</p>
                  {verdict.fa && <p lang="fa" className="max-w-2xl text-ink-2"><FaText>{verdict.fa}</FaText></p>}
                  <p lang="fa" className="mt-1 text-sm text-muted">این یکی آخر دوباره می‌آید.</p>
                </>
              )}
            </div>
            <button autoFocus onClick={advance} className="border border-ink bg-ink px-6 py-3 font-medium text-paper hover:bg-transparent hover:text-ink">
              Weiter ↵
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── 6 · Sprechen ─────────────────────────────────────────────────────────────

function Sprechen({ s, onNext }: { s: UnitContent['speaking']; onNext: () => void }) {
  const [recording, setRecording] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const [denied, setDenied] = useState(false);

  const toggle = async () => {
    if (recording) {
      rec.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const r = new MediaRecorder(stream);
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setUrl(URL.createObjectURL(new Blob(chunks, { type: r.mimeType })));
        setRecording(false);
      };
      rec.current = r;
      r.start();
      setRecording(true);
    } catch {
      setDenied(true);
    }
  };

  return (
    <div>
      <p className="label">Sprechen · laut, nicht leise!</p>
      <p lang="fa" className="mt-4 text-2xl leading-relaxed">{s.fa}</p>
      <button onClick={() => void say(s.model)} className="mt-8 block border-l-2 border-ink pl-5 text-left">
        <span className="label">Beispiel</span>
        <span className="mt-1 block text-2xl">{s.model} <span className="text-muted">▶</span></span>
      </button>
      <div className="mt-10 flex flex-wrap items-center gap-4">
        <button onClick={() => void toggle()} className={`flex size-20 items-center justify-center rounded-full border-2 border-ink text-sm font-semibold transition-colors ${recording ? 'animate-pulse bg-ink text-paper' : 'hover:bg-ink hover:text-paper'}`}>
          {recording ? 'Stopp' : 'Aufnehmen'}
        </button>
        {url && <audio src={url} controls className="max-w-full" />}
      </div>
      {denied && <p lang="fa" className="mt-4 text-muted">دسترسی به میکروفون داده نشد — اشکالی ندارد، جمله را بلند بگو.</p>}
      {url && <p lang="fa" className="mt-4 text-ink-2">صدای خودت را با نمونه مقایسه کن. (امتیاز تلفظ خودکار به‌زودی.)</p>}
      <Next onClick={onNext}>{url ? 'Fertig' : 'Überspringen'}</Next>
    </div>
  );
}

// ── 7 · Geschafft ────────────────────────────────────────────────────────────

function Fertig({ meta, content }: { meta: UnitMeta; content: UnitContent }) {
  const router = useRouter();
  const { refresh } = useLearner();
  const [next, setNext] = useState<UnitSummary | null>(null);
  useEffect(() => {
    void refresh();
    brain.kurs().then((k) => setNext(k.current)).catch(() => {});
  }, [refresh]);

  return (
    <div>
      <p className="label">Geschafft · Lektion {meta.id.toUpperCase()}</p>
      <motion.h1
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="mt-3 font-display text-[clamp(2.75rem,7vw,6rem)] leading-[0.92] font-semibold tracking-[-0.045em]"
      >
        ✓ {meta.canDo.de}
      </motion.h1>
      <p lang="fa" className="mt-4 text-left text-2xl font-medium">{meta.canDo.fa}</p>
      <p lang="fa" className="mt-8 text-lg text-ink-2">این {content.words.length} واژه حالا به ستاره‌های جهان زبانی تو اضافه شدند و خودشان سر وقت برای مرور برمی‌گردند:</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {content.words.map((w, i) => (
          <motion.span key={w.de} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.06, type: 'spring', stiffness: 300, damping: 18 }} className="border border-line px-3 py-1.5 text-lg">
            {w.article && <span className={GENUS_TEXT[w.article]}>{w.article} </span>}
            {w.de}
          </motion.span>
        ))}
      </div>
      <div className="mt-14 flex flex-wrap gap-3">
        {next && next.authored && (
          <button onClick={() => router.push(`/lektion/${next.id}`)} className="inline-flex items-center gap-3 border border-ink bg-ink px-7 py-4 text-lg font-medium text-paper hover:bg-transparent hover:text-ink">
            Nächste Lektion: {next.title} →
          </button>
        )}
        <Link href="/heute" className="border border-line px-7 py-4 text-lg hover:border-ink">Zurück zu Heute</Link>
      </div>
    </div>
  );
}
