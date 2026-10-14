'use client';

import { useEffect, useState } from 'react';
import type { LookupResponse } from '@germanio/client';
import { brain } from '@/lib/brain';
import { germanPos, germanTags } from '@/lib/grammar-tags';
import { Article } from './genus';
import { useLearner } from './providers';
import { T } from './t';

/**
 * Everything about one word: lemma with gender colour, forms, Persian meaning,
 * senses, an example with native audio, and one button to start learning it.
 * Shared by the ⌘K palette and the Lesesaal side panel.
 */
export function LookupCard({
  res,
  sentence = null,
  source = 'manual',
  sourceUrl = null,
}: {
  res: LookupResponse;
  sentence?: string | null;
  source?: 'manual' | 'reader';
  sourceUrl?: string | null;
}) {
  const [mined, setMined] = useState<'added' | 'known' | null>(null);
  const { refresh } = useLearner();
  const top = res.matches[0];

  useEffect(() => setMined(null), [res.query]);

  if (!top) return <p className="text-muted">Kein Eintrag für „{res.query}“.</p>;

  const mine = async () => {
    const r = await brain.mine({ word: top.lemma, sentence: sentence ?? res.examples[0]?.de ?? null, source, sourceUrl, sourceTitle: null });
    setMined(r.alreadyKnown ? 'known' : 'added');
    void refresh();
  };

  return (
    <div className="space-y-5">
      {res.inflection && (
        <p className="label">
          {res.query} → {res.inflection.lemma} · {germanTags(res.inflection.tags)}
        </p>
      )}
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-5xl leading-none font-semibold tracking-[-0.04em]">
          <Article gender={top.gender} className="mr-3" />
          {top.lemma}
        </h2>
        <span className="label shrink-0">
          {germanPos(top.pos)}
          {top.cefr ? ` · ${top.cefr}` : ''}
        </span>
      </div>
      <p className="font-mono text-sm text-muted">
        {[
          top.plural && `Pl. ${top.plural}`,
          top.extra.praeteritum && `${top.extra.praeteritum} · ${top.extra.aux?.[0] === 'sein' ? 'ist' : 'hat'} ${top.extra.partizip2 ?? ''}`,
          top.extra.komparativ && `${top.extra.komparativ} · ${top.extra.superlativ ?? ''}`,
          top.ipa,
        ]
          .filter(Boolean)
          .join('   ')}
      </p>
      {res.gloss && (
        <p lang="fa" className="text-2xl">
          {res.gloss.fa}
        </p>
      )}
      <ol className="space-y-1 text-ink-2">
        {top.senses.slice(0, 3).map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="label pt-1">{i + 1}</span>
            <span>{s.en.join('; ')}</span>
          </li>
        ))}
      </ol>
      {res.examples.length > 0 && (
        <ul className="space-y-2 border-t border-line pt-4">
          {res.examples.slice(0, 2).map((ex) => (
            <li key={ex.id} className="flex items-start gap-3">
              {ex.audioUrl && (
                <button onClick={() => void new Audio(ex.audioUrl!).play()} className="mt-0.5 font-mono text-xs text-muted hover:text-ink" aria-label="Anhören">
                  ▶
                </button>
              )}
              <span>
                <span className="block">{ex.de}</span>
                <span className="block text-sm text-muted" lang={ex.fa ? 'fa' : 'en'}>
                  {ex.fa ?? ex.en}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between border-t border-line pt-4">
        <span className="label">
          {res.status === 'known' ? <T k="lookup.known" /> : mined === 'added' ? '✓ Karte erstellt' : res.status === 'learning' ? 'Wird gelernt' : 'Neu'}
        </span>
        <button
          onClick={() => void mine()}
          disabled={mined !== null || res.status === 'known'}
          className="border border-ink px-4 py-2 text-sm font-medium transition-colors hover:bg-ink hover:text-paper disabled:opacity-40"
        >
          <T k="lookup.mine" />
        </button>
      </div>
    </div>
  );
}
