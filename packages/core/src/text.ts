/** Word tokens including umlauts, ß and hyphenated compounds ("E-Mail"). */
const WORD_RE = /[A-Za-zÄÖÜäöüßẞ]+(?:-[A-Za-zÄÖÜäöüßẞ]+)*/g;

export interface Token {
  text: string;
  start: number;
  end: number;
}

export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  for (const m of text.matchAll(WORD_RE)) {
    out.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }
  return out;
}

/** Case- and ß-insensitive key used for lookups when no lemmatizer is available. */
export function normalizeKey(word: string): string {
  return word.toLocaleLowerCase('de-DE').replace(/ẞ/g, 'ß');
}

/**
 * Transliteration fallback for learners without a QWERTZ layout yet.
 * Only applied while typing; "ue" in words like "neue" or "Quelle" is a real
 * risk, so the replacement runs only on explicit markers: ae/oe/ue followed
 * by the learner pressing the trigger, or the unambiguous `a:`/`o:`/`u:`/`s:` forms.
 */
const COLON_MAP: Record<string, string> = {
  'a:': 'ä', 'o:': 'ö', 'u:': 'ü', 'A:': 'Ä', 'O:': 'Ö', 'U:': 'Ü', 's:': 'ß',
};

export function expandUmlautShortcuts(input: string): string {
  return input.replace(/[aouAOUs]:/g, (m) => COLON_MAP[m] ?? m);
}

/** Loose comparison for answers: ignores case, surrounding punctuation and accepts ae/oe/ue/ss. */
export function answersMatch(given: string, expected: string): boolean {
  const fold = (s: string) =>
    normalizeKey(s.trim().replace(/^[\s.,!?;:"'„“]+|[\s.,!?;:"'„“]+$/g, ''))
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/\s+/g, ' ');
  return fold(given) === fold(expected);
}

/** Split a German compound at known boundaries for the signature split animation. */
export function splitCompound(word: string, parts: string[]): string[] {
  const joined = parts.join('').toLocaleLowerCase('de-DE');
  if (joined !== word.toLocaleLowerCase('de-DE')) return [word];
  let i = 0;
  return parts.map((p) => {
    const slice = word.slice(i, i + p.length);
    i += p.length;
    return slice;
  });
}
