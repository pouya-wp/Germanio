'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { adjectiveEnding, articleFor, type ArticleType, type Kasus, type Numerus } from '@germanio/core';
import { GENUS_TEXT } from '../genus';

/**
 * Adjektivendungen trainer — infinite, offline, rule-checked. The rule engine
 * lives in @germanio/core, so every answer is graded without any AI call.
 */
const NOUNS: { noun: string; plural: string; g: Exclude<Numerus, 'pl'> }[] = [
  { noun: 'Kollege', plural: 'Kollegen', g: 'der' },
  { noun: 'Computer', plural: 'Computer', g: 'der' },
  { noun: 'Kundin', plural: 'Kundinnen', g: 'die' },
  { noun: 'Wohnung', plural: 'Wohnungen', g: 'die' },
  { noun: 'Projekt', plural: 'Projekte', g: 'das' },
  { noun: 'Büro', plural: 'Büros', g: 'das' },
];
const ADJ = ['neu', 'klein', 'gut', 'schnell', 'freundlich', 'modern'];
const FRAMES: Record<Kasus, string> = {
  nom: 'Hier ist ___.',
  akk: 'Ich sehe ___.',
  dat: 'Ich spreche mit ___.',
  gen: 'Das ist die Idee ___.',
};

interface Task {
  type: ArticleType;
  numerus: Numerus;
  kasus: Kasus;
  noun: string;
  gender: Exclude<Numerus, 'pl'>;
  adj: string;
}

const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)]!;

function nounForm(t: Task): string {
  const n = NOUNS.find((x) => x.noun === t.noun)!;
  if (t.numerus === 'pl') return t.kasus === 'dat' && !n.plural.endsWith('n') && !n.plural.endsWith('s') ? `${n.plural}n` : n.plural;
  if (t.gender === 'der' && t.noun === 'Kollege' && t.kasus !== 'nom') return 'Kollegen';
  if (t.kasus === 'gen' && t.gender !== 'die') return `${t.noun}s`;
  return t.noun;
}

function newTask(): Task {
  const n = pick(NOUNS);
  const plural = Math.random() < 0.2;
  const type = pick<ArticleType>(['definite', 'definite', 'indefinite', 'indefinite', 'none']);
  return { type, numerus: plural ? 'pl' : n.g, kasus: pick<Kasus>(['nom', 'akk', 'akk', 'dat', 'dat', 'gen']), noun: n.noun, gender: n.g, adj: pick(ADJ) };
}

export function AdjektivTrainer() {
  const [task, setTask] = useState<Task | null>(null);
  const [given, setGiven] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const input = useRef<HTMLInputElement>(null);

  // Random tasks are created after mount so prerendered HTML stays deterministic.
  useEffect(() => setTask(newTask()), []);

  const check = useCallback(() => {
    if (!task || result !== null) return;
    const ok = given.trim().toLowerCase() === adjectiveEnding(task.type, task.numerus, task.kasus);
    setResult(ok);
    setScore((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1 }));
  }, [given, result, task]);

  const next = () => {
    setTask(newTask());
    setGiven('');
    setResult(null);
    setTimeout(() => input.current?.focus(), 0);
  };

  if (!task) return null;
  const ending = adjectiveEnding(task.type, task.numerus, task.kasus);
  const article = articleFor(task.type, task.numerus, task.kasus);
  const [before, after] = FRAMES[task.kasus].split('___');

  return (
    <div>
      <p className="label">
        {task.type === 'definite' ? 'bestimmter Artikel' : task.type === 'indefinite' ? 'ein / kein' : 'ohne Artikel'} · {task.kasus} ·{' '}
        <span className={task.numerus === 'pl' ? '' : GENUS_TEXT[task.gender]}>{task.numerus === 'pl' ? 'Plural' : task.gender}</span>
      </p>
      <p className="mt-4 text-[clamp(1.6rem,3.5vw,2.75rem)] leading-tight font-semibold tracking-tight">
        {before}
        {article && <span className={task.numerus === 'pl' ? '' : GENUS_TEXT[task.gender]}>{article} </span>}
        {task.adj}
        <input
          ref={input}
          value={given}
          onChange={(e) => setGiven(e.target.value.replace(/[^a-zäöüß]/gi, '').slice(0, 3))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (result === null) check();
              else next();
            }
          }}
          aria-label="Endung"
          className={`mx-0.5 w-[2.6ch] border-b-2 bg-transparent text-center outline-none ${result === null ? 'border-ink' : result ? 'border-ink' : 'border-ink line-through'}`}
        />{' '}
        {nounForm(task)}
        {after}
      </p>
      <div className="mt-6 flex items-center gap-4">
        {result === null ? (
          <button onClick={check} className="border border-ink px-4 py-2 font-medium hover:bg-ink hover:text-paper">Prüfen ↵</button>
        ) : (
          <>
            <span className="text-lg">{result ? '✓ Richtig' : `✗ -${ending}`}</span>
            <button onClick={next} className="border border-ink px-4 py-2 font-medium hover:bg-ink hover:text-paper">Weiter ↵</button>
          </>
        )}
        <span className="label ml-auto tabular-nums">{score.right} / {score.total}</span>
      </div>
    </div>
  );
}
