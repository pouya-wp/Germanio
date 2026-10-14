'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Health } from '@germanio/client';
import { germanShare, resolveString, type Fallback, type Resolved } from '@germanio/i18n-adaptive';
import { brain } from '@/lib/brain';
import { strings, type StringKey } from '@/lib/strings';

interface LearnerContext {
  health: Health | 'offline' | null;
  known: ReadonlySet<string>;
  fallback: Fallback;
  setFallback: (f: Fallback) => void;
  /** Show every string in German regardless of progress (immersion mode). */
  allGerman: boolean;
  setAllGerman: (v: boolean) => void;
  t: (key: StringKey) => Resolved;
  share: number;
  refresh: () => Promise<void>;
}

const Ctx = createContext<LearnerContext | null>(null);

function readPref<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T | null) ?? fallback;
  } catch {
    return fallback;
  }
}

function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: preference lives for this session only */
  }
}

export function LearnerProvider({ children }: { children: ReactNode }) {
  const [health, setHealth] = useState<Health | 'offline' | null>(null);
  const [known, setKnown] = useState<ReadonlySet<string>>(new Set());
  const [fallback, setFallbackState] = useState<Fallback>('fa');
  const [allGerman, setAllGermanState] = useState(false);

  useEffect(() => {
    setFallbackState(readPref<Fallback>('germanio.fallback', 'fa'));
    setAllGermanState(readPref<string>('germanio.allGerman', 'false') === 'true');
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [h, k] = await Promise.all([brain.health(), brain.known()]);
      setHealth(h);
      setKnown(new Set(k.lemmas));
    } catch {
      setHealth('offline');
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  const value = useMemo<LearnerContext>(
    () => ({
      health,
      known,
      fallback,
      setFallback: (f) => {
        setFallbackState(f);
        writePref('germanio.fallback', f);
      },
      allGerman,
      setAllGerman: (v) => {
        setAllGermanState(v);
        writePref('germanio.allGerman', String(v));
      },
      t: (key) => resolveString(strings[key], known, fallback, allGerman),
      share: germanShare(strings, known),
      refresh,
    }),
    [health, known, fallback, allGerman, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLearner(): LearnerContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLearner outside LearnerProvider');
  return ctx;
}
