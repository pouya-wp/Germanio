'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { LookupResponse } from '@germanio/client';
import { brain } from '@/lib/brain';
import { LookupCard } from './lookup-card';
import { useLearner } from './providers';

/** ⌘K / Ctrl+K — look up any German word from anywhere in the app. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [res, setRes] = useState<LookupResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useLearner();

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
    }
  }, [open]);

  useEffect(() => {
    const query = q.trim();
    if (!query) {
      setRes(null);
      return;
    }
    const id = setTimeout(() => {
      brain.lookup(query).then(setRes).catch(() => setRes(null));
    }, 120);
    return () => clearTimeout(id);
  }, [q]);

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
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('lookup.placeholder').text}
              className="w-full border-b border-line bg-transparent px-5 py-4 text-2xl font-medium tracking-tight outline-none placeholder:text-muted"
              spellCheck={false}
              autoComplete="off"
            />
            {res && (
              <div className="px-5 py-6">
                <LookupCard res={res} />
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
