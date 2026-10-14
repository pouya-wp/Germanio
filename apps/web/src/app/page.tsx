import Link from 'next/link';
import { Compound } from '@/components/compound';
import { Constellation } from '@/components/constellation';
import { FadeUp, RevealLines } from '@/components/reveal';
import { SmoothScroll } from '@/components/smooth-scroll';
import { LiveFrontier } from './live-frontier';

const PRINCIPLES = [
  {
    n: '01',
    de: 'Sprachgrenze',
    fa: 'هر واژه‌ای که یاد می‌گیری، مرز جهانت را جلوتر می‌برد.',
    en: 'Every word you learn moves the edge of your world.',
  },
  {
    n: '02',
    de: 'Die Oberfläche lernt mit',
    fa: 'رابط کاربری همراه تو آلمانی می‌شود؛ هر کلمه، وقتی واقعاً بلدش باشی.',
    en: 'The interface turns German word by word — exactly as fast as you do.',
  },
  {
    n: '03',
    de: 'Lernen, wo du bist',
    fa: 'مرورگر، ویندوز، VS Code، ترمینال — یادگیری جایی اتفاق می‌افتد که کار می‌کنی.',
    en: 'Browser, desktop, editor, terminal. No app to remember to open.',
  },
  {
    n: '04',
    de: 'Ehrlich statt süchtig',
    fa: 'بدون استریکِ عذاب‌وجدان. ساعت‌ها شمرده می‌شوند و پیش‌بینی صادق است.',
    en: 'No guilt streaks. Real hours, an honest forecast, a plan that adapts.',
  },
  {
    n: '05',
    de: 'Lokal und privat',
    fa: 'همه‌چیز روی سیستم خودت. داده‌هایت مال خودت است.',
    en: 'Everything runs on your machine. Your data stays yours.',
  },
];

const SURFACES = [
  { de: 'Web', note: 'Heute · Wortschatz · Lesesaal' },
  { de: 'Chrome', note: 'Alt + Klick auf jedes Wort' },
  { de: 'Desktop', note: 'Strg + Alt + D — überall in Windows' },
  { de: 'VS Code', note: 'Commits und Kommentare auf Deutsch' },
  { de: 'Terminal', note: 'gm review — während npm install läuft' },
];

export default function Landing() {
  return (
    <main className="relative">
      <SmoothScroll />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-dvh flex-col overflow-hidden">
        <header className="relative z-10 flex items-center justify-between px-4 pt-5 sm:px-8">
          <span className="text-lg font-semibold tracking-tight">Germanio</span>
          <span className="label hidden sm:block">Lokal · Privat · Deins</span>
          <Link
            href="/heute"
            className="group inline-flex items-center gap-2 border border-ink px-4 py-2 text-sm font-medium transition-colors hover:bg-ink hover:text-paper"
          >
            Öffnen <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </header>

        <div
          className="pointer-events-none absolute inset-0 sm:left-[22%]"
          style={{ maskImage: 'radial-gradient(ellipse 70% 75% at 60% 45%, #000 45%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 70% 75% at 60% 45%, #000 45%, transparent 100%)' }}
        >
          <Constellation />
        </div>

        <div className="relative z-10 mt-auto px-4 pb-10 sm:px-8 sm:pb-14">
          <p className="label mb-6">Tractatus logico-philosophicus · 5.6</p>
          <h1
            className="max-w-[16ch] font-display text-[clamp(2.6rem,8.4vw,9.5rem)] leading-[0.88] font-semibold tracking-[-0.045em]"
            style={{ fontVariationSettings: "'wdth' 88, 'opsz' 96" }}
          >
            <RevealLines lines={['Die Grenzen', 'meiner Sprache', 'bedeuten die Grenzen', 'meiner Welt.']} delay={0.15} />
          </h1>
          <div className="mt-8 grid gap-4 sm:grid-cols-12">
            <p lang="fa" className="text-lg sm:col-span-5 sm:col-start-1">
              مرزهای زبانِ من، مرزهای جهانِ من‌اند.
            </p>
            <p className="max-w-md text-ink-2 sm:col-span-5 sm:col-start-8">
              Germanio is a personal, local-first system for going from A1 to B2 — built around one idea: your vocabulary
              is the size of your world.
            </p>
          </div>
        </div>
      </section>

      {/* ── Manifest ─────────────────────────────────────────────────────── */}
      <section className="border-t border-line px-4 py-24 sm:px-8 sm:py-36">
        <div className="grid gap-10 sm:grid-cols-12">
          <p className="label sm:col-span-3">Manifest</p>
          <h2 className="font-display text-[clamp(2rem,4.6vw,4.5rem)] leading-[0.95] font-semibold tracking-[-0.035em] sm:col-span-9">
            <RevealLines lines={['Fünf Sätze,', 'nach denen Germanio gebaut ist.']} />
          </h2>
        </div>
        <ol className="mt-20 border-t border-ink">
          {PRINCIPLES.map((p, i) => (
            <FadeUp key={p.n} delay={i * 0.04}>
              <li className="grid gap-4 border-b border-line py-8 sm:grid-cols-12 sm:items-baseline">
                <span className="label sm:col-span-1">{p.n}</span>
                <h3 className="text-[clamp(1.6rem,3vw,2.75rem)] leading-none font-semibold tracking-[-0.03em] sm:col-span-5">
                  {p.de}
                </h3>
                <p lang="fa" className="text-lg sm:col-span-3">
                  {p.fa}
                </p>
                <p className="text-sm text-muted sm:col-span-3">{p.en}</p>
              </li>
            </FadeUp>
          ))}
        </ol>
      </section>

      {/* ── Komposita ────────────────────────────────────────────────────── */}
      <section className="overflow-hidden bg-ink px-4 py-24 text-paper sm:px-8 sm:py-36">
        <div className="grid gap-10 sm:grid-cols-12">
          <p className="label sm:col-span-3" style={{ color: 'color-mix(in oklab, var(--paper) 60%, transparent)' }}>
            Komposita
          </p>
          <div className="sm:col-span-9">
            <h2 className="font-display text-[clamp(2rem,4.6vw,4.5rem)] leading-[0.95] font-semibold tracking-[-0.035em]">
              Lange Wörter sind Lego.
            </h2>
            <p lang="fa" className="mt-4 max-w-xl text-lg opacity-70">
              واژه‌های بلند آلمانی از قطعه‌های کوچک ساخته شده‌اند. موس را روی واژه ببر.
            </p>
          </div>
        </div>
        <div className="mt-20 pb-10 text-center font-display text-[clamp(2.2rem,8.5vw,9rem)] leading-none font-semibold tracking-[-0.04em]">
          <Compound parts={['Ausbildungs', 'Vertrag']} glosses={['training', 'contract']} />
        </div>
        <div className="mt-10 grid gap-6 text-[clamp(1.4rem,3vw,2.6rem)] font-semibold tracking-[-0.03em] sm:grid-cols-3">
          <Compound parts={['Fach', 'Informatiker']} glosses={['field', 'computer scientist']} />
          <Compound parts={['Berufs', 'Schule']} glosses={['vocation', 'school']} />
          <Compound parts={['Vorstellungs', 'Gespräch']} glosses={['introduction', 'conversation']} />
        </div>
      </section>

      {/* ── Genus ────────────────────────────────────────────────────────── */}
      <section className="px-4 py-24 sm:px-8 sm:py-36">
        <div className="grid gap-10 sm:grid-cols-12">
          <p className="label sm:col-span-3">Genus</p>
          <h2 className="font-display text-[clamp(2rem,4.6vw,4.5rem)] leading-[0.95] font-semibold tracking-[-0.035em] sm:col-span-9">
            Farbe bedeutet immer Genus.
            <span className="block text-muted">Sonst nichts.</span>
          </h2>
        </div>
        <div className="mt-20 grid border-t border-ink sm:grid-cols-3">
          {(
            [
              ['der', 'Kobalt', 'der Vertrag', 'text-der'],
              ['die', 'Zinnober', 'die Bewerbung', 'text-die'],
              ['das', 'Moos', 'das Gespräch', 'text-das'],
            ] as const
          ).map(([art, name, example, cls], i) => (
            <FadeUp key={art} delay={i * 0.08}>
              <div className="flex aspect-[4/5] flex-col justify-between border-b border-line p-6 sm:border-r sm:border-b-0">
                <span className="label">{name}</span>
                <span className={`font-display text-[clamp(5rem,13vw,12rem)] leading-none font-semibold tracking-[-0.05em] ${cls}`}>
                  {art}
                </span>
                <span className="text-xl">
                  <span className={cls}>{example.split(' ')[0]}</span> {example.split(' ')[1]}
                </span>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── Überall ──────────────────────────────────────────────────────── */}
      <section className="border-t border-line px-4 py-24 sm:px-8 sm:py-36">
        <div className="grid gap-10 sm:grid-cols-12">
          <p className="label sm:col-span-3">Überall</p>
          <h2 className="font-display text-[clamp(2rem,4.6vw,4.5rem)] leading-[0.95] font-semibold tracking-[-0.035em] sm:col-span-9">
            Kein Ort zum Lernen.
            <span className="block">Jeder Ort ist einer.</span>
          </h2>
        </div>
        <ul className="mt-20 border-t border-ink">
          {SURFACES.map((s, i) => (
            <FadeUp key={s.de} delay={i * 0.04}>
              <li className="group flex items-baseline justify-between gap-6 border-b border-line py-6">
                <span className="text-[clamp(1.8rem,5vw,4.5rem)] leading-none font-semibold tracking-[-0.04em] transition-transform duration-500 group-hover:translate-x-3">
                  {s.de}
                </span>
                <span className="font-mono text-xs text-muted sm:text-sm">{s.note}</span>
              </li>
            </FadeUp>
          ))}
        </ul>
      </section>

      {/* ── Ehrlich ──────────────────────────────────────────────────────── */}
      <section className="border-t border-line px-4 py-24 sm:px-8 sm:py-36">
        <div className="grid gap-10 sm:grid-cols-12">
          <p className="label sm:col-span-3">Ehrlich</p>
          <div className="sm:col-span-9">
            <p className="font-display text-[clamp(5rem,18vw,17rem)] leading-[0.8] font-semibold tracking-[-0.06em]">650</p>
            <p className="mt-6 max-w-2xl text-2xl leading-snug font-medium tracking-tight">
              Stunden von A1 bis B2. Germanio macht sie nicht kürzer — es sorgt dafür, dass jede einzelne zählt.
            </p>
            <p lang="fa" className="mt-4 max-w-2xl text-lg text-ink-2">
              حدود ۶۵۰ ساعت از A1 تا B2. Germanio این ساعت‌ها را کم نمی‌کند؛ کاری می‌کند که هر کدام حساب شود.
            </p>
            <LiveFrontier />
          </div>
        </div>
      </section>

      <footer className="flex flex-col gap-6 border-t border-ink px-4 py-10 sm:flex-row sm:items-end sm:justify-between sm:px-8">
        <Link href="/heute" className="font-display text-[clamp(2.5rem,7vw,6rem)] leading-none font-semibold tracking-[-0.045em] hover:text-muted">
          Anfangen →
        </Link>
        <p className="label max-w-sm">
          Wörterbuch: Wiktionary (CC BY-SA) · Sätze &amp; Audio: Tatoeba (CC BY) · Häufigkeit: OpenSubtitles
        </p>
      </footer>
    </main>
  );
}
