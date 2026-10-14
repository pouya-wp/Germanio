import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { createBrainClient } from '@germanio/client';
import type { Card } from '@germanio/core';

/**
 * Micro-card: one due card slides in at the corner. Click (or Space) reveals,
 * 1–4 rates. Untouched cards leave by themselves after 25 s — never nagging.
 */
const brain = createBrainClient();
const win = getCurrentWindow();
const app = document.getElementById('app')!;
let card: Card | null = null;
let shownAt = 0;
let idleTimer = 0;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function hideSoon(ms: number) {
  clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => void win.hide(), ms);
}

function front(c: Card) {
  app.innerHTML = `
    <p class="label">Mikro-Karte · Klick zum Aufdecken</p>
    <p class="lemma">${c.gender ? `<span class="${c.gender}">${c.gender}</span> ` : ''}${esc(c.lemma)}</p>
    ${c.sentence ? `<p class="sentence">${esc(c.sentence)}</p>` : ''}`;
}

function back(c: Card) {
  const [fa, en] = c.meaning.includes(' · ') ? c.meaning.split(' · ') : [null, c.meaning];
  app.innerHTML = `
    <p class="label">${esc(c.lemma)}</p>
    ${fa ? `<p class="fa" lang="fa">${esc(fa)}</p>` : ''}
    <p class="en">${esc(en ?? '')}</p>
    <div class="grades">
      <button data-g="1">Nochmal<small>1</small></button><button data-g="2">Schwer<small>2</small></button>
      <button data-g="3">Gut<small>3</small></button><button data-g="4">Leicht<small>4</small></button>
    </div>`;
  app.querySelectorAll<HTMLButtonElement>('[data-g]').forEach((b) => b.addEventListener('click', () => void rate(Number(b.dataset.g) as 1 | 2 | 3 | 4)));
  void new Audio(brain.ttsUrl(c.lemma)).play().catch(() => {});
}

async function rate(g: 1 | 2 | 3 | 4) {
  if (!card) return;
  await brain.review({ cardId: card.id, rating: g, durationMs: Math.min(600_000, Date.now() - shownAt) }).catch(() => {});
  card = null;
  app.innerHTML = `<p class="label">✓ Danke. Bis später.</p>`;
  hideSoon(900);
}

await listen('micro-card', async () => {
  try {
    const q = await brain.queue(1);
    card = q.cards[0] ?? null;
  } catch {
    card = null;
  }
  if (!card) return void win.hide();
  shownAt = Date.now();
  front(card);
  hideSoon(25_000);
});

app.addEventListener('click', (e) => {
  if (!card || (e.target as HTMLElement).closest('[data-g]')) return;
  clearTimeout(idleTimer);
  back(card);
});
window.addEventListener('keydown', (e) => {
  if (!card) return;
  if (e.key === ' ') back(card);
  if (['1', '2', '3', '4'].includes(e.key)) void rate(Number(e.key) as 1 | 2 | 3 | 4);
  if (e.key === 'Escape') void win.hide();
});
