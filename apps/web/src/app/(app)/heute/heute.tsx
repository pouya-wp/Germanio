'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { ForecastResponse, TodayResponse } from '@germanio/client';
import { levelFromProgress, type PlanBlock } from '@germanio/core';
import { brain } from '@/lib/brain';
import type { StringKey } from '@/lib/strings';
import { RevealLines } from '@/components/reveal';
import { T } from '@/components/t';

const ACTIONABLE: Partial<Record<PlanBlock['kind'], string>> = {
  review: '/wortschatz',
  'new-words': '/wortschatz',
};

export function Heute() {
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [fc, setFc] = useState<ForecastResponse | null>(null);

  // The clock is read after mount: the page shell is prerendered, the day is the learner's.
  const [dateLine, setDateLine] = useState('');
  useEffect(() => {
    setDateLine(new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }));
    brain.today().then(setToday).catch(() => {});
    brain.forecast().then(setFc).catch(() => {});
  }, []);

  const totalMin = today?.plan.reduce((a, b) => a + b.minutes, 0) ?? 0;
  const goalH = (fc?.settings.minutesPerDay ?? 210) / 60;

  return (
    <div className="px-4 pt-8 pb-24 sm:px-12 sm:pt-14">
      <p className="label min-h-[1em]">{dateLine}</p>
      <h1 className="mt-3 font-display text-[clamp(3rem,8vw,7.5rem)] leading-[0.88] font-semibold tracking-[-0.045em]">
        <RevealLines lines={[<T key="t" k="heute.title" />]} />
      </h1>

      {/* ── Numbers ──────────────────────────────────────────────────────── */}
      <dl className="mt-12 grid grid-cols-2 border-t border-ink lg:grid-cols-4">
        <Stat k="heute.hours" value={today ? `${today.todayHours.toFixed(1)}` : '–'} unit={`/ ${goalH.toFixed(1)} h`} />
        <Stat k="heute.due" value={today ? String(today.dueCount) : '–'} />
        <Stat k="heute.new" value={today ? String(today.newRemaining) : '–'} />
        <Forecast fc={fc} />
      </dl>

      <div className="mt-16 grid gap-16 lg:grid-cols-12">
        {/* ── Plan ─────────────────────────────────────────────────────── */}
        <section className="lg:col-span-7">
          <div className="flex items-baseline justify-between border-b border-ink pb-3">
            <h2 className="text-2xl font-semibold tracking-tight">
              <T k="heute.plan" />
            </h2>
            <span className="label tabular-nums">{totalMin} min</span>
          </div>
          <ol>
            {today?.plan.map((b, i) => {
              const href = ACTIONABLE[b.kind];
              const body = (
                <>
                  <span className="label w-8 shrink-0 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  <span className="flex-1">
                    <span className="block text-xl font-medium tracking-tight">
                      <T k={`block.${b.kind}` as StringKey} />
                      {b.count ? <span className="ml-2 text-muted tabular-nums">× {b.count}</span> : null}
                    </span>
                    <span className="label mt-1 block">
                      <T k={`principle.${b.principle}` as StringKey} />
                    </span>
                  </span>
                  <span className="w-24 shrink-0 text-right tabular-nums">{b.minutes} min</span>
                  <span className="hidden w-32 shrink-0 sm:block">
                    <motion.span
                      className="block h-1 bg-ink"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: totalMin ? b.minutes / Math.max(...today.plan.map((p) => p.minutes)) : 0 }}
                      style={{ originX: 0 }}
                      transition={{ duration: 0.9, delay: 0.2 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </span>
                  <span className="w-6 shrink-0 text-right">{href ? '→' : <span className="label">bald</span>}</span>
                </>
              );
              return (
                <li key={i} className="border-b border-line">
                  {href ? (
                    <Link href={href} className="group flex items-center gap-4 py-5 transition-[padding] hover:pl-2">
                      {body}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-4 py-5 opacity-60">{body}</div>
                  )}
                </li>
              );
            })}
          </ol>
          <Link
            href="/wortschatz"
            className="mt-8 inline-flex items-center gap-3 border border-ink bg-ink px-6 py-4 text-lg font-medium text-paper transition-colors hover:bg-transparent hover:text-ink"
          >
            <T k="heute.start" /> →
          </Link>
        </section>

        {/* ── Side ─────────────────────────────────────────────────────── */}
        <aside className="space-y-14 lg:col-span-5">
          <section>
            <h2 className="border-b border-ink pb-3 text-2xl font-semibold tracking-tight">
              <T k="heute.weak" />
            </h2>
            <ul>
              {today?.weakConcepts.map((c) => (
                <li key={c.id} className="flex items-baseline justify-between gap-4 border-b border-line py-4">
                  <span className="text-lg">{c.title}</span>
                  <span className="label">{c.level}</span>
                </li>
              ))}
            </ul>
          </section>
          {fc && <HoursChart fc={fc} />}
        </aside>
      </div>
    </div>
  );
}

function Stat({ k, value, unit }: { k: StringKey; value: string; unit?: string }) {
  return (
    <div className="border-b border-line py-6 pr-4 lg:border-b-0">
      <dt className="label">
        <T k={k} />
      </dt>
      <dd className="mt-2 flex items-baseline gap-2">
        <span className="text-[clamp(2.5rem,5vw,4rem)] leading-none font-semibold tracking-[-0.04em] tabular-nums">{value}</span>
        {unit && <span className="text-muted tabular-nums">{unit}</span>}
      </dd>
    </div>
  );
}

function Forecast({ fc }: { fc: ForecastResponse | null }) {
  if (!fc) return <Stat k="heute.forecast" value="–" />;
  const { level, fraction } = levelFromProgress(fc.progress);
  const eta = fc.eta ? new Date(fc.eta) : null;
  return (
    <div className="border-b border-line py-6 pr-4 lg:border-b-0">
      <dt className="label">
        <T k="heute.forecast" /> · {fc.settings.target}
      </dt>
      <dd className="mt-2">
        <span className="block text-[clamp(1.6rem,2.6vw,2.4rem)] leading-none font-semibold tracking-[-0.03em]">
          {eta ? eta.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' }) : 'noch offen'}
        </span>
        <span className={`label mt-2 block ${fc.onTrack ? '' : 'text-ink'}`}>
          {level} {Math.round(fraction * 100)} % ·{' '}
          {fc.onTrack ? 'im Plan' : `nötig: ${(fc.requiredPace ?? 0).toFixed(1)} h/Tag`}
        </span>
      </dd>
    </div>
  );
}

/** Last 14 days of effective hours against the pace the deadline requires. */
function HoursChart({ fc }: { fc: ForecastResponse }) {
  const W = 420;
  const H = 140;
  const max = Math.max(4, fc.requiredPace ?? 0, ...fc.recent.map((d) => d.hours)) * 1.1;
  const bw = W / fc.recent.length;
  const yReq = fc.requiredPace ? H - (fc.requiredPace / max) * H : null;
  return (
    <section>
      <h2 className="flex items-baseline justify-between border-b border-ink pb-3">
        <span className="text-2xl font-semibold tracking-tight">Stundenzähler</span>
        <span className="label tabular-nums">{fc.totalHours.toFixed(1)} h gesamt</span>
      </h2>
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="mt-6 w-full" role="img" aria-label="Stunden pro Tag, letzte 14 Tage">
        {fc.recent.map((d, i) => {
          const h = (d.hours / max) * H;
          return (
            <g key={d.day}>
              <rect x={i * bw + 3} y={H - h} width={bw - 6} height={Math.max(h, 1)} fill="var(--ink)" opacity={d.hours ? 1 : 0.15}>
                <title>
                  {d.day}: {d.hours.toFixed(2)} h
                </title>
              </rect>
              {i % 2 === 0 && (
                <text x={i * bw + bw / 2} y={H + 16} textAnchor="middle" className="fill-[var(--muted)] font-mono text-[9px]">
                  {d.day.slice(8)}
                </text>
              )}
            </g>
          );
        })}
        {yReq !== null && (
          <>
            <line x1={0} x2={W} y1={yReq} y2={yReq} stroke="var(--ink)" strokeDasharray="3 4" strokeWidth={1} />
            <text x={W} y={yReq - 5} textAnchor="end" className="fill-[var(--ink)] font-mono text-[9px]">
              nötig {fc.requiredPace!.toFixed(1)} h
            </text>
          </>
        )}
      </svg>
    </section>
  );
}
