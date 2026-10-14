import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card as FsrsCard,
  type Grade,
  type ReviewLog as FsrsReviewLog,
} from 'ts-fsrs';

export { Rating, State };
export type { Grade };

/** Serializable card memory state (dates as ISO strings) so it can cross HTTP/SQLite. */
export interface MemoryState {
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: State;
  lastReview: string | null;
}

export interface ReviewOutcome {
  memory: MemoryState;
  log: {
    rating: Grade;
    stateBefore: State;
    reviewedAt: string;
    scheduledDays: number;
    stability: number;
    difficulty: number;
  };
}

/** Retention target: 90% is the FSRS sweet spot between workload and forgetting. */
const scheduler = fsrs(
  generatorParameters({ request_retention: 0.9, enable_fuzz: true, maximum_interval: 365 }),
);

/**
 * A lemma counts as "known" once its memory is stable for three weeks. This
 * threshold drives the adaptive German UI and the Sprachgrenze constellation.
 */
export const KNOWN_STABILITY_DAYS = 21;

function toMemory(card: FsrsCard): MemoryState {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review ? card.last_review.toISOString() : null,
  };
}

function fromMemory(m: MemoryState): FsrsCard {
  return {
    due: new Date(m.due),
    stability: m.stability,
    difficulty: m.difficulty,
    elapsed_days: m.elapsedDays,
    scheduled_days: m.scheduledDays,
    learning_steps: m.learningSteps,
    reps: m.reps,
    lapses: m.lapses,
    state: m.state,
    ...(m.lastReview ? { last_review: new Date(m.lastReview) } : {}),
  };
}

export function newMemory(now: Date = new Date()): MemoryState {
  return toMemory(createEmptyCard(now));
}

export function review(memory: MemoryState, rating: Grade, now: Date = new Date()): ReviewOutcome {
  const { card, log } = scheduler.next(fromMemory(memory), now, rating);
  return { memory: toMemory(card), log: toLog(log, memory.state) };
}

/** Preview the next due date for every grade — shown under the rating buttons. */
export function preview(memory: MemoryState, now: Date = new Date()): Record<Grade, string> {
  const p = scheduler.repeat(fromMemory(memory), now);
  return {
    [Rating.Again]: p[Rating.Again].card.due.toISOString(),
    [Rating.Hard]: p[Rating.Hard].card.due.toISOString(),
    [Rating.Good]: p[Rating.Good].card.due.toISOString(),
    [Rating.Easy]: p[Rating.Easy].card.due.toISOString(),
  } as Record<Grade, string>;
}

export function retrievability(memory: MemoryState, now: Date = new Date()): number {
  if (memory.state === State.New) return 0;
  return scheduler.get_retrievability(fromMemory(memory), now, false);
}

export function isKnown(memory: MemoryState): boolean {
  return memory.state === State.Review && memory.stability >= KNOWN_STABILITY_DAYS;
}

export function isDue(memory: MemoryState, now: Date = new Date()): boolean {
  return new Date(memory.due).getTime() <= now.getTime();
}

function toLog(log: FsrsReviewLog, stateBefore: State): ReviewOutcome['log'] {
  return {
    rating: log.rating as Grade,
    stateBefore,
    reviewedAt: log.review.toISOString(),
    scheduledDays: log.scheduled_days,
    stability: log.stability,
    difficulty: log.difficulty,
  };
}
