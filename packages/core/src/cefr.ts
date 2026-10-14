/**
 * CEFR reference values used across Germanio.
 *
 * Hours are cumulative "effective contact hours" starting from zero, roughly
 * following Goethe-Institut guidance (UE of 45 min converted to hours) and
 * blended with FSI estimates for German. Vocabulary sizes are receptive lemma
 * counts commonly cited for each level. Both are deliberately conservative —
 * the forecast should never promise more than reality delivers.
 */
export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type Cefr = (typeof CEFR_LEVELS)[number];

export const CEFR_HOURS: Record<Cefr, number> = {
  A1: 120,
  A2: 250,
  B1: 420,
  B2: 650,
  C1: 900,
  C2: 1200,
};

export const CEFR_VOCAB: Record<Cefr, number> = {
  A1: 650,
  A2: 1300,
  B1: 2400,
  B2: 4000,
  C1: 8000,
  C2: 12000,
};

export function cefrIndex(level: Cefr): number {
  return CEFR_LEVELS.indexOf(level);
}

/**
 * Map a continuous progress value onto CEFR, e.g. 2.4 → "B1" with 40% of the
 * way to B2. Progress 0 means "nothing yet", 1 means A1 complete.
 */
export function levelFromProgress(progress: number): { level: Cefr | 'Pre-A1'; fraction: number } {
  if (progress < 1) return { level: 'Pre-A1', fraction: Math.max(0, progress) };
  const idx = Math.min(Math.floor(progress), CEFR_LEVELS.length) - 1;
  return { level: CEFR_LEVELS[idx]!, fraction: progress - Math.floor(progress) };
}

/** Piecewise-linear interpolation of a value against a cumulative threshold table. */
export function progressFromThresholds(value: number, table: Record<Cefr, number>): number {
  let prev = 0;
  for (let i = 0; i < CEFR_LEVELS.length; i++) {
    const threshold = table[CEFR_LEVELS[i]!];
    if (value < threshold) return i + (value - prev) / (threshold - prev);
    prev = threshold;
  }
  return CEFR_LEVELS.length;
}
