'use client';

import type { StringKey } from '@/lib/strings';
import { useLearner } from './providers';

/**
 * An adaptive UI string. Shows German once its lemmas are known; otherwise the
 * fallback language, with the German form (and the words still missing) on hover.
 */
export function T({ k, className }: { k: StringKey; className?: string }) {
  const { t } = useLearner();
  const r = t(k);
  const title = r.lang === 'de' ? undefined : `${r.de}${r.missing.length ? ` — ${r.missing.join(', ')}` : ''}`;
  return (
    <span lang={r.lang} title={title} className={className} data-adaptive={r.lang}>
      {r.text}
    </span>
  );
}
