import { describe, expect, it } from 'vitest';
import { defineStrings, germanShare, mostValuableLemmas, resolveString } from './index';

const strings = defineStrings({
  today: { de: 'Heute', en: 'Today', fa: 'امروز', lemmas: ['heute'] },
  start: { de: 'Jetzt lernen', en: 'Start learning', fa: 'شروع یادگیری', lemmas: ['jetzt', 'lernen'] },
  words: { de: 'Wörter lernen', en: 'Learn words', fa: 'یادگیری واژه‌ها', lemmas: ['Wort', 'lernen'] },
});

describe('adaptive strings', () => {
  it('shows German only when every lemma is known', () => {
    const known = new Set(['jetzt']);
    expect(resolveString(strings.start, known, 'fa')).toEqual({
      text: 'شروع یادگیری',
      lang: 'fa',
      de: 'Jetzt lernen',
      missing: ['lernen'],
    });
    known.add('lernen');
    expect(resolveString(strings.start, known, 'fa').lang).toBe('de');
  });

  it('reports the German share of the interface', () => {
    expect(germanShare(strings, new Set(['heute']))).toBeCloseTo(1 / 3);
  });

  it('ranks lemmas by how much UI they would unlock', () => {
    expect(mostValuableLemmas(strings, new Set(['jetzt']))[0]).toBe('lernen');
  });
});
