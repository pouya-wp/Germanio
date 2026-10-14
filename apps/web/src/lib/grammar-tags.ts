/** Wiktionary inflection tags → German grammar terms (the terms Pouya will meet at Berufsschule). */
const TAGS: Record<string, string> = {
  past: 'Präteritum',
  preterite: 'Präteritum',
  present: 'Präsens',
  participle: 'Partizip',
  infinitive: 'Infinitiv',
  imperative: 'Imperativ',
  subjunctive: 'Konjunktiv',
  'subjunctive-i': 'Konj. I',
  'subjunctive-ii': 'Konj. II',
  indicative: 'Indikativ',
  plural: 'Plural',
  singular: 'Singular',
  nominative: 'Nominativ',
  accusative: 'Akkusativ',
  dative: 'Dativ',
  genitive: 'Genitiv',
  masculine: 'maskulin',
  feminine: 'feminin',
  neuter: 'neutrum',
  comparative: 'Komparativ',
  superlative: 'Superlativ',
  'first-person': '1. Person',
  'second-person': '2. Person',
  'third-person': '3. Person',
  strong: 'stark',
  weak: 'schwach',
  mixed: 'gemischt',
  definite: 'bestimmt',
  diminutive: 'Diminutiv',
};

const POS: Record<string, string> = {
  noun: 'Nomen',
  verb: 'Verb',
  adj: 'Adjektiv',
  adv: 'Adverb',
  prep: 'Präposition',
  conj: 'Konjunktion',
  pron: 'Pronomen',
  det: 'Artikelwort',
  num: 'Zahlwort',
  intj: 'Interjektion',
  particle: 'Partikel',
};

export function germanTags(tags: string[]): string {
  return tags
    .filter((t) => t !== 'lemma' && t !== 'form-of')
    .map((t) => TAGS[t] ?? t)
    .join(' · ');
}

export function germanPos(pos: string): string {
  return POS[pos] ?? pos;
}
