import { browser } from 'wxt/browser';
import { defineContentScript } from 'wxt/utils/define-content-script';
import type { LookupResponse, MineResponse } from '@germanio/client';
import { renderCard } from '../lib/card';
import type { Message } from '../lib/messages';
import { looksGerman, sentenceAround, wordAtPoint } from '../lib/text';

const send = <T>(msg: Message) => browser.runtime.sendMessage(msg) as Promise<T>;

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main(ctx) {
    // ── Lookup card ────────────────────────────────────────────────────────
    let host: HTMLElement | null = null;
    let root: ShadowRoot | null = null;

    const close = () => {
      host?.remove();
      host = root = null;
    };

    const open = async (word: string, sentence: string | null, rect: DOMRect) => {
      if (!host) {
        host = document.createElement('germanio-card');
        root = host.attachShadow({ mode: 'closed' });
        document.documentElement.append(host);
      }
      const res = await send<LookupResponse | { error: string }>({ type: 'lookup', q: word });
      if (!root) return;
      const lookup = 'error' in res ? null : res;
      renderCard(root, lookup, rect, {
        onClose: close,
        onMine: async () => {
          const r = await send<MineResponse | { error: string }>({
            type: 'mine',
            req: { word, sentence, source: 'web', sourceUrl: location.href.slice(0, 2000), sourceTitle: document.title.slice(0, 300) },
          });
          return 'error' in r ? 'error' : r.alreadyKnown ? 'known' : 'added';
        },
      });
    };

    // Alt + click on any word.
    ctx.addEventListener(document, 'click', (e) => {
      const ev = e as MouseEvent;
      if (host && !ev.composedPath().includes(host)) close();
      if (!ev.altKey) return;
      const hit = wordAtPoint(ev.clientX, ev.clientY);
      if (!hit) return;
      ev.preventDefault();
      ev.stopPropagation();
      void open(hit.word, hit.sentence, hit.rect);
    }, { capture: true });

    ctx.addEventListener(document, 'keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Escape') close();
    });

    // Alt+Shift+D (from the background command): look up the selection.
    browser.runtime.onMessage.addListener((msg: unknown) => {
      if ((msg as { type?: string }).type !== 'lookup-selection') return;
      const sel = window.getSelection();
      const word = sel?.toString().trim();
      if (!sel || !word || word.length > 60) return;
      const range = sel.getRangeAt(0);
      void open(word, sentenceAround(range.startContainer, word), range.getBoundingClientRect());
    });

    // ── Stundenzähler: time on German pages ───────────────────────────────
    // Every minute the tab is visible on a German page counts; it is "active"
    // if the learner scrolled, clicked or typed during that minute.
    if (!looksGerman()) return;
    let interacted = false;
    for (const ev of ['scroll', 'pointerdown', 'keydown', 'wheel'] as const) {
      ctx.addEventListener(window, ev, () => (interacted = true), { passive: true });
    }
    ctx.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void send({ type: 'time', entry: { source: 'web', activity: 'reading', seconds: 60, active: interacted } });
      interacted = false;
    }, 60_000);
  },
});
