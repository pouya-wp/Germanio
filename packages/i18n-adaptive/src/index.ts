/**
 * Interface as Curriculum.
 *
 * Every UI string is bound to the German lemmas it contains. A string is shown
 * in German once the learner reliably knows *all* of its lemmas; until then it
 * appears in the learner's fallback language, with the German one hover away.
 * The UI therefore turns German exactly as fast as the learner does.
 */
export type Fallback = 'fa' | 'en';

export interface UiString {
  de: string;
  en: string;
  fa: string;
  /** Lemmas that must be known before `de` is shown. Function words count too. */
  lemmas: string[];
}

export interface Resolved {
  text: string;
  lang: 'de' | Fallback;
  de: string;
  /** Lemmas still missing — shown in the hover so each string teaches its own words. */
  missing: string[];
}

export function resolveString(s: UiString, known: ReadonlySet<string>, fallback: Fallback, forceGerman = false): Resolved {
  const missing = s.lemmas.filter((l) => !known.has(l));
  if (forceGerman || missing.length === 0) return { text: s.de, lang: 'de', de: s.de, missing };
  return { text: s[fallback], lang: fallback, de: s.de, missing };
}

/** Share of the interface already in German — "Deine Oberfläche ist zu 34 % deutsch." */
export function germanShare(strings: Record<string, UiString>, known: ReadonlySet<string>): number {
  const all = Object.values(strings);
  if (all.length === 0) return 0;
  return all.filter((s) => s.lemmas.every((l) => known.has(l))).length / all.length;
}

/**
 * The lemmas that would flip the most UI strings to German if learned next —
 * fed back into the new-card queue so the interface itself becomes curriculum.
 */
export function mostValuableLemmas(strings: Record<string, UiString>, known: ReadonlySet<string>, limit = 10): string[] {
  const score = new Map<string, number>();
  for (const s of Object.values(strings)) {
    const missing = s.lemmas.filter((l) => !known.has(l));
    for (const l of missing) score.set(l, (score.get(l) ?? 0) + 1 / missing.length);
  }
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([l]) => l);
}

export function defineStrings<K extends string>(strings: Record<K, UiString>): Record<K, UiString> {
  return strings;
}
