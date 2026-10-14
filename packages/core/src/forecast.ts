import { CEFR_HOURS, CEFR_LEVELS, CEFR_VOCAB, progressFromThresholds, type Cefr } from './cefr';

export interface ForecastInput {
  /** Total effective German hours logged so far (all surfaces). */
  hoursLogged: number;
  /** Hours per calendar day for the recent window, oldest first, zeros included. */
  recentDailyHours: number[];
  /** Lemmas with stable memory (see `isKnown`). */
  knownLemmas: number;
  /** Most recent mock exam, if any. `scorePct` 0..100; 60 is a pass. */
  mockExam?: { level: Cefr; scorePct: number } | null;
  target: Cefr;
  deadline?: Date | null;
  now?: Date;
}

export interface Forecast {
  /** Continuous level, 1 = A1 complete, 4 = B2 complete. */
  progress: number;
  /** The signals the progress is built from, shown in the UI for transparency. */
  signals: { hours: number; vocab: number; exam: number | null };
  hoursRemaining: number;
  paceHoursPerDay: number;
  eta: Date | null;
  /** Hours per day needed to meet the deadline from today. */
  requiredPace: number | null;
  onTrack: boolean | null;
}

/** Exponentially weighted pace: recent days matter more, but one bad day is not a verdict. */
export function ewmaPace(daily: number[], halfLifeDays = 5): number {
  if (daily.length === 0) return 0;
  const decay = Math.pow(0.5, 1 / halfLifeDays);
  let num = 0;
  let den = 0;
  for (let i = 0; i < daily.length; i++) {
    const w = Math.pow(decay, daily.length - 1 - i);
    num += w * (daily[i] ?? 0);
    den += w;
  }
  return num / den;
}

function examProgress(exam: { level: Cefr; scorePct: number }): number {
  // Passing a level's exam (60%) means that level is complete; scale linearly around it.
  const base = CEFR_LEVELS.indexOf(exam.level);
  return Math.max(0, base + Math.min(1.4, exam.scorePct / 60));
}

/** Inverse of `progressFromThresholds` for the hours table. */
export function hoursForProgress(progress: number): number {
  let prev = 0;
  for (let i = 0; i < CEFR_LEVELS.length; i++) {
    const t = CEFR_HOURS[CEFR_LEVELS[i]!];
    if (progress < i + 1) return prev + (progress - i) * (t - prev);
    prev = t;
  }
  return prev;
}

export function forecast(input: ForecastInput): Forecast {
  const now = input.now ?? new Date();
  const hours = progressFromThresholds(input.hoursLogged, CEFR_HOURS);
  const vocab = progressFromThresholds(input.knownLemmas, CEFR_VOCAB);
  const exam = input.mockExam ? examProgress(input.mockExam) : null;

  // Hours alone overestimate passive learners; vocabulary and exams keep it honest.
  const progress =
    exam === null ? 0.5 * hours + 0.5 * vocab : 0.3 * hours + 0.3 * vocab + 0.4 * exam;

  const targetProgress = CEFR_LEVELS.indexOf(input.target) + 1;
  const hoursRemaining = Math.max(0, CEFR_HOURS[input.target] - hoursForProgress(progress));
  const pace = ewmaPace(input.recentDailyHours);

  let eta: Date | null = null;
  if (progress >= targetProgress) eta = now;
  else if (pace > 0.01) eta = new Date(now.getTime() + (hoursRemaining / pace) * 86_400_000);

  let requiredPace: number | null = null;
  let onTrack: boolean | null = null;
  if (input.deadline) {
    const days = Math.max(1, (input.deadline.getTime() - now.getTime()) / 86_400_000);
    requiredPace = hoursRemaining / days;
    onTrack = eta !== null && eta.getTime() <= input.deadline.getTime();
  }

  return {
    progress,
    signals: { hours, vocab, exam },
    hoursRemaining,
    paceHoursPerDay: pace,
    eta,
    requiredPace,
    onTrack,
  };
}
