'use client';

import { motion } from 'motion/react';
import { useState } from 'react';
import { ARTICLES, type Kasus, type Numerus } from '@germanio/core';

/**
 * Kasus-Maschine: pick a trigger (verb role or preposition), the machine routes
 * it to a case and lights up the article row. Columns carry the gender colours.
 */
const TRIGGERS: { label: string; kasus: Kasus; why: string; fa: string }[] = [
  { label: 'Subjekt', kasus: 'nom', why: 'Wer? Was? — das Subjekt', fa: 'فاعل جمله' },
  { label: 'sehen / haben / brauchen', kasus: 'akk', why: 'Wen? Was? — direktes Objekt', fa: 'مفعول مستقیم' },
  { label: 'für · ohne · durch · gegen · um', kasus: 'akk', why: 'Diese Präpositionen wollen immer Akkusativ', fa: 'این حروف اضافه همیشه مفعولی می‌خواهند' },
  { label: 'helfen / danken / gefallen', kasus: 'dat', why: 'Wem? — Dativ-Verben', fa: 'فعل‌هایی که «به کسی» می‌خواهند' },
  { label: 'mit · bei · nach · seit · von · zu · aus', kasus: 'dat', why: 'Immer Dativ', fa: 'این حروف اضافه همیشه Dativ می‌خواهند' },
  { label: 'in / auf / an — wohin?', kasus: 'akk', why: 'Wechselpräposition + Bewegung → Akkusativ', fa: 'حرکت به سمت جایی ← مفعولی' },
  { label: 'in / auf / an — wo?', kasus: 'dat', why: 'Wechselpräposition + Ort → Dativ', fa: 'مکانِ ثابت ← Dativ' },
  { label: 'wegen · trotz · während', kasus: 'gen', why: 'Genitiv (gesprochen oft Dativ)', fa: 'Genitiv؛ در گفتار اغلب Dativ' },
];

const CASES: { key: Kasus; label: string }[] = [
  { key: 'nom', label: 'Nominativ' },
  { key: 'akk', label: 'Akkusativ' },
  { key: 'dat', label: 'Dativ' },
  { key: 'gen', label: 'Genitiv' },
];
const COLS: { key: Numerus; label: string; cls: string; noun: string }[] = [
  { key: 'der', label: 'der', cls: 'text-der', noun: 'Kollege' },
  { key: 'die', label: 'die', cls: 'text-die', noun: 'Kundin' },
  { key: 'das', label: 'das', cls: 'text-das', noun: 'Büro' },
  { key: 'pl', label: 'Plural', cls: '', noun: 'Leute' },
];

export function KasusMaschine() {
  const [trigger, setTrigger] = useState(TRIGGERS[4]!);
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <ul className="border-t border-ink">
        {TRIGGERS.map((t) => (
          <li key={t.label}>
            <button
              onClick={() => setTrigger(t)}
              className={`flex w-full items-baseline justify-between gap-4 border-b border-line py-3 text-left transition-[padding] ${trigger === t ? 'pl-3 font-semibold' : 'text-ink-2 hover:pl-2'}`}
            >
              <span>{t.label}</span>
              <span className="label">{t.kasus}</span>
            </button>
          </li>
        ))}
      </ul>
      <div>
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <th className="label pb-3 font-normal" />
              {COLS.map((c) => (
                <th key={c.key} className={`pb-3 text-xl font-semibold ${c.cls}`}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CASES.map((k) => {
              const on = k.key === trigger.kasus;
              return (
                <tr key={k.key} className="relative border-t border-line">
                  <td className="label py-3 pr-3">{k.label}</td>
                  {COLS.map((c) => (
                    <td key={c.key} className="relative py-3">
                      {on && <motion.span layoutId="kasus-row" className="absolute inset-0 -z-10 bg-ink/[0.07]" transition={{ type: 'spring', stiffness: 400, damping: 36 }} />}
                      <span className={`text-2xl tracking-tight ${on ? 'font-semibold' : 'text-muted'} ${on ? c.cls : ''}`}>{ARTICLES[k.key][c.key]}</span>
                      {on && <span className="block text-sm text-ink-2">{c.noun}{k.key === 'dat' && c.key === 'pl' ? 'n' : ''}{k.key === 'gen' && c.key === 'das' ? 's' : ''}{(k.key === 'akk' || k.key === 'dat' || k.key === 'gen') && c.key === 'der' ? 'n' : ''}</span>}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-6 text-lg">{trigger.why}</p>
        <p lang="fa" className="mt-1 text-ink-2">{trigger.fa}</p>
      </div>
    </div>
  );
}
