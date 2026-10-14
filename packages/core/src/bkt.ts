/**
 * Bayesian Knowledge Tracing for grammar concepts (the "Fehlerprofil").
 *
 * Each grammar node (e.g. "dativ.wechselpraepositionen") keeps P(known).
 * Every observed use — correct or an error tagged with that concept by the
 * corrector — updates the estimate. Parameters are per-concept so that easy
 * guessable items (articles: high pGuess) behave differently from rare ones.
 */
export interface BktParams {
  pInit: number;
  pTransit: number;
  pSlip: number;
  pGuess: number;
}

export const DEFAULT_BKT: BktParams = { pInit: 0.1, pTransit: 0.12, pSlip: 0.1, pGuess: 0.2 };

/** Threshold above which a concept counts as mastered. */
export const MASTERY = 0.95;

export function bktUpdate(pKnown: number, correct: boolean, p: BktParams = DEFAULT_BKT): number {
  const posterior = correct
    ? (pKnown * (1 - p.pSlip)) / (pKnown * (1 - p.pSlip) + (1 - pKnown) * p.pGuess)
    : (pKnown * p.pSlip) / (pKnown * p.pSlip + (1 - pKnown) * (1 - p.pGuess));
  return posterior + (1 - posterior) * p.pTransit;
}

/** Probability the learner answers the next item correctly. */
export function pCorrect(pKnown: number, p: BktParams = DEFAULT_BKT): number {
  return pKnown * (1 - p.pSlip) + (1 - pKnown) * p.pGuess;
}

export interface ConceptNode {
  id: string;
  title: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  requires: string[];
}

/**
 * Pick the concepts worth practising now: not yet mastered, all prerequisites
 * reasonably known (≥ 0.6), ordered by level, then foundations first
 * (fewer prerequisites), then weakness.
 */
export function frontier(
  nodes: ConceptNode[],
  known: Record<string, number>,
  limit = 3,
): ConceptNode[] {
  const p = (id: string) => known[id] ?? DEFAULT_BKT.pInit;
  const order = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4 };
  return nodes
    .filter((n) => p(n.id) < MASTERY && n.requires.every((r) => p(r) >= 0.6))
    .sort(
      (a, b) =>
        order[a.level] - order[b.level] ||
        a.requires.length - b.requires.length ||
        p(a.id) - p(b.id),
    )
    .slice(0, limit);
}
