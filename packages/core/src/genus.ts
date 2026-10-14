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
