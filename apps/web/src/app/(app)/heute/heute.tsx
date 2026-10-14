'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { ForecastResponse, KursMap, Settings, TodayResponse } from '@germanio/client';
import { levelFromProgress } from '@germanio/core';
import { brain } from '@/lib/brain';

/**
 * Heute — one obvious next step. The current lesson is the hero; reviews
 * second; everything else (reading, radio, writing) is optional extra.
 */
function greeting(h: number): string {
  if (h < 11) return 'Guten Morgen';
  if (h < 17) return 'Guten Tag';
  return 'Guten Abend';
}

export function Heute() {
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [kurs, setKurs] = useState<KursMap | null>(null);
  const [week, setWeek] = useState<{ minutes: number; goal: number; days: { day: string; minutes: number }[] } | null>(null);
  const [fc, setFc] = useState<ForecastResponse | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [clock, setClock] = useState<{ hello: string; date: string; daysToAusbildung: number | null } | null>(null);

  useEffect(() => {
    brain.today().then(setToday).catch(() => {});
    brain.kurs().then(setKurs).catch(() => {});
    brain.week().then(setWeek).catch(() => {});
    brain.forecast().then(setFc).catch(() => {});
    brain.settings().then(setSettings).catch(() => {});
  }, []);

  // Time-dependent values are computed after mount (the page shell is prerendered).
  useEffect(() => {
    const now = new Date();
    const start = settings?.ausbildungStart ? new Date(`${settings.ausbildungStart}T00:00:00`) : null;
    setClock({
      hello: greeting(now.getHours()),
      date: now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }),
      daysToAusbildung: start ? Math.max(0, Math.ceil((start.getTime() - now.getTime()) / 86_400_000)) : null,
    });
  }, [settings]);

  const current = kurs?.current ?? null;
  const n = current && kurs ? kurs.units.indexOf(kurs.units.find((u) => u.id === current.id)!) + 1 : 0;
  const weekPct = week ? Math.min(1, week.minutes / Math.max(1, week.goal)) : 0;

  return (
    <div className="px-4 pt-8 pb-24 sm:px-12 sm:pt-14">
      <p className="label min-h-[1em]">{clock?.date}</p>
      <h1 className="mt-3 font-display text-[clamp(2.75rem,7vw,6.5rem)] leading-[0.9] font-semibold tracking-[-0.045em]">
        {clock?.hello ?? 'Hallo'}{settings?.name ? `, ${settings.name}` : ''}.
      </h1>

      <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* ── Hero: the next lesson ───────────────────────────────────── */}
        {!kurs ? (
          <div className="min-h-80 animate-pulse bg-ink/[0.06]" aria-busy />
        ) : current ? (
          <Link href={current.authored ? `/lektion/${current.id}` : '/kurs'} className="group relative flex min-h-80 flex-col justify-between overflow-hidden bg-ink p-7 text-paper sm:p-10">
            <div>
              <p className="label" style={{ color: 'color-mix(in oklab, var(--paper) 60%, transparent)' }}>
                Lektion {n} · {current.level} · {current.authored ? '10–15 min' : 'in Vorbereitung'}
              </p>
              <h2 className="mt-4 text-[clamp(2.25rem,5vw,4rem)] leading-[0.95] font-semibold tracking-[-0.04em]">{current.title}</h2>
              <p lang="fa" className="mt-3 text-xl opacity-80">{current.fa}</p>
            </div>
            <div className="mt-10 flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="label" style={{ color: 'color-mix(in oklab, var(--paper) 60%, transparent)' }}>Danach kannst du</p>
                <p className="mt-1 text-xl font-medium">{current.canDo.de}</p>
                <p lang="fa" className="opacity-80">{current.canDo.fa}</p>
              </div>
              <span className="inline-flex items-center gap-3 bg-paper px-6 py-4 text-lg font-semibold text-ink transition-transform group-hover:translate-x-1">
                {kurs?.completedCount ? 'Weiterlernen' : 'Erste Lektion'} →
              </span>
            </div>
          </Link>
        ) : (
          <div className="min-h-80 border border-ink p-10">
            <p className="text-3xl font-semibold">Alle Lektionen geschafft.</p>
          </div>
        )}

        {/* ── Reviews ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          <Link href="/wortschatz" className="group flex flex-1 flex-col justify-between border border-ink p-7">
            <p className="label">Wiederholen · Spaced Repetition</p>
            {today && today.dueCount > 0 ? (
              <>
                <p className="mt-4 text-[clamp(3rem,6vw,5rem)] leading-none font-semibold tracking-[-0.05em] tabular-nums">{today.dueCount}</p>
                <p lang="fa" className="mt-2 text-ink-2">واژه منتظر مرور است — حدود {Math.max(1, Math.ceil((today.dueCount * 9) / 60))} دقیقه.</p>
                <span className="mt-6 font-medium group-hover:underline">Jetzt wiederholen →</span>
              </>
            ) : (
              <>
                <p className="mt-4 text-3xl font-semibold tracking-tight">Alles wiederholt ✓</p>
                <p lang="fa" className="mt-2 text-ink-2">{kurs?.completedCount ? 'فعلاً مروری نمانده. واژه‌ها سر وقت خودشان برمی‌گردند.' : 'بعد از اولین درس، واژه‌هایت اینجا برای مرور برمی‌گردند.'}</p>
              </>
            )}
          </Link>

          {/* ── Weekly goal ─────────────────────────────────────────── */}
          <div className="border border-line p-7">
            <div className="flex items-baseline justify-between">
              <p className="label">Diese Woche</p>
              <p className="label tabular-nums">{week ? `${week.minutes} / ${week.goal} min` : '–'}</p>
            </div>
            <div className="mt-4 h-2 bg-line">
              <motion.div className="h-2 bg-ink" initial={{ width: 0 }} animate={{ width: `${weekPct * 100}%` }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} />
            </div>
            <p lang="fa" className="mt-3 text-sm text-ink-2">
              {weekPct >= 1 ? 'هدف این هفته کامل شد. عالی!' : 'هدف هفتگی، نه زنجیرهٔ روزانه: یک روز جا ماندن اشکالی ندارد.'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Progress strip ──────────────────────────────────────────── */}
      <dl className="mt-12 grid grid-cols-2 border-t border-ink lg:grid-cols-4">
        <Stat label="Lektionen" value={kurs ? `${kurs.completedCount}` : '–'} unit={kurs ? `/ ${kurs.units.length}` : ''} />
        <Stat label="Wörter sicher" value={fc ? String(fc.knownLemmas) : '–'} />
        <Stat label="Niveau" value={fc ? levelFromProgress(fc.progress).level : '–'} />
        <Stat label="Tage bis zur Ausbildung" value={clock?.daysToAusbildung !== null && clock ? String(clock.daysToAusbildung) : '–'} />
      </dl>

      <div className="mt-16 grid gap-16 lg:grid-cols-2">
        {/* ── Ich kann ────────────────────────────────────────────────── */}
        <section>
          <h2 className="flex items-baseline justify-between border-b border-ink pb-3">
            <span className="text-2xl font-semibold tracking-tight">Ich kann …</span>
            <Link href="/kurs" className="label hover:text-ink">Der Weg →</Link>
          </h2>
          {kurs && kurs.canDo.length > 0 ? (
            <ul>
              {kurs.canDo.slice(-5).reverse().map((c) => (
                <li key={c.unitId} className="border-b border-line py-3">
                  <span className="block text-lg font-medium">✓ {c.de}</span>
                  <span lang="fa" className="block text-ink-2">{c.fa}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p lang="fa" className="mt-4 text-lg text-ink-2">هنوز خالی است. بعد از درس اول، اولین جملهٔ «Ich kann» اینجا می‌آید: «می‌توانم خودم را معرفی کنم.»</p>
          )}
        </section>

        {/* ── Extra practice ──────────────────────────────────────────── */}
        <section>
          <h2 className="border-b border-ink pb-3 text-2xl font-semibold tracking-tight">Mehr üben</h2>
          <ul>
            {[
              { href: '/tagesfunk', de: 'Tagesfunk', fa: 'رادیوی شخصی امروز — برای گوش دادن حین کار' },
              { href: '/lesesaal', de: 'Lesesaal', fa: 'متن و داستان در سطح خودت' },
              { href: '/schreiben', de: 'Tagebuch', fa: 'چند جمله بنویس، تصحیح بگیر' },
            ].map((x) => (
              <li key={x.href} className="border-b border-line">
                <Link href={x.href} className="group flex items-baseline justify-between gap-4 py-4">
                  <span>
                    <span className="block text-lg font-medium transition-transform group-hover:translate-x-1">{x.de}</span>
                    <span lang="fa" className="block text-ink-2">{x.fa}</span>
                  </span>
                  <span>→</span>
                </Link>
              </li>
            ))}
          </ul>
          {fc && (
            <p lang="fa" className="mt-6 text-sm text-ink-2">
              {fc.eta &&
                (fc.basis === 'plan'
                  ? `اگر طبق برنامه‌ات (روزی ${fc.settings.minutesPerDay} دقیقه) پیش بروی، حدود ${new Date(fc.eta).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long' })} به ${fc.settings.target} می‌رسی. از روز پنجم، پیش‌بینی بر اساس سرعت واقعی‌ات حساب می‌شود.`
                  : `پیش‌بینی صادقانه بر اساس ${fc.activeDays} روز اخیر: حدود ${new Date(fc.eta).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long' })} به ${fc.settings.target} می‌رسی.`)}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="border-b border-line py-6 pr-4 lg:border-b-0">
      <dt className="label">{label}</dt>
      <dd className="mt-2 flex items-baseline gap-2">
        <span className="text-[clamp(2.25rem,4.5vw,3.5rem)] leading-none font-semibold tracking-[-0.04em] tabular-nums">{value}</span>
        {unit && <span className="text-muted tabular-nums">{unit}</span>}
      </dd>
    </div>
  );
}
