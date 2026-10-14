/**
 * gm — Germanio in the terminal.
 *
 *   gm                 today's numbers
 *   gm review [n]      review due cards (space = reveal, 1–4 = rate, q = quit)
 *   gm peek            print one due card, non-interactive (used by the shell hook)
 *   gm <word>          look a word up
 *   gm hook powershell print a prompt hook: a card appears after slow commands
 */
import { emitKeypressEvents } from 'node:readline';
import { BrainError, createBrainClient, type LookupResponse } from '@germanio/client';
import { Rating, type Card, type Gender, type Grade } from '@germanio/core';

const brain = createBrainClient(process.env.GERMANIO_BRAIN ?? undefined);
const out = process.stdout;

// ── Colour: ink by default, gender hues only for articles ────────────────────
const tty = out.isTTY && !process.env.NO_COLOR;
const rgb = (r: number, g: number, b: number) => (s: string) => (tty ? `\x1b[38;2;${r};${g};${b}m${s}\x1b[39m` : s);
const GENUS: Record<Gender, (s: string) => string> = {
  der: rgb(125, 155, 255), // Kobalt (dark-terminal variant)
  die: rgb(255, 122, 92), // Zinnober
  das: rgb(108, 196, 138), // Moos
};
const bold = (s: string) => (tty ? `\x1b[1m${s}\x1b[22m` : s);
const dim = (s: string) => (tty ? `\x1b[2m${s}\x1b[22m` : s);
const label = (s: string) => dim(s.toUpperCase().split('').join(' '));
const article = (g: Gender | null) => (g ? `${GENUS[g](bold(g))} ` : '');

function meaning(card: Card): { fa: string | null; en: string } {
  const [fa, en] = card.meaning.includes(' · ') ? card.meaning.split(' · ') : [null, card.meaning];
  return { fa: fa ?? null, en: en ?? '' };
}

function printCardFront(card: Card) {
  out.write(`\n  ${article(card.gender)}${bold(card.lemma)}\n`);
  if (card.sentence && card.kind !== 'genus') out.write(`  ${dim(card.sentence)}\n`);
}

function printCardBack(card: Card) {
  const m = meaning(card);
  if (m.fa) out.write(`  ${m.fa}\n`);
  out.write(`  ${m.en}\n`);
  if (card.sentenceTranslation) out.write(`  ${dim(card.sentenceTranslation)}\n`);
}

function key(): Promise<string> {
  return new Promise((resolve) => {
    emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('keypress', (str: string | undefined, k: { name?: string; ctrl?: boolean }) => {
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.pause();
      if (k.ctrl && k.name === 'c') process.exit(130);
      resolve(k.name ?? str ?? '');
    });
  });
}

// ── Commands ─────────────────────────────────────────────────────────────────

async function today() {
  const [t, f] = await Promise.all([brain.today(), brain.forecast()]);
  const eta = f.eta ? new Date(f.eta).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' }) : 'noch offen';
  out.write(`\n  ${bold('Germanio')}  ${dim(t.day)}\n\n`);
  out.write(`  ${label('fällig')}  ${bold(String(t.dueCount).padStart(4))}    ${label('neu')}  ${bold(String(t.newRemaining).padStart(3))}    ${label('heute')}  ${bold(t.todayHours.toFixed(1))} h\n`);
  out.write(`  ${label(f.settings.target)}  ${bold(eta)}  ${dim(`· ${f.totalHours.toFixed(1)} h gesamt · ${f.knownLemmas} Wörter sicher`)}\n\n`);
  out.write(`  ${dim('gm review  ·  gm <wort>')}\n\n`);
}

async function review(limit: number) {
  const q = await brain.queue(limit);
  if (q.cards.length === 0) return void out.write(`\n  ${bold('Fertig für jetzt.')} ${dim('Nichts fällig.')}\n\n`);
  out.write(`\n  ${label(`${q.cards.length} karten`)}  ${dim('Leertaste = zeigen · 1 nochmal · 2 schwer · 3 gut · 4 leicht · q = Ende')}\n`);
  let done = 0;
  for (const card of q.cards) {
    const shown = Date.now();
    if (card.kind === 'genus') out.write(`\n  ${dim('Welcher Artikel?')}  ${bold(card.lemma)}  ${dim('[1] der  [2] die  [3] das')}\n`);
    else printCardFront(card);
    let k = await key();
    if (k === 'q') break;
    let grade: Grade;
    if (card.kind === 'genus') {
      const pick = ({ '1': 'der', '2': 'die', '3': 'das' } as const)[k as '1' | '2' | '3'];
      const ok = pick === card.gender;
      out.write(`  ${ok ? '✓' : '✗'} ${article(card.gender)}${card.lemma}\n`);
      grade = ok ? Rating.Good : Rating.Again;
    } else {
      printCardBack(card);
      out.write(`  ${dim('1 · 2 · 3 · 4')}\n`);
      k = await key();
      if (k === 'q') break;
      const map: Record<string, Grade> = { '1': Rating.Again, '2': Rating.Hard, '3': Rating.Good, '4': Rating.Easy, space: Rating.Good, return: Rating.Good };
      grade = map[k] ?? Rating.Good;
    }
    await brain.review({ cardId: card.id, rating: grade, durationMs: Math.min(600_000, Date.now() - shown) });
    done++;
  }
  out.write(`\n  ${bold(`${done} Karten.`)} ${dim('Bis gleich.')}\n\n`);
}

/** One due card, front and back, in two lines — for the shell hook. Silent when offline. */
async function peek() {
  try {
    const q = await brain.queue(1);
    const card = q.cards[0];
    if (!card) return;
    const m = meaning(card);
    out.write(`${dim('gm ·')} ${article(card.gender)}${bold(card.lemma)} ${dim('—')} ${m.fa ?? m.en}${m.fa ? dim(` · ${m.en}`) : ''}\n`);
  } catch {
    /* brain offline: never disturb the shell */
  }
}

async function lookup(word: string) {
  const r: LookupResponse = await brain.lookup(word);
  const top = r.matches[0];
  if (!top) return void out.write(`\n  Kein Eintrag für „${word}“.\n\n`);
  out.write('\n');
  if (r.inflection) out.write(`  ${dim(`${r.query} → ${r.inflection.lemma} · ${r.inflection.tags.join(' · ')}`)}\n`);
  out.write(`  ${article(top.gender)}${bold(top.lemma)}  ${dim(`${top.pos}${top.cefr ? ' · ' + top.cefr : ''}`)}\n`);
  const forms = [top.plural && `Pl. ${top.plural}`, top.extra.praeteritum && `${top.extra.praeteritum}, ${top.extra.aux?.[0] === 'sein' ? 'ist' : 'hat'} ${top.extra.partizip2 ?? ''}`, top.ipa].filter(Boolean);
  if (forms.length) out.write(`  ${dim(forms.join('   '))}\n`);
  if (r.gloss) out.write(`  ${r.gloss.fa}\n`);
  top.senses.slice(0, 3).forEach((s, i) => out.write(`  ${dim(String(i + 1))} ${s.en.join('; ')}\n`));
  const ex = r.examples[0];
  if (ex) out.write(`\n  ${ex.de}\n  ${dim(ex.fa ?? ex.en ?? '')}\n`);
  out.write('\n');
}

function hook(shell: string) {
  if (shell === 'powershell' || shell === 'pwsh') {
    out.write(`# Germanio: show one card after commands that take longer than 8 s.
# Add to your $PROFILE:  gm hook powershell | Out-String | Invoke-Expression
if (-not (Get-Variable GermanioOrigPrompt -Scope Global -ErrorAction SilentlyContinue)) {
  $global:GermanioOrigPrompt = $function:prompt
}
function global:prompt {
  $last = Get-History -Count 1
  if ($last -and $last.Id -ne $global:GermanioLastId) {
    $global:GermanioLastId = $last.Id
    if (($last.EndExecutionTime - $last.StartExecutionTime).TotalSeconds -ge 8) { gm peek }
  }
  & $global:GermanioOrigPrompt
}
`);
  } else if (shell === 'bash' || shell === 'zsh') {
    out.write(`# Germanio: show one card after commands that take longer than 8 s.
# Add to your rc file:  eval "$(gm hook ${shell})"
__gm_start() { __gm_t=\${__gm_t:-$SECONDS}; }
__gm_end() { local d=$((SECONDS - \${__gm_t:-$SECONDS})); unset __gm_t; [ "$d" -ge 8 ] && gm peek; }
${shell === 'zsh' ? 'preexec_functions+=(__gm_start); precmd_functions+=(__gm_end)' : "trap '__gm_start' DEBUG; PROMPT_COMMAND=\"__gm_end;\${PROMPT_COMMAND}\""}
`);
  } else {
    out.write('Usage: gm hook powershell|bash|zsh\n');
  }
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  try {
    if (!cmd || cmd === 'today') await today();
    else if (cmd === 'review') await review(Number(rest[0] ?? 30));
    else if (cmd === 'peek') await peek();
    else if (cmd === 'hook') hook(rest[0] ?? '');
    else if (cmd === 'help' || cmd === '--help' || cmd === '-h') out.write('gm · gm review [n] · gm peek · gm <wort> · gm hook powershell|bash|zsh\n');
    else await lookup([cmd, ...rest].join(' '));
  } catch (e) {
    if (e instanceof BrainError && e.status === 0) {
      out.write(`\n  ${bold('Gehirn offline.')} ${dim('Starte: pnpm --filter @germanio/brain dev')}\n\n`);
      process.exitCode = 2;
    } else throw e;
  }
}

await main();
