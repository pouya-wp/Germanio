'use client';

import { LayoutGroup, motion } from 'motion/react';
import { useState } from 'react';

/**
 * Satzklammer — the German sentence bracket. The finite verb holds position 2,
 * everything else verbal goes to the end, and in subordinate clauses the whole
 * bracket closes at the end. Words keep their identity (layoutId) and glide
 * between fields when the sentence type changes.
 */
type Field = 'vorfeld' | 'links' | 'mittelfeld' | 'rechts';
type Word = { id: string; text: string; verb?: boolean };

const W: Record<string, Word> = {
  weil: { id: 'weil', text: 'weil' },
  ich: { id: 'ich', text: 'ich' },
  heute: { id: 'heute', text: 'heute' },
  buero: { id: 'buero', text: 'im Büro' },
  arbeite: { id: 'v1', text: 'arbeite', verb: true },
  muss: { id: 'v1', text: 'muss', verb: true },
  habe: { id: 'v1', text: 'habe', verb: true },
  fange: { id: 'v1', text: 'fange', verb: true },
  arbeiten: { id: 'v2', text: 'arbeiten', verb: true },
  gearbeitet: { id: 'v2', text: 'gearbeitet', verb: true },
  an: { id: 'v2', text: 'an', verb: true },
  um8: { id: 'buero', text: 'um acht' },
};

const TYPES: { key: string; label: string; fa: string; fields: Record<Field, Word[]> }[] = [
  { key: 'praesens', label: 'Präsens', fa: 'جملهٔ ساده', fields: { vorfeld: [W.ich!], links: [W.arbeite!], mittelfeld: [W.heute!, W.buero!], rechts: [] } },
  { key: 'modal', label: 'Modalverb', fa: 'فعل کمکی: فعل اصلی به آخر می‌رود', fields: { vorfeld: [W.ich!], links: [W.muss!], mittelfeld: [W.heute!, W.buero!], rechts: [W.arbeiten!] } },
  { key: 'perfekt', label: 'Perfekt', fa: 'گذشته: haben/sein در جایگاه ۲، قسمت سوم فعل در آخر', fields: { vorfeld: [W.ich!], links: [W.habe!], mittelfeld: [W.heute!, W.buero!], rechts: [W.gearbeitet!] } },
  { key: 'trennbar', label: 'Trennbar', fa: 'فعل جداشدنی: پیشوند به آخر جمله می‌رود', fields: { vorfeld: [W.ich!], links: [W.fange!], mittelfeld: [W.heute!, W.um8!], rechts: [W.an!] } },
  { key: 'inversion', label: 'Inversion', fa: 'اگر چیز دیگری اول بیاید، فعل باز هم جایگاه ۲ می‌ماند', fields: { vorfeld: [W.heute!], links: [W.muss!], mittelfeld: [W.ich!, W.buero!], rechts: [W.arbeiten!] } },
  { key: 'nebensatz', label: 'Nebensatz', fa: 'جملهٔ وابسته: همهٔ فعل‌ها به آخر می‌روند', fields: { vorfeld: [], links: [W.weil!], mittelfeld: [W.ich!, W.heute!, W.buero!], rechts: [W.arbeiten!, { ...W.muss!, id: 'v1' }] } },
];

const FIELDS: { key: Field; label: string }[] = [
  { key: 'vorfeld', label: 'Vorfeld' },
  { key: 'links', label: 'linke Klammer' },
  { key: 'mittelfeld', label: 'Mittelfeld' },
  { key: 'rechts', label: 'rechte Klammer' },
];

export function Satzklammer() {
  const [type, setType] = useState(TYPES[1]!);
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setType(t)}
            className={`border px-3 py-1.5 text-sm transition-colors ${type.key === t.key ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <LayoutGroup>
        <div className="mt-8 grid grid-cols-[1fr_auto_2fr_auto] border border-ink">
          {FIELDS.map((f) => {
            const bracket = f.key === 'links' || f.key === 'rechts';
            return (
              <div key={f.key} className={`min-h-28 border-r border-ink p-3 last:border-r-0 ${bracket ? 'min-w-28 bg-ink/[0.04]' : ''}`}>
                <p className="label">{f.label}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {type.fields[f.key].map((w) => (
                    <motion.span
                      key={w.id + w.text}
                      layoutId={w.id}
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      className={`inline-block px-1 text-[clamp(1.1rem,2.2vw,1.9rem)] font-semibold tracking-tight ${w.verb ? 'border-b-2 border-ink' : ''}`}
                    >
                      {w.text}
                    </motion.span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </LayoutGroup>
      <p lang="fa" className="mt-4 text-lg">{type.fa}</p>
    </div>
  );
}
