'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { LookupResponse } from '@germanio/client';
import { brain } from '@/lib/brain';
import { germanPos, germanTags } from '@/lib/grammar-tags';
import { Article } from './genus';
import { useLearner } from './providers';
import { T } from './t';

/**
 * ⌘K / Ctrl+K — look up any German word from anywhere in the app, hear it,
 * and turn it into a card with one key (Enter).
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [res, setRes] = useState<LookupResponse | null>(null);
  const [mined, setMined] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t, refresh } = useLearner();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
    else {
      setQ('');
      setRes(null);
      setMined(null);
    }
  }, [open]);

  useEffect(() => {
    const query = q.trim();
    if (!query) return setRes(null);
    const id = setTimeout(() => {
      brain.lookup(query).then(setRes).catch(() => setRes(null));
    }, 120);
    return () => clearTimeout(id);
  }, [q]);

  const top = res?.matches[0];

  const mine = async () => {
    if (!top) return;
    const r = await brain.mine({ word: top.lemma, sentence: res?.examples[0]?.de ?? null, source: 'manual', sourceUrl: null, sourceTitle: null });
    setMined(r.alreadyKnown ? 'known' : 'added');
    void refresh();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-paper/70 px-4 pt-[12vh] backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-label="Wort suchen"
            className="w-full max-w-2xl border border-ink bg-surface shadow-[0_40px_120px_-40px_rgba(0,0,0,0.35)]"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setMined(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && void mine()}
              placeholder={t('lookup.placeholder').text}
              className="w-full border-b border-line bg-transparent px-5 py-4 text-2xl font-medium tracking-tight outline-none placeholder:text-muted"
              spellCheck={false}
              autoComplete="off"
            />
            {top && (
              <div className="space-y-5 px-5 py-6">
                {res?.inflection && (
                  <p className="label">
                    {res.query} → {res.inflection.lemma} · {germanTags(res.inflection.tags)}
                  </p>
                )}
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="font-display text-5xl leading-none font-semibold tracking-[-0.04em]">
                    <Article gender={top.gender} className="mr-3" />
                    {top.lemma}
                  </h2>
                  <span className="label">{germanPos(top.pos)}{top.cefr ? ` · ${top.cefr}` : ''}</span>
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
                      <span>
                        {s.fa && <span lang="fa">{s.fa} · </span>}
                        {s.en.join('; ')}
                      </span>
                    </li>
                  ))}
                </ol>
                {res.examples.length > 0 && (
                  <ul className="space-y-2 border-t border-line pt-4">
                    {res.examples.slice(0, 2).map((ex) => (
                      <li key={ex.id} className="flex items-start gap-3">
                        {ex.audioUrl && (
                          <button
                            onClick={() => void new Audio(ex.audioUrl!).play()}
                            className="mt-0.5 font-mono text-xs text-muted hover:text-ink"
                            aria-label="Anhören"
                          >
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
                    {res.status === 'known' ? <T k="lookup.known" /> : mined === 'added' ? '✓ Karte erstellt' : 'Enter ↵'}
                  </span>
                  <button
                    onClick={() => void mine()}
                    disabled={mined !== null}
                    className="border border-ink px-4 py-2 text-sm font-medium transition-colors hover:bg-ink hover:text-paper disabled:opacity-40"
                  >
                    <T k="lookup.mine" />
                  </button>
                </div>
              </div>
            )}
            {q && res && !top && <p className="px-5 py-6 text-muted">Kein Eintrag für „{q}“.</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
