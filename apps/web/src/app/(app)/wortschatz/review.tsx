'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GENDERS, normalizeKey, preview, Rating, State, tokenize, type Card, type Gender, type Grade } from '@germanio/core';
import { brain } from '@/lib/brain';
import type { StringKey } from '@/lib/strings';
import { Article, GENUS_TEXT } from '@/components/genus';
import { useLearner } from '@/components/providers';
import { T } from '@/components/t';

const GRADES: { g: Grade; k: StringKey; key: string }[] = [
  { g: Rating.Again, k: 'review.again', key: '1' },
  { g: Rating.Hard, k: 'review.hard', key: '2' },
  { g: Rating.Good, k: 'review.good', key: '3' },
  { g: Rating.Easy, k: 'review.easy', key: '4' },
];

/** Piper (local neural TTS via brain → lab); the browser's own voice is the fallback. */
function speak(text: string) {
  if (typeof window === 'undefined') return;
  const a = new Audio(brain.ttsUrl(text));
  a.play().catch(() => browserSpeak(text));
}

function browserSpeak(text: string) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'de-DE';
  u.rate = 0.92;
  const voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith('de'));
  if (voice) u.voice = voice;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

function humanInterval(fromIso: string, now: number): string {
  const mins = (Date.parse(fromIso) - now) / 60_000;
  if (mins < 60) return `${Math.max(1, Math.round(mins))} min`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h`;
  const days = mins / 1440;
  if (days < 31) return `${Math.round(days)} T`;
  return `${(days / 30).toFixed(1)} M`;
}

/** Highlight the card's word inside its context sentence (inflected forms included, roughly). */
function Highlighted({ sentence, lemma }: { sentence: string; lemma: string }) {
  const stem = normalizeKey(lemma).slice(0, Math.max(3, lemma.length - 2));
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const t of tokenize(sentence)) {
    if (normalizeKey(t.text).startsWith(stem)) {
      parts.push(sentence.slice(last, t.start), <mark key={t.start} className="bg-transparent font-semibold text-ink underline decoration-1 underline-offset-4">{t.text}</mark>);
      last = t.end;
    }
  }
  parts.push(sentence.slice(last));
  return <>{parts}</>;
}

export function Review() {
  const [queue, setQueue] = useState<Card[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [genusPick, setGenusPick] = useState<Gender | null>(null);
  const [done, setDone] = useState({ reviewed: 0, again: 0 });
  const shownAt = useRef(0);
  const busy = useRef(false);
  const { refresh } = useLearner();

  const load = useCallback(() => {
    brain
      .queue(60)
      .then((q) => {
        setQueue(q.cards);
        setIndex(0);
      })
      .catch(() => setQueue([]));
  }, []);

  useEffect(load, [load]);

  const card = queue?.[index] ?? null;
  // Interval previews are computed after mount (time-dependent), never during prerender.
  const [intervals, setIntervals] = useState<{ at: number; due: Record<Grade, string> } | null>(null);
  useEffect(() => {
    setIntervals(card ? { at: Date.now(), due: preview(card.memory) } : null);
  }, [card]);

  useEffect(() => {
    shownAt.current = Date.now();
    setRevealed(false);
    setGenusPick(null);
  }, [card?.id]);

  const rate = useCallback(
    async (g: Grade) => {
      if (!card || busy.current) return;
      busy.current = true;
      try {
        await brain.review({ cardId: card.id, rating: g, durationMs: Math.min(600_000, Date.now() - shownAt.current) });
        setDone((d) => ({ reviewed: d.reviewed + 1, again: d.again + (g === Rating.Again ? 1 : 0) }));
        // "Again" cards come back at the end of this session (short-term learning step).
        if (g === Rating.Again) setQueue((q) => (q ? [...q, card] : q));
        setIndex((i) => i + 1);
      } finally {
        busy.current = false;
      }
    },
    [card],
  );

  const pickGenus = useCallback(
    (g: Gender) => {
      if (!card || genusPick) return;
      setGenusPick(g);
      setRevealed(true);
      speak(`${card.gender} ${card.lemma}`);
    },
    [card, genusPick],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!card || e.metaKey || e.ctrlKey || (e.target as HTMLElement).tagName === 'INPUT') return;
      if (card.kind === 'genus' && !revealed) {
        const i = ['1', '2', '3'].indexOf(e.key);
        if (i >= 0) pickGenus(GENDERS[i]!);
        return;
      }
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        setRevealed(true);
        if (card.kind === 'recognition') speak(card.lemma);
        return;
      }
      if (revealed) {
        if (card.kind === 'genus' && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault();
          void rate(genusPick === card.gender ? Rating.Good : Rating.Again);
          return;
        }
        const grade = GRADES.find((g) => g.key === e.key);
        if (grade && card.kind !== 'genus') void rate(grade.g);
      }
      if (e.key.toLowerCase() === 's') speak(card.sentence ?? card.lemma);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, revealed, genusPick, pickGenus, rate]);

  useEffect(() => {
    if (queue && index >= queue.length && done.reviewed > 0) void refresh();
  }, [queue, index, done.reviewed, refresh]);

  if (!queue) return <div className="label px-12 pt-14">…</div>;

  const total = queue.length;
  if (!card) {
    return (
      <div className="flex min-h-[80dvh] flex-col justify-end px-4 pb-16 sm:px-12">
        <p className="label">{done.reviewed} Karten · {done.again}× nochmal</p>
        <h1 className="mt-4 font-display text-[clamp(3rem,8vw,7rem)] leading-[0.9] font-semibold tracking-[-0.045em]">
          <T k="review.done" />
        </h1>
        <div className="mt-10 flex gap-4">
          <button onClick={load} className="border border-ink px-5 py-3 font-medium hover:bg-ink hover:text-paper">
            Mehr laden
          </button>
          <Link href="/heute" className="px-5 py-3 font-medium text-muted hover:text-ink">
            ← <T k="nav.heute" />
          </Link>
        </div>
      </div>
    );
  }

  const isNew = card.memory.state === State.New;
  const correctGenus = genusPick !== null && genusPick === card.gender;

  return (
    <div className="flex min-h-dvh flex-col px-4 pt-8 pb-10 sm:px-12 sm:pt-14">
      {/* progress */}
      <div className="flex items-center gap-4">
        <span className="label tabular-nums">
          {Math.min(index + 1, total)} / {total}
        </span>
        <div className="h-px flex-1 bg-line">
          <motion.div className="h-px bg-ink" animate={{ width: `${(index / total) * 100}%` }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} />
        </div>
        <span className="label">{isNew ? 'neu' : card.kind === 'genus' ? 'Genus' : 'Wiederholung'}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.section
          key={`${card.id}-${index}`}
          className="flex flex-1 flex-col justify-center py-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          {card.kind === 'genus' ? (
            <>
              <p className="label">
                <T k="review.genusPrompt" />
              </p>
              <h1 className="mt-4 font-display text-[clamp(3.5rem,11vw,10rem)] leading-[0.88] font-semibold tracking-[-0.05em]">
                <span className="inline-block min-w-[2.2ch] text-right">
                  {revealed ? <Article gender={card.gender} /> : <span className="text-line">___</span>}
                </span>{' '}
                {card.lemma}
              </h1>
              <div className="mt-10 grid max-w-xl grid-cols-3 border border-ink">
                {GENDERS.map((g, i) => {
                  const state = !revealed ? 'idle' : g === card.gender ? 'right' : g === genusPick ? 'wrong' : 'idle';
                  return (
                    <button
                      key={g}
                      onClick={() => pickGenus(g)}
                      disabled={revealed}
                      className={`border-r border-ink py-5 text-3xl font-semibold tracking-tight last:border-r-0 ${GENUS_TEXT[g]} transition-colors ${state === 'right' ? 'bg-ink/5' : ''} ${state === 'wrong' ? 'line-through opacity-50' : ''}`}
                    >
                      {g}
                      <span className="label mt-1 block">{i + 1}</span>
                    </button>
                  );
                })}
              </div>
              {revealed && (
                <p className="mt-6 text-lg">
                  {correctGenus ? '✓ Richtig.' : `✗ Es heißt ${card.gender} ${card.lemma}.`}{' '}
                  <span className="label ml-2">Leertaste → weiter</span>
                </p>
              )}
            </>
          ) : (
            <>
              <h1 className="font-display text-[clamp(3.5rem,11vw,10rem)] leading-[0.88] font-semibold tracking-[-0.05em]">
                <Article gender={card.gender} className="mr-[0.25em]" />
                {card.lemma}
              </h1>
              {card.sentence && (
                <p className="mt-8 max-w-3xl text-[clamp(1.25rem,2.2vw,1.75rem)] leading-snug text-ink-2">
                  <Highlighted sentence={card.sentence} lemma={card.lemma} />
                </p>
              )}
              <div className="mt-10 min-h-[7rem] border-t border-line pt-6">
                {revealed ? (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                    <Meaning meaning={card.meaning} />
                    {card.sentenceTranslation && (
                      <p className="mt-3 text-muted" lang={/[؀-ۿ]/.test(card.sentenceTranslation) ? 'fa' : 'en'}>
                        {card.sentenceTranslation}
                      </p>
                    )}
                  </motion.div>
                ) : (
                  <button onClick={() => setRevealed(true)} className="label hover:text-ink">
                    <T k="review.show" /> · Leertaste
                  </button>
                )}
              </div>
            </>
          )}
        </motion.section>
      </AnimatePresence>

      {card.kind !== 'genus' && (
        <div className={`grid grid-cols-4 border border-ink transition-opacity ${revealed ? 'opacity-100' : 'pointer-events-none opacity-25'}`}>
          {GRADES.map(({ g, k, key }) => (
            <button
              key={g}
              onClick={() => void rate(g)}
              className="group border-r border-ink px-3 py-4 text-left transition-colors last:border-r-0 hover:bg-ink hover:text-paper"
            >
              <span className="block text-lg font-medium">
                <T k={k} />
              </span>
              <span className="label mt-1 block tabular-nums group-hover:text-paper/70">
                {key} · {intervals ? humanInterval(intervals.due[g], intervals.at) : ''}
              </span>
            </button>
          ))}
        </div>
      )}
      <p className="label mt-4">S · vorlesen &nbsp;&nbsp; ⌘K · nachschlagen</p>
    </div>
  );
}

/** Meaning may be "فارسی · english" once Nachtschicht has glossed it, or English only before. */
function Meaning({ meaning }: { meaning: string }) {
  const [fa, en] = meaning.includes(' · ') ? meaning.split(' · ') : [null, meaning];
  return (
    <div>
      {fa && (
        <p lang="fa" className="text-3xl font-medium">
          {fa}
        </p>
      )}
      <p className={fa ? 'mt-1 text-lg text-ink-2' : 'text-2xl'}>{en}</p>
    </div>
  );
}
