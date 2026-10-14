/**
 * Grammatical gender is the one place Germanio uses saturated colour.
 * Colour always means gender — nothing else is allowed to borrow these hues.
 */
export const GENDERS = ['der', 'die', 'das'] as const;
export type Gender = (typeof GENDERS)[number];

export const GENUS_TOKENS = {
  der: { name: 'Kobalt', cssVar: '--genus-der' },
  die: { name: 'Zinnober', cssVar: '--genus-die' },
  das: { name: 'Moos', cssVar: '--genus-das' },
} as const satisfies Record<Gender, { name: string; cssVar: string }>;

/** Definite article per case for each gender (singular) plus plural. */
export const ARTICLES = {
  nom: { der: 'der', die: 'die', das: 'das', pl: 'die' },
  akk: { der: 'den', die: 'die', das: 'das', pl: 'die' },
  dat: { der: 'dem', die: 'der', das: 'dem', pl: 'den' },
  gen: { der: 'des', die: 'der', das: 'des', pl: 'der' },
} as const;

export type Kasus = 'nom' | 'akk' | 'dat' | 'gen';
export type Numerus = Gender | 'pl';
export type ArticleType = 'definite' | 'indefinite' | 'none';

/** Indefinite / possessive-style article ("ein", plural shown with "kein"). */
export const INDEFINITE = {
  nom: { der: 'ein', die: 'eine', das: 'ein', pl: 'keine' },
  akk: { der: 'einen', die: 'eine', das: 'ein', pl: 'keine' },
  dat: { der: 'einem', die: 'einer', das: 'einem', pl: 'keinen' },
  gen: { der: 'eines', die: 'einer', das: 'eines', pl: 'keiner' },
} as const satisfies Record<Kasus, Record<Numerus, string>>;

const STRONG: Record<Kasus, Record<Numerus, string>> = {
  nom: { der: 'er', die: 'e', das: 'es', pl: 'e' },
  akk: { der: 'en', die: 'e', das: 'es', pl: 'e' },
  dat: { der: 'em', die: 'er', das: 'em', pl: 'en' },
  gen: { der: 'en', die: 'er', das: 'en', pl: 'er' },
};

/**
 * Adjective ending after a definite article (weak), an ein-word (mixed) or no
 * article (strong). The rule of thumb behind it: the ending shows the case and
 * gender signal that the article fails to show.
 */
export function adjectiveEnding(type: ArticleType, numerus: Numerus, kasus: Kasus): string {
  if (type === 'none') return STRONG[kasus][numerus];
  if (numerus === 'pl' || kasus === 'dat' || kasus === 'gen') return 'en';
  if (type === 'definite') return kasus === 'akk' && numerus === 'der' ? 'en' : 'e';
  // mixed: where "ein" carries no ending, the adjective takes the strong one
  if (kasus === 'nom') return numerus === 'der' ? 'er' : numerus === 'das' ? 'es' : 'e';
  return numerus === 'der' ? 'en' : numerus === 'das' ? 'es' : 'e';
}

export function articleFor(type: ArticleType, numerus: Numerus, kasus: Kasus): string {
  if (type === 'none') return '';
  return type === 'definite' ? ARTICLES[kasus][numerus] : INDEFINITE[kasus][numerus];
}
