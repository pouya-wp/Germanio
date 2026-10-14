const WORD_CHAR = /[A-Za-zÄÖÜäöüßẞ-]/;
const STOPWORDS = new Set(
  'der die das und ist nicht ich sie es ein eine zu mit auf für von den dem sich auch wir ihr aber wie oder noch nur wenn dass werden wird sind war hat haben'.split(' '),
);

/** The word under a viewport point, plus the sentence it sits in. */
export function wordAtPoint(x: number, y: number): { word: string; sentence: string; rect: DOMRect } | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };
  let node: Node | null = null;
  let offset = 0;
  const pos = doc.caretPositionFromPoint?.(x, y);
  if (pos) {
    node = pos.offsetNode;
    offset = pos.offset;
  } else {
    const range = document.caretRangeFromPoint?.(x, y);
    if (range) {
      node = range.startContainer;
      offset = range.startOffset;
    }
  }
  if (!node || node.nodeType !== Node.TEXT_NODE) return null;
  const text = node.textContent ?? '';
  let start = offset;
  let end = offset;
  while (start > 0 && WORD_CHAR.test(text[start - 1]!)) start--;
  while (end < text.length && WORD_CHAR.test(text[end]!)) end++;
  const word = text.slice(start, end).replace(/^-+|-+$/g, '');
  if (word.length < 2) return null;

  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  return { word, sentence: sentenceAround(node, word), rect: range.getBoundingClientRect() };
}

/** Sentence containing `word`, taken from the nearest block-level ancestor's text. */
export function sentenceAround(node: Node, word: string): string {
  let el: HTMLElement | null = node.parentElement;
  while (el && getComputedStyle(el).display === 'inline') el = el.parentElement;
  const block = (el?.innerText ?? node.textContent ?? '').replace(/\s+/g, ' ').trim();
  const sentences = block.match(/[^.!?…]+[.!?…]*/g) ?? [block];
  const hit = sentences.find((s) => s.includes(word)) ?? block;
  return hit.trim().slice(0, 500);
}

/** Cheap language guess: lang attribute, else German function-word density. */
export function looksGerman(): boolean {
  const lang = document.documentElement.lang?.toLowerCase() ?? '';
  if (lang.startsWith('de')) return true;
  if (lang && !lang.startsWith('de')) return false;
  const words = (document.body?.innerText ?? '').slice(0, 4000).toLowerCase().match(/[a-zäöüß]+/g) ?? [];
  if (words.length < 40) return false;
  return words.filter((w) => STOPWORDS.has(w)).length / words.length > 0.12;
}
