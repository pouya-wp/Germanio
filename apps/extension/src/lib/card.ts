import type { LookupResponse } from '@germanio/client';

/**
 * The lookup card, rendered inside a closed shadow root so page CSS can't
 * touch it (and ours can't leak). Same tokens as the web app: paper, ink, and
 * colour only for gender.
 */
const CSS = `
:host { all: initial; }
.card {
  --paper: #f2efe8; --ink: #0e0e10; --ink2: #3a3a3f; --muted: #6f6d67; --line: #d8d3c8;
  --der: #1f4bd8; --die: #c4361f; --das: #2c7a43;
  position: fixed; z-index: 2147483647; width: 340px; max-width: calc(100vw - 24px);
  background: var(--paper); color: var(--ink); border: 1px solid var(--ink);
  font: 14px/1.45 ui-sans-serif, system-ui, "Segoe UI", sans-serif;
  box-shadow: 0 30px 80px -30px rgba(0,0,0,.45);
  animation: rise .28s cubic-bezier(.16,1,.3,1);
}
@media (prefers-color-scheme: dark) {
  .card { --paper: #17171b; --ink: #f2efe8; --ink2: #c9c6be; --muted: #8d8b84; --line: #2a2a30; --der: #7d9bff; --die: #ff7a5c; --das: #6cc48a; }
}
@keyframes rise { from { opacity: 0; transform: translateY(6px); } }
@media (prefers-reduced-motion: reduce) { .card { animation: none; } }
.pad { padding: 14px 16px; }
.label { font: 10px/1.2 ui-monospace, "Cascadia Mono", monospace; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
.lemma { font-size: 30px; line-height: 1; font-weight: 650; letter-spacing: -.03em; margin: 6px 0 4px; }
.der { color: var(--der); } .die { color: var(--die); } .das { color: var(--das); }
.meta { font: 12px/1.4 ui-monospace, monospace; color: var(--muted); }
.fa { direction: rtl; font-family: "Meem", "Vazirmatn", Tahoma, sans-serif; font-size: 18px; margin-top: 8px; }
.en { color: var(--ink2); margin-top: 4px; }
.ex { border-top: 1px solid var(--line); margin-top: 10px; padding-top: 10px; }
.ex .t { color: var(--muted); font-size: 12px; }
.row { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--line); padding: 10px 16px; }
button { all: unset; cursor: pointer; font: inherit; }
.btn { border: 1px solid var(--ink); padding: 6px 12px; font-weight: 550; }
.btn:hover { background: var(--ink); color: var(--paper); }
.btn[disabled] { opacity: .4; pointer-events: none; }
.play { color: var(--muted); margin-right: 6px; }
.play:hover { color: var(--ink); }
.x { color: var(--muted); }
`;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export interface CardHandlers {
  onMine: () => Promise<'added' | 'known' | 'error'>;
  onClose: () => void;
}

export function renderCard(root: ShadowRoot, res: LookupResponse | null, anchor: DOMRect, h: CardHandlers): void {
  const top = res?.matches[0];
  const left = Math.min(Math.max(12, anchor.left), window.innerWidth - 352);
  const below = anchor.bottom + 10;
  const y = below + 320 > window.innerHeight ? Math.max(12, anchor.top - 330) : below;

  const body = top
    ? `
    <div class="pad">
      ${res!.inflection ? `<div class="label">${esc(res!.query)} → ${esc(res!.inflection.lemma)} · ${esc(res!.inflection.tags.join(' · '))}</div>` : `<div class="label">${esc(top.pos)}${top.cefr ? ' · ' + top.cefr : ''}</div>`}
      <div class="lemma">${top.gender ? `<span class="${top.gender}">${top.gender}</span> ` : ''}${esc(top.lemma)}</div>
      <div class="meta">${[top.plural && 'Pl. ' + top.plural, top.extra.praeteritum && `${top.extra.praeteritum} · ${top.extra.aux?.[0] === 'sein' ? 'ist' : 'hat'} ${top.extra.partizip2 ?? ''}`, top.ipa].filter(Boolean).map((s) => esc(String(s))).join(' &nbsp; ')}</div>
      ${res!.gloss ? `<div class="fa" lang="fa">${esc(res!.gloss.fa)}</div>` : ''}
      <div class="en">${esc(top.senses.slice(0, 2).flatMap((s) => s.en).join('; '))}</div>
      ${res!.examples[0] ? `<div class="ex">${res!.examples[0].audioUrl ? `<button class="play" data-audio="${esc(res!.examples[0].audioUrl)}">▶</button>` : ''}${esc(res!.examples[0].de)}<div class="t">${esc(res!.examples[0].fa ?? res!.examples[0].en ?? '')}</div></div>` : ''}
    </div>
    <div class="row">
      <span class="label status">${res!.status === 'known' ? 'Schon bekannt' : res!.status === 'learning' ? 'Wird gelernt' : 'Neu'}</span>
      <span><button class="x" data-close>Esc</button> &nbsp; <button class="btn" data-mine ${res!.status === 'known' ? 'disabled' : ''}>Lernen</button></span>
    </div>`
    : `<div class="pad"><div class="label">Germanio</div><div class="en">${res ? `Kein Eintrag für „${esc(res.query)}“.` : 'Gehirn offline — starte brain.'}</div></div>`;

  root.innerHTML = `<style>${CSS}</style><div class="card" role="dialog" aria-label="Germanio" style="left:${left}px;top:${y}px">${body}</div>`;

  root.querySelector('[data-close]')?.addEventListener('click', h.onClose);
  root.querySelectorAll<HTMLButtonElement>('[data-audio]').forEach((b) =>
    b.addEventListener('click', () => void new Audio(b.dataset.audio!).play()),
  );
  const mine = root.querySelector<HTMLButtonElement>('[data-mine]');
  mine?.addEventListener('click', async () => {
    mine.setAttribute('disabled', '');
    const r = await h.onMine();
    const status = root.querySelector('.status');
    if (status) status.textContent = r === 'added' ? '✓ Karte erstellt' : r === 'known' ? 'Schon bekannt' : 'Fehler';
  });
}
