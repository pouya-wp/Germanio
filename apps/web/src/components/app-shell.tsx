'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import type { StringKey } from '@/lib/strings';
import { CommandPalette } from './command-palette';
import { useLearner } from './providers';
import { T } from './t';

const NAV: { href: string; k: StringKey; soon?: boolean }[] = [
  { href: '/heute', k: 'nav.heute' },
  { href: '/wortschatz', k: 'nav.wortschatz' },
  { href: '/lesesaal', k: 'nav.lesesaal' },
  { href: '/tagesfunk', k: 'nav.tagesfunk' },
  { href: '/schreiben', k: 'nav.schreiben' },
  { href: '/grammatik', k: 'nav.grammatik', soon: true },
  { href: '/sprachgrenze', k: 'nav.sprachgrenze', soon: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { health, share, fallback, setFallback, allGerman, setAllGerman } = useLearner();
  const online = health && health !== 'offline';

  return (
    <div className="min-h-dvh sm:grid sm:grid-cols-[220px_1fr]">
      <aside className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 sm:sticky sm:top-0 sm:h-dvh sm:flex-col sm:items-stretch sm:justify-start sm:border-r sm:border-b-0 sm:px-5 sm:py-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Germanio
        </Link>
        <nav className="flex gap-1 overflow-x-auto sm:mt-12 sm:flex-col sm:gap-0">
          {NAV.map((n) => {
            const active = pathname.startsWith(n.href);
            return n.soon ? (
              <span key={n.href} className="flex items-baseline justify-between whitespace-nowrap px-2 py-1.5 text-muted/60 sm:px-0">
                <T k={n.k} />
                <span className="label hidden sm:inline">bald</span>
              </span>
            ) : (
              <Link
                key={n.href}
                href={n.href}
                className={`relative whitespace-nowrap px-2 py-1.5 transition-colors sm:px-0 ${active ? 'font-semibold' : 'text-ink-2 hover:text-ink'}`}
              >
                {active && <span className="absolute top-1/2 -left-5 hidden h-px w-3 bg-ink sm:block" />}
                <T k={n.k} />
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto hidden space-y-5 sm:block">
          <div>
            <p className="label">Oberfläche</p>
            <p className="mt-1 text-sm">
              <span className="tabular-nums font-semibold">{Math.round(share * 100)} %</span> <T k="ui.german" />
            </p>
            <div className="mt-2 h-px w-full bg-line">
              <div className="h-px bg-ink transition-[width] duration-700" style={{ width: `${share * 100}%` }} />
            </div>
          </div>
          <div className="flex gap-2 text-xs">
            {(['fa', 'en'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFallback(f)}
                className={`border px-2 py-1 font-mono uppercase ${fallback === f ? 'border-ink' : 'border-line text-muted'}`}
              >
                {f}
              </button>
            ))}
            <button
              onClick={() => setAllGerman(!allGerman)}
              className={`border px-2 py-1 font-mono uppercase ${allGerman ? 'border-ink bg-ink text-paper' : 'border-line text-muted'}`}
              title="Immersion: alles auf Deutsch"
            >
              de
            </button>
          </div>
          <p className="label flex items-center gap-2">
            <span className={`inline-block size-1.5 rounded-full border border-ink ${online ? 'bg-ink' : 'bg-transparent'}`} />
            {online ? `Gehirn · ${health.ai.provider}` : health ? <T k="brain.offline" /> : '…'}
          </p>
          <p className="label">⌘K / Strg+K · Suchen</p>
        </div>
      </aside>

      <main className="min-w-0">
        {health === 'offline' ? <Offline /> : children}
      </main>
      <CommandPalette />
    </div>
  );
}

function Offline() {
  return (
    <div className="flex min-h-[80dvh] flex-col justify-end px-4 pb-16 sm:px-12">
      <p className="label">Gehirn offline</p>
      <h1 className="mt-4 max-w-[14ch] font-display text-[clamp(2.5rem,6vw,5.5rem)] leading-[0.92] font-semibold tracking-[-0.04em]">
        Dein Gehirn schläft noch.
      </h1>
      <p lang="fa" className="mt-6 max-w-xl text-lg text-ink-2">
        سرویس محلی brain اجرا نیست. در پوشهٔ پروژه این دستور را اجرا کن:
      </p>
      <pre className="mt-4 w-fit border border-ink px-4 py-3 font-mono text-sm">pnpm --filter @germanio/brain dev</pre>
    </div>
  );
}
