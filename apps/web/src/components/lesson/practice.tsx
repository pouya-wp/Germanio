'use client';

import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { answersMatch, expandUmlautShortcuts, GENDERS, phraseFor, sentenceKey, type Exercise, type Gender, type Phrase, type UnitWord } from '@germanio/core';
import { say } from '@/lib/speak';
import { FaText } from '../fa-text';
import { GENUS_TEXT } from '../genus';

/**
 * Every practice item the lesson can throw at the learner. Authored items
 * (gap / order / translate) come from the unit file; the rest are generated
 * from the unit's words so a lesson always mixes recognition, gender,
 * listening and production — interleaving by construction.
 */
export type PracticeItem =
  | { kind: 'meaning'; word: UnitWord; options: string[] }
  | { kind: 'genus'; word: UnitWord }
  | { kind: 'listen'; word: UnitWord; options: string[] }
  | { kind: 'authored'; exercise: Exercise };

export function itemKey(item: PracticeItem): string {
  return item.kind === 'authored' ? `a:${item.exercise.type}:${'de' in item.exercise ? item.exercise.de : item.exercise.answer}` : `${item.kind}:${item.word.de}`;
}

const shuffle = <T,>(xs: T[]): T[] => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
};

/** Build the practice set: one recognition item per word, gender items, a few listening items, then all authored ones. */
export function buildPractice(words: UnitWord[], exercises: Exercise[]): PracticeItem[] {
  const pick = (exclude: UnitWord, field: 'fa' | 'de') =>
    shuffle([exclude[field], ...shuffle(words.filter((w) => w.de !== exclude.de)).slice(0, 3).map((w) => w[field])]);
  const meaning = words.map((w) => ({ kind: 'meaning' as const, word: w, options: pick(w, 'fa') }));
  const genus = words.filter((w) => w.article).map((w) => ({ kind: 'genus' as const, word: w }));
  const listen = shuffle(words).slice(0, 4).map((w) => ({ kind: 'listen' as const, word: w, options: pick(w, 'de') }));
  const authored = exercises.map((e) => ({ kind: 'authored' as const, exercise: e }));
  // Easy recognition first, production later; interleave inside each band.
  return [...shuffle([...meaning.slice(0, 8), ...genus.slice(0, 5)]), ...shuffle([...listen, ...authored])];
}

export interface Verdict {
  correct: boolean;
  answer: string;
  fa?: string;
}

/** Renders one item; calls onAnswer once with the verdict. */
export function PracticeView({ item, phrases, onAnswer, locked }: { item: PracticeItem; phrases: Phrase[]; onAnswer: (v: Verdict) => void; locked: boolean }) {
  switch (item.kind) {
    case 'meaning':
      return <Choice key={itemKey(item)} prompt={<Word w={item.word} />} hint="معنی این واژه چیست؟" options={item.options} correct={item.word.fa} fa onAnswer={onAnswer} locked={locked} sayText={item.word.de} />;
    case 'listen':
      return <Choice key={itemKey(item)} prompt={<ListenButton text={item.word.de} />} hint="چه شنیدی؟" options={item.options} correct={item.word.de} onAnswer={onAnswer} locked={locked} sayText={item.word.de} autoplay />;
    case 'genus':
      return <Genus key={itemKey(item)} word={item.word} onAnswer={onAnswer} locked={locked} />;
    case 'authored':
      if (item.exercise.type === 'gap') return <Gap key={itemKey(item)} ex={item.exercise} onAnswer={onAnswer} locked={locked} />;
      if (item.exercise.type === 'order') return <Order key={itemKey(item)} ex={item.exercise} onAnswer={onAnswer} locked={locked} />;
      return <Translate key={itemKey(item)} ex={item.exercise} phrase={phraseFor(item.exercise.answer, phrases)} onAnswer={onAnswer} locked={locked} />;
  }
}

function Word({ w }: { w: UnitWord }) {
  return (
    <span className="font-display text-[clamp(3rem,9vw,7rem)] leading-none font-semibold tracking-[-0.045em]">
      {w.article && <span className={`${GENUS_TEXT[w.article]} mr-[0.2em]`}>{w.article}</span>}
      {w.de}
    </span>
  );
}

function ListenButton({ text }: { text: string }) {
  return (
    <button onClick={() => void say(text)} className="flex size-28 items-center justify-center rounded-full border-2 border-ink text-4xl transition-transform hover:scale-105" aria-label="Nochmal hören">
      ▶
    </button>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p lang="fa" className="mt-4 text-left text-xl text-ink-2">
      {children}
    </p>
  );
}

function Choice({
  prompt,
  hint,
  options,
  correct,
  fa,
  onAnswer,
  locked,
  sayText,
  autoplay,
}: {
  prompt: React.ReactNode;
  hint: string;
  options: string[];
  correct: string;
  fa?: boolean;
  onAnswer: (v: Verdict) => void;
  locked: boolean;
  sayText: string;
  autoplay?: boolean;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => {
    if (autoplay) void say(sayText);
  }, [autoplay, sayText]);
  const choose = (o: string) => {
    if (picked || locked) return;
    setPicked(o);
    if (!autoplay) void say(sayText);
    onAnswer({ correct: o === correct, answer: correct });
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const i = ['1', '2', '3', '4'].indexOf(e.key);
      if (i >= 0 && options[i]) choose(options[i]!);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <div>
      <div className="flex min-h-40 items-center">{prompt}</div>
      <Hint>{hint}</Hint>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {options.map((o, i) => {
          const state = !picked ? 'idle' : o === correct ? 'right' : o === picked ? 'wrong' : 'idle';
          return (
            <button
              key={o}
              onClick={() => choose(o)}
              lang={fa ? 'fa' : 'de'}
              className={`flex items-center justify-between gap-4 border px-5 py-4 text-left text-xl transition-colors ${state === 'right' ? 'border-ink bg-ink text-paper' : state === 'wrong' ? 'border-ink line-through opacity-50' : 'border-line hover:border-ink'}`}
            >
              <span>{o}</span>
              <span className="label">{i + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Genus({ word, onAnswer, locked }: { word: UnitWord; onAnswer: (v: Verdict) => void; locked: boolean }) {
  const [picked, setPicked] = useState<Gender | null>(null);
  const choose = (g: Gender) => {
    if (picked || locked) return;
    setPicked(g);
    void say(`${word.article} ${word.de}`);
    onAnswer({ correct: g === word.article, answer: `${word.article} ${word.de}` });
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const i = ['1', '2', '3'].indexOf(e.key);
      if (i >= 0) choose(GENDERS[i]!);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <div>
      <div className="flex min-h-40 items-center font-display text-[clamp(3rem,9vw,7rem)] leading-none font-semibold tracking-[-0.045em]">
        <span className="mr-[0.25em] inline-block min-w-[2.2ch] text-right">
          {picked ? <span className={GENUS_TEXT[word.article!]}>{word.article}</span> : <span className="text-line">___</span>}
        </span>
        {word.de}
      </div>
      <Hint>der، die یا das؟ ({word.fa})</Hint>
      <div className="mt-8 grid max-w-xl grid-cols-3 border border-ink">
        {GENDERS.map((g, i) => (
          <button key={g} onClick={() => choose(g)} className={`border-r border-ink py-5 text-3xl font-semibold last:border-r-0 ${GENUS_TEXT[g]} ${picked && g === word.article ? 'bg-ink/[0.07]' : ''} ${picked === g && g !== word.article ? 'line-through opacity-50' : ''}`}>
            {g}
            <span className="label mt-1 block">{i + 1}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Gap({ ex, onAnswer, locked }: { ex: Extract<Exercise, { type: 'gap' }>; onAnswer: (v: Verdict) => void; locked: boolean }) {
  const [value, setValue] = useState('');
  const [done, setDone] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [before, after] = ex.de.split('___');
  useEffect(() => input.current?.focus(), []);
  const check = () => {
    if (done || locked || !value.trim()) return;
    setDone(true);
    const ok = [ex.answer, ...(ex.accept ?? [])].some((a) => answersMatch(value, a));
    void say(ex.de.replace('___', ex.answer));
    onAnswer({ correct: ok, answer: ex.de.replace('___', ex.answer), fa: ex.fa });
  };
  return (
    <div>
      <p className="label">Lückentext</p>
      <p className="mt-6 text-[clamp(1.75rem,4vw,3rem)] leading-tight font-semibold tracking-tight">
        {before}
        <input
          ref={input}
          value={value}
          disabled={done}
          onChange={(e) => setValue(expandUmlautShortcuts(e.target.value))}
          onKeyDown={(e) => e.key === 'Enter' && check()}
          style={{ width: `${Math.max(3, ex.answer.length + 1)}ch` }}
          className="mx-1 border-b-2 border-ink bg-transparent text-center outline-none"
          aria-label="Lücke"
          spellCheck={false}
          autoComplete="off"
        />
        {after}
      </p>
      <Hint>{ex.fa}</Hint>
      {!done && (
        <button onClick={check} className="mt-8 border border-ink px-5 py-3 font-medium hover:bg-ink hover:text-paper">
          Prüfen ↵
        </button>
      )}
    </div>
  );
}

function Order({ ex, onAnswer, locked }: { ex: Extract<Exercise, { type: 'order' }>; onAnswer: (v: Verdict) => void; locked: boolean }) {
  const pool = useMemo(() => shuffle(ex.words.map((w, i) => ({ w, i }))), [ex]);
  const [line, setLine] = useState<{ w: string; i: number }[]>([]);
  const [done, setDone] = useState(false);
  const remaining = pool.filter((p) => !line.some((l) => l.i === p.i));
  const check = () => {
    if (done || locked) return;
    setDone(true);
    void say(ex.answer);
    onAnswer({ correct: sentenceKey(line.map((l) => l.w).join(' ')) === sentenceKey(ex.answer), answer: ex.answer, fa: ex.fa });
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Enter' && remaining.length === 0 && check();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <div>
      <p className="label">Satzbau · Das Verb steht auf Position 2</p>
      <Hint>{ex.fa}</Hint>
      <div className="mt-8 flex min-h-20 flex-wrap items-center gap-2 border-b-2 border-ink pb-3">
        {line.map((l, k) => (
          <motion.button layoutId={`w${l.i}`} key={l.i} onClick={() => !done && setLine(line.filter((x) => x.i !== l.i))} className="border border-ink bg-ink px-4 py-2 text-2xl font-semibold text-paper">
            {k === 0 ? l.w.charAt(0).toUpperCase() + l.w.slice(1) : l.w}
          </motion.button>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {remaining.map((p) => (
          <motion.button layoutId={`w${p.i}`} key={p.i} onClick={() => !done && setLine([...line, p])} className="border border-line px-4 py-2 text-2xl font-medium hover:border-ink">
            {p.w}
          </motion.button>
        ))}
      </div>
      {!done && remaining.length === 0 && (
        <button onClick={check} className="mt-8 border border-ink px-5 py-3 font-medium hover:bg-ink hover:text-paper">
          Prüfen ↵
        </button>
      )}
    </div>
  );
}

function Translate({
  ex,
  phrase,
  onAnswer,
  locked,
}: {
  ex: Extract<Exercise, { type: 'translate' }>;
  phrase: Phrase | null;
  onAnswer: (v: Verdict) => void;
  locked: boolean;
}) {
  const [value, setValue] = useState('');
  const [done, setDone] = useState(false);
  const [hint, setHint] = useState(false);
  const check = () => {
    if (done || locked || !value.trim()) return;
    setDone(true);
    const ok = [ex.answer, ...ex.accept].some((a) => sentenceKey(a) === sentenceKey(value));
    void say(ex.answer);
    // A wrong answer explains the pattern, not just the solution.
    onAnswer({ correct: ok, answer: ex.answer, ...(phrase?.note ? { fa: phrase.note } : {}) });
  };
  return (
    <div>
      <p className="label">Übersetze ins Deutsche</p>
      <p lang="fa" className="mt-6 text-[clamp(1.75rem,4vw,2.75rem)] leading-tight font-semibold">
        {ex.fa}
      </p>
      <input
        autoFocus
        value={value}
        disabled={done}
        onChange={(e) => setValue(expandUmlautShortcuts(e.target.value))}
        onKeyDown={(e) => e.key === 'Enter' && check()}
        className="mt-8 w-full border-b-2 border-ink bg-transparent py-3 text-3xl font-medium tracking-tight outline-none"
        placeholder="Auf Deutsch …"
        spellCheck={false}
        autoComplete="off"
        lang="de"
      />
      <p className="label mt-3">a: → ä · o: → ö · u: → ü · s: → ß</p>
      {hint && phrase && (
        <div className="mt-6 border-l-2 border-ink pl-4">
          <p className="text-2xl font-semibold tracking-tight">{phrase.de}</p>
          {phrase.note && <p lang="fa" className="mt-1 text-ink-2"><FaText>{phrase.note}</FaText></p>}
        </div>
      )}
      {!done && (
        <div className="mt-6 flex gap-3">
          <button onClick={check} className="border border-ink px-5 py-3 font-medium hover:bg-ink hover:text-paper">
            Prüfen ↵
          </button>
          {phrase && !hint && (
            <button onClick={() => setHint(true)} lang="fa" className="border border-line px-5 py-3 hover:border-ink">
              راهنما: الگوی جمله
            </button>
          )}
        </div>
      )}
    </div>
  );
}
