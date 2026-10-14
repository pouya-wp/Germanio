/**
 * Tagesplan — builds today's session from the learner model.
 *
 * Principles: reviews first (retrieval before new input), then comprehensible
 * input, then output, then targeted grammar. Blocks are interleaved and each
 * carries the research principle it relies on, so the UI can show *why*.
 */
export type Skill = 'lesen' | 'hoeren' | 'schreiben' | 'sprechen';
export type BlockKind = 'review' | 'new-words' | Skill | 'grammatik';

export type Principle =
  | 'spaced-retrieval'
  | 'comprehensible-input'
  | 'output-hypothesis'
  | 'noticing'
  | 'interleaving';

export interface PlanInput {
  minutes: number;
  dueCards: number;
  newCardsAvailable: number;
  /** 0..1 strength estimate per skill. */
  skills: Record<Skill, number>;
  weakConcepts: { id: string; title: string }[];
  newCardsPerDay?: number;
}

export interface PlanBlock {
  kind: BlockKind;
  minutes: number;
  count?: number;
  conceptId?: string;
  principle: Principle;
}

const SECONDS_PER_REVIEW = 9;
const SECONDS_PER_NEW = 30;
const SKILL_PRINCIPLE: Record<Skill, Principle> = {
  lesen: 'comprehensible-input',
  hoeren: 'comprehensible-input',
  schreiben: 'output-hypothesis',
  sprechen: 'output-hypothesis',
};

export function buildPlan(input: PlanInput): PlanBlock[] {
  const total = Math.max(10, Math.round(input.minutes));

  // 1) Reviews: never more than 40% of the day — a backlog is cleared over days, not in one sitting.
  const reviewCap = Math.floor(total * 0.4);
  const reviewMin = Math.min(Math.ceil((input.dueCards * SECONDS_PER_REVIEW) / 60), reviewCap);
  const reviewCount = Math.min(input.dueCards, Math.floor((reviewMin * 60) / SECONDS_PER_REVIEW));

  // 2) New words: skipped when the review load is heavy — protects tomorrow's workload.
  const backlogHeavy = input.dueCards * SECONDS_PER_REVIEW > reviewCap * 60;
  const newTarget = backlogHeavy
    ? 0
    : Math.min(input.newCardsAvailable, input.newCardsPerDay ?? 15);
  const newMin = Math.min(Math.ceil((newTarget * SECONDS_PER_NEW) / 60), Math.floor(total * 0.2));
  const newCount = Math.min(newTarget, Math.floor((newMin * 60) / SECONDS_PER_NEW));

  // 3) Grammar: one targeted block on the weakest frontier concept.
  const concept = input.weakConcepts[0];
  const grammarMin = concept ? Math.max(5, Math.round(total * 0.12)) : 0;

  // 4) Skills: remaining time weighted towards the weakest skill.
  let rest = total - reviewMin - newMin - grammarMin;
  const skills = (Object.keys(input.skills) as Skill[]).map((s) => ({
    s,
    need: 1.15 - input.skills[s],
  }));
  const needSum = skills.reduce((a, b) => a + b.need, 0);
  const skillBlocks = skills
    .map(({ s, need }) => ({ s, min: Math.round((rest * need) / needSum) }))
    .filter((b) => b.min >= 4)
    .sort((a, b) => b.min - a.min);
  rest -= skillBlocks.reduce((a, b) => a + b.min, 0);
  if (skillBlocks[0]) skillBlocks[0].min += rest; // rounding remainder goes to the weakest skill

  // Interleave: warm-up reviews → input → new words → output → grammar → closing reviews.
  const blocks: PlanBlock[] = [];
  const firstReview = Math.ceil(reviewCount / 2);
  if (firstReview > 0) {
    blocks.push({
      kind: 'review',
      minutes: Math.ceil(reviewMin / 2),
      count: firstReview,
      principle: 'spaced-retrieval',
    });
  }
  for (const b of skillBlocks.filter((b) => b.s === 'lesen' || b.s === 'hoeren')) {
    blocks.push({ kind: b.s, minutes: b.min, principle: SKILL_PRINCIPLE[b.s] });
  }
  if (newCount > 0) {
    blocks.push({ kind: 'new-words', minutes: newMin, count: newCount, principle: 'spaced-retrieval' });
  }
  for (const b of skillBlocks.filter((b) => b.s === 'schreiben' || b.s === 'sprechen')) {
    blocks.push({ kind: b.s, minutes: b.min, principle: SKILL_PRINCIPLE[b.s] });
  }
  if (concept) {
    blocks.push({ kind: 'grammatik', minutes: grammarMin, conceptId: concept.id, principle: 'noticing' });
  }
  const secondReview = reviewCount - firstReview;
  if (secondReview > 0) {
    blocks.push({
      kind: 'review',
      minutes: Math.floor(reviewMin / 2),
      count: secondReview,
      principle: 'interleaving',
    });
  }
  return blocks;
}
