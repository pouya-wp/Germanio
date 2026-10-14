'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { KursMap } from '@germanio/client';
import { brain } from '@/lib/brain';
import { RevealLines } from '@/components/reveal';

/** Der Weg — the whole path from zero to B2, one can-do at a time. */
export function Path() {
  const [map, setMap] = useState<KursMap | null>(null);

  useEffect(() => {
    brain.kurs().then(setMap).catch(() => {});
  }, []);

  if (!map) return <div className="label px-12 pt-14">…</div>;
  const total = map.units.length;

  return (
    <div className="px-4 pt-8 pb-24 sm:px-12 sm:pt-14">
      <p className="label">Von null bis B2 · {map.completedCount} / {total} Lektionen</p>
      <h1 className="mt-3 font-display text-[clamp(3rem,8vw,7.5rem)] leading-[0.88] font-semibold tracking-[-0.045em]">
        <RevealLines lines={['Der Weg']} />
      </h1>
      <p lang="fa" className="mt-4 max-w-2xl text-xl text-ink-2">مسیر کامل از صفر تا B2. هر درس با یک «می‌توانم …» تمام می‌شود.</p>

      <div className="mt-6 h-1 max-w-3xl bg-line">
        <motion.div className="h-1 bg-ink" initial={{ width: 0 }} animate={{ width: `${(map.completedCount / total) * 100}%` }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} />
      </div>

      <div className="mt-16 grid gap-16 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-16">
          {map.levels.map((level) => (
            <section key={level.id}>
              <div className="flex items-baseline justify-between gap-4 border-b border-ink pb-3">
                <h2 className="text-3xl font-semibold tracking-[-0.03em]">
                  {level.id} <span className="text-muted">· {level.title}</span>
                </h2>
                <span className="label tabular-nums">{level.done} / {level.total} · ~{level.hours} h</span>
              </div>
              <p lang="fa" className="mt-2 text-ink-2">{level.fa}</p>
              <ol className="mt-4">
                {map.units
                  .filter((u) => u.level === level.id)
                  .map((u) => {
                    const n = map.units.indexOf(u) + 1;
                    const current = u.status === 'current';
                    const row = (
                      <div className={`grid grid-cols-[48px_1fr_auto] items-center gap-4 py-5 ${u.status === 'locked' ? 'opacity-40' : ''}`}>
                        <span className={`flex size-10 items-center justify-center rounded-full border text-sm tabular-nums ${u.status === 'done' ? 'border-ink bg-ink text-paper' : current ? 'border-2 border-ink font-semibold' : 'border-line'}`}>
                          {u.status === 'done' ? '✓' : n}
                        </span>
                        <span>
                          <span className={`block tracking-tight ${current ? 'text-2xl font-semibold' : 'text-xl font-medium'}`}>{u.title}</span>
                          <span lang="fa" className="block text-ink-2">{u.canDo.fa}</span>
                        </span>
                        <span className="label">
                          {u.status === 'done' && u.score !== null ? `${Math.round(u.score * 100)} %` : current ? (u.authored ? '' : 'in Arbeit') : !u.authored ? 'bald' : ''}
                        </span>
                      </div>
                    );
                    return (
                      <li key={u.id} className={`border-b border-line ${current ? 'border-l-2 border-l-ink pl-4' : ''}`}>
                        {(u.status === 'done' || current) && u.authored ? (
                          <Link href={`/lektion/${u.id}`} className="block transition-[padding] hover:pl-2">
                            {row}
                            {current && (
                              <span className="mb-5 ml-16 inline-flex items-center gap-2 border border-ink bg-ink px-5 py-3 font-medium text-paper">
                                Lektion starten →
                              </span>
                            )}
                          </Link>
                        ) : (
                          row
                        )}
                      </li>
                    );
                  })}
              </ol>
            </section>
          ))}
        </div>

        <aside className="xl:sticky xl:top-8 xl:self-start">
          <h2 className="border-b border-ink pb-3 text-2xl font-semibold tracking-tight">Ich kann …</h2>
          {map.canDo.length === 0 ? (
            <p lang="fa" className="mt-4 text-ink-2">بعد از هر درس، یک توانایی واقعی اینجا اضافه می‌شود. این فهرست مدرک پیشرفت توست.</p>
          ) : (
            <ul className="mt-2">
              {map.canDo.map((c) => (
                <li key={c.unitId} className="border-b border-line py-3">
                  <span className="block font-medium">✓ {c.de}</span>
                  <span lang="fa" className="block text-sm text-ink-2">{c.fa}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
