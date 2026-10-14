'use client';

import { BrainError } from '@germanio/client';
import { T } from './t';

/** Human message for failed AI calls — above all the subscription's usage limit. */
export function AiError({ error }: { error: unknown }) {
  if (!error) return null;
  if (error instanceof BrainError && error.status === 429) {
    const at = error.retryAt ? new Date(error.retryAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : null;
    return (
      <p className="border-l-2 border-ink pl-3 text-sm">
        <T k="ai.limit" />
        {at ? ` · wieder ab ${at}` : ''}
      </p>
    );
  }
  return <p className="border-l-2 border-ink pl-3 text-sm text-muted">{error instanceof Error ? error.message : String(error)}</p>;
}
