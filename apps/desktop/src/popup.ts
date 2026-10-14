import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { createBrainClient, type LookupResponse } from '@germanio/client';

/**
 * Ctrl+Alt+D popup: the selection from any Windows app arrives as a "lookup"
 * event. Enter = learn, Esc or losing focus = hide.
 */
const brain = createBrainClient();
const win = getCurrentWindow();
const app = document.getElementById('app')!;
let current: { res: LookupResponse; text: string } | null = null;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function render(res: LookupResponse | null, text: string, note = '') {
  const top = res?.matches[0];
  if (!top) {
    app.innerHTML = `<p class="label">Germanio</p><p class="en">${res ? `Kein Eintrag für „${esc(text)}“.` : 'Gehirn offline — starte brain.'}</p>`;
    return;
  }
  const forms = [
    top.plural && `Pl. ${top.plural}`,
    top.extra.praeteritum && `${top.extra.praeteritum}, ${top.extra.aux?.[0] === 'sein' ? 'ist' : 'hat'} ${top.extra.partizip2 ?? ''}`,
    top.ipa,
  ].filter(Boolean) as string[];
  const ex = res.examples[0];
  app.innerHTML = `
    <p class="label">${res.inflection ? `${esc(res.query)} → ${esc(res.inflection.lemma)}` : esc(top.pos)}${top.cefr ? ' · ' + top.cefr : ''}</p>
    <p class="lemma">${top.gender ? `<span class="${top.gender}">${top.gender}</span> ` : ''}${esc(top.lemma)}</p>
    ${forms.length ? `<p class="meta">${forms.map(esc).join(' &nbsp; ')}</p>` : ''}
    ${res.gloss ? `<p class="fa" lang="fa">${esc(res.gloss.fa)}</p>` : ''}
    <p class="en">${esc(top.senses.slice(0, 2).flatMap((s) => s.en).join('; '))}</p>
    ${ex ? `<div class="ex">${ex.audioUrl ? `<button data-audio="${esc(ex.audioUrl)}">▶</button> ` : ''}${esc(ex.de)}<small>${esc(ex.fa ?? ex.en ?? '')}</small></div>` : ''}
    <div class="row">
      <span class="label" id="status">${note || (res.status === 'known' ? 'Schon bekannt' : res.status === 'learning' ? 'Wird gelernt' : 'Esc · Enter')}</span>
      <span><button data-say>Anhören</button> &nbsp; <button class="btn" data-mine ${res.status === 'known' ? 'disabled' : ''}>Lernen</button></span>
    </div>`;
  app.querySelector<HTMLButtonElement>('[data-audio]')?.addEventListener('click', (e) => void new Audio((e.currentTarget as HTMLElement).dataset.audio!).play());
  app.querySelector('[data-say]')?.addEventListener('click', () => void new Audio(brain.ttsUrl(`${top.gender ? top.gender + ' ' : ''}${top.lemma}`)).play());
  app.querySelector('[data-mine]')?.addEventListener('click', () => void mine());
}

async function mine() {
  if (!current?.res.matches[0]) return;
  const r = await brain.mine({ word: current.res.matches[0].lemma, sentence: current.text.length > current.res.query.length + 3 ? current.text : null, source: 'desktop', sourceUrl: null, sourceTitle: null });
  const status = document.getElementById('status');
  if (status) status.textContent = r.alreadyKnown ? 'Schon bekannt' : '✓ Karte erstellt';
  app.querySelector('[data-mine]')?.setAttribute('disabled', '');
}

await listen<string>('lookup', async (e) => {
  const text = e.payload;
  // A whole sentence was selected: look up its first word the learner probably doesn't know yet — the longest.
  const word = text.includes(' ') ? [...text.matchAll(/[A-Za-zÄÖÜäöüß-]+/g)].map((m) => m[0]).sort((a, b) => b.length - a.length)[0] ?? text : text;
  app.innerHTML = `<p class="label">${esc(word)} …</p>`;
  try {
    const res = await brain.lookup(word);
    current = { res, text };
    render(res, word);
  } catch {
    current = null;
    render(null, word);
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') void win.hide();
  if (e.key === 'Enter') void mine();
});
await win.onFocusChanged(({ payload: focused }) => {
  if (!focused) void win.hide();
});
