'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { Settings } from '@germanio/client';
import { CEFR_HOURS } from '@germanio/core';
import { brain } from '@/lib/brain';
import { Constellation } from '@/components/constellation';

/**
 * Onboarding — Persian first, because on day one the learner can't read German yet.
 * Five short questions, an honest forecast, and straight into lesson 1.
 */
const TRACKS: { id: Settings['track']; de: string; fa: string }[] = [
  { id: 'fiae', de: 'Fachinformatiker · Anwendungsentwicklung', fa: 'برنامه‌نویسی و توسعهٔ نرم‌افزار' },
  { id: 'fisi', de: 'Fachinformatiker · Systemintegration', fa: 'شبکه، سرور و زیرساخت' },
  { id: 'mediengestalter', de: 'Mediengestalter Digital und Print', fa: 'طراحی گرافیک، وب و چاپ' },
  { id: 'unsure', de: 'Noch offen', fa: 'هنوز مطمئن نیستم' },
];

const MINUTES = [
  { m: 45, fa: 'سبک', note: 'سه‌ربع در روز' },
  { m: 90, fa: 'جدی', note: 'یک ساعت و نیم' },
  { m: 150, fa: 'خیلی جدی', note: 'دو ساعت و نیم' },
  { m: 210, fa: 'تمام‌قد', note: 'سه ساعت و نیم — مسیر ۶ ماهه' },
];

const fmtDate = (d: Date) => d.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long' }) + ' (' + d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }) + ')';

export function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [track, setTrack] = useState<Settings['track']>('fiae');
  const [start, setStart] = useState('2027-09');
  const [minutes, setMinutes] = useState(150);
  const [today, setToday] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setToday(new Date()), []);
  useEffect(() => {
    brain.settings().then((s) => s.name && setName(s.name)).catch(() => {});
  }, []);

  /** Honest projection: hours to B2 at this daily pace (6 study days a week). */
  const projection = useMemo(() => {
    if (!today) return null;
    const hoursPerDay = (minutes / 60) * (6 / 7);
    const days = CEFR_HOURS.B2 / hoursPerDay;
    const b2 = new Date(today.getTime() + days * 86_400_000);
    const ausbildung = new Date(`${start}-01T00:00:00`);
    return { b2, b1: new Date(today.getTime() + (CEFR_HOURS.B1 / hoursPerDay) * 86_400_000), months: days / 30.4, inTime: b2 < ausbildung, ausbildung };
  }, [minutes, start, today]);

  const finish = async () => {
    setSaving(true);
    try {
      await brain.updateSettings({
        name: name.trim(),
        track,
        ausbildungStart: `${start}-01`,
        minutesPerDay: minutes,
        deadline: projection ? projection.ausbildung.toISOString().slice(0, 10) : '2027-09-01',
        newCardsPerDay: Math.round(Math.min(30, Math.max(10, minutes / 7))),
        onboarded: true,
      });
      router.push('/lektion/a1-01');
    } finally {
      setSaving(false);
    }
  };

  const next = () => setStep((s) => s + 1);
  const steps = [
    <Step key="w" kicker="Willkommen" title="Hallo." fa="سلام! Germanio تو را قدم‌به‌قدم از صفر به سطح B2 می‌رساند — همان سطحی که برای آوسبیلدونگ لازم داری.">
      <ul className="mt-10 space-y-5 text-lg" lang="fa">
        <li><b>هر روز یک درس کوتاه</b> با یک هدف روشن: «بعد از این درس می‌توانی …».</li>
        <li><b>واژه‌ها خودشان برمی‌گردند</b> درست وقتی داری فراموششان می‌کنی (FSRS).</li>
        <li><b>همه‌چیز همان‌جایی است که کار می‌کنی</b>: مرورگر، ویندوز، ترمینال.</li>
      </ul>
      <Primary onClick={next}>شروع کنیم</Primary>
    </Step>,
    <Step key="n" kicker="Wie heißt du?" title="Wie heißt du?" fa="اسمت چیست؟ (یعنی همین جمله‌ای که بالا نوشته — اولین جملهٔ آلمانی تو!)">
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && next()} placeholder="Pouya" className="mt-10 w-full max-w-md border-b-2 border-ink bg-transparent py-3 text-4xl font-semibold tracking-tight outline-none" />
      {name.trim() && <p className="mt-4 text-2xl">Ich heiße <b>{name.trim()}</b>. <span lang="fa" className="text-muted">— «اسم من {name.trim()} است.»</span></p>}
      <Primary onClick={next} disabled={!name.trim()}>ادامه</Primary>
    </Step>,
    <Step key="t" kicker="Deine Ausbildung" title="Was möchtest du werden?" fa="کدام آوسبیلدونگ؟ واژه‌ها و موقعیت‌های درس‌ها برای همین رشته انتخاب می‌شوند.">
      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {TRACKS.map((t) => (
          <button key={t.id} onClick={() => setTrack(t.id)} className={`border p-5 text-left transition-colors ${track === t.id ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink'}`}>
            <span className="block text-lg font-semibold tracking-tight">{t.de}</span>
            <span lang="fa" className="mt-1 block opacity-80">{t.fa}</span>
          </button>
        ))}
      </div>
      <label className="mt-10 block">
        <span lang="fa" className="text-lg">آوسبیلدونگ کی شروع می‌شود؟</span>
        <input type="month" value={start} onChange={(e) => setStart(e.target.value)} className="mt-3 block border-b-2 border-ink bg-transparent py-2 text-2xl outline-none" />
      </label>
      <Primary onClick={next}>ادامه</Primary>
    </Step>,
    <Step key="m" kicker="Dein Tempo" title="Wie viel Zeit hast du?" fa="هر روز چقدر وقت می‌گذاری؟ (همهٔ وقتی که در مرورگر و ویندوز آلمانی می‌خوانی هم حساب می‌شود.)">
      <div className="mt-10 grid gap-3 sm:grid-cols-4">
        {MINUTES.map((o) => (
          <button key={o.m} onClick={() => setMinutes(o.m)} className={`border p-5 text-left transition-colors ${minutes === o.m ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink'}`}>
            <span className="block text-3xl font-semibold tracking-tight tabular-nums">{o.m}′</span>
            <span lang="fa" className="mt-1 block font-medium">{o.fa}</span>
            <span lang="fa" className="block text-sm opacity-70">{o.note}</span>
          </button>
        ))}
      </div>
      {projection && (
        <div className="mt-10 border-t border-ink pt-6" lang="fa">
          <p className="text-xl">
            با این سرعت به <b>B1</b> حدود <b>{fmtDate(projection.b1)}</b> و به <b>B2</b> حدود <b>{fmtDate(projection.b2)}</b> می‌رسی.
          </p>
          <p className={`mt-3 text-lg ${projection.inTime ? '' : 'font-semibold'}`}>
            {projection.inTime
              ? '✓ قبل از شروع آوسبیلدونگ به B2 می‌رسی.'
              : '⚠ با این سرعت B2 بعد از شروع آوسبیلدونگ می‌رسد. اگر بتوانی، زمان روزانه را بیشتر کن — یا B1 را هدف ورود قرار بده.'}
          </p>
          <p className="mt-3 text-sm text-muted">بر اساس حدود ۶۵۰ ساعت تا B2 و ۶ روز در هفته. صادقانه، نه تبلیغاتی.</p>
        </div>
      )}
      <Primary onClick={next}>ادامه</Primary>
    </Step>,
    <Step key="go" kicker="Der Weg" title={`Los geht’s, ${name.trim() || 'du'}.`} fa="مسیر تو آماده است. اولین درس ۱۰ تا ۱۵ دقیقه طول می‌کشد. آخرش می‌توانی خودت را به آلمانی معرفی کنی.">
      <div className="mt-10 border border-ink p-6">
        <p className="label">Lektion 1 · A1.1</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight">Hallo, ich bin …</p>
        <p className="mt-4 text-xl">Ziel: <b>Ich kann mich vorstellen.</b></p>
        <p lang="fa" className="mt-1 text-ink-2">هدف: می‌توانم خودم را معرفی کنم.</p>
      </div>
      <Primary onClick={() => void finish()} disabled={saving}>{saving ? '…' : 'اولین درس را شروع کن'}</Primary>
    </Step>,
  ];

  return (
    <main className="relative grid min-h-dvh lg:grid-cols-[1fr_minmax(0,0.8fr)]">
      <section className="relative z-10 flex flex-col px-5 py-8 sm:px-12 sm:py-12">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">Germanio</span>
          <span className="label tabular-nums">{step + 1} / {steps.length}</span>
        </div>
        <div className="mt-3 h-px bg-line">
          <motion.div className="h-px bg-ink" animate={{ width: `${((step + 1) / steps.length) * 100}%` }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} />
        </div>
        <div className="flex flex-1 flex-col py-10">
          <AnimatePresence mode="wait">
            <motion.div className="my-auto" key={step} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
              {steps[step]}
            </motion.div>
          </AnimatePresence>
        </div>
        {step > 0 && (
          <button onClick={() => setStep((s) => s - 1)} className="label w-fit hover:text-ink">← zurück</button>
        )}
      </section>
      <aside className="pointer-events-none relative hidden border-l border-line lg:block">
        <Constellation />
      </aside>
    </main>
  );
}

function Step({ kicker, title, fa, children }: { kicker: string; title: string; fa: string; children: React.ReactNode }) {
  return (
    <div className="max-w-3xl">
      <p className="label">{kicker}</p>
      <h1 className="mt-3 font-display text-[clamp(2.75rem,7vw,6.5rem)] leading-[0.9] font-semibold tracking-[-0.045em]">{title}</h1>
      <p lang="fa" className="mt-6 max-w-2xl text-xl leading-relaxed text-ink-2">{fa}</p>
      {children}
    </div>
  );
}

function Primary({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      lang="fa"
      className="mt-12 inline-flex items-center gap-3 border border-ink bg-ink px-7 py-4 text-lg font-medium text-paper transition-colors hover:bg-transparent hover:text-ink disabled:opacity-30"
    >
      {children} <span aria-hidden>←</span>
    </button>
  );
}
