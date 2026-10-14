'use client';

import { useEffect, useState } from 'react';
import type { ForecastResponse } from '@germanio/client';
import { levelFromProgress } from '@germanio/core';
import { brain } from '@/lib/brain';
import { useLearner } from '@/components/providers';

/** When the learner's brain is running, the landing page shows their real numbers. */
export function LiveFrontier() {
  const { health } = useLearner();
  const [f, setF] = useState<ForecastResponse | null>(null);

  useEffect(() => {
    if (!health || health === 'offline') return;
    brain.forecast().then(setF).catch(() => setF(null));
  }, [health]);

  if (!f) return null;
  const { level, fraction } = levelFromProgress(f.progress);
  const eta = f.eta ? new Date(f.eta).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  return (
    <dl className="mt-14 grid grid-cols-2 border-t border-ink sm:grid-cols-4">
      {[
        ['Stunden', f.totalHours.toFixed(1)],
        ['Wörter sicher', String(f.knownLemmas)],
        ['Niveau', `${level} · ${Math.round(fraction * 100)} %`],
        [`${f.settings.target} voraussichtlich`, eta ?? '—'],
      ].map(([k, v]) => (
        <div key={k} className="border-b border-line py-5 pr-4">
          <dt className="label">{k}</dt>
          <dd className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
