import { describe, expect, it } from 'vitest';
import {
  answersMatch,
  bktUpdate,
  buildPlan,
  CorrectionSchema,
  DEFAULT_BKT,
  ewmaPace,
  expandUmlautShortcuts,
  forecast,
  frontier,
  hoursForProgress,
  isDue,
  isKnown,
  levelFromProgress,
  newMemory,
  progressFromThresholds,
  Rating,
  review,
  splitCompound,
  State,
  tokenize,
  CEFR_HOURS,
} from './index';

describe('text', () => {
  it('tokenizes umlauts, ß and hyphenated compounds', () => {
    expect(tokenize('Die E-Mail für Straße, bitte!').map((t) => t.text)).toEqual([
      'Die',
      'E-Mail',
      'für',
      'Straße',
      'bitte',
    ]);
  });

  it('expands explicit umlaut shortcuts without touching real "ue"', () => {
    expect(expandUmlautShortcuts('Gru:s:e, neue Tu:r')).toBe('Grüße, neue Tür');
  });

  it('accepts transliterated answers', () => {
    expect(answersMatch('Strasse', 'Straße')).toBe(true);
    expect(answersMatch(' muede. ', 'müde')).toBe(true);
    expect(answersMatch('Hund', 'Katze')).toBe(false);
  });

  it('splits compounds only when parts reassemble the word', () => {
    expect(splitCompound('Ausbildungsvertrag', ['Ausbildungs', 'vertrag'])).toEqual([
      'Ausbildungs',
      'vertrag',
    ]);
    expect(splitCompound('Haus', ['Hau', 'x'])).toEqual(['Haus']);
  });
});

describe('srs', () => {
  it('schedules a new card and moves it into learning', () => {
    const now = new Date('2026-10-14T10:00:00Z');
    const m0 = newMemory(now);
    expect(isDue(m0, now)).toBe(true);
    const { memory, log } = review(m0, Rating.Good, now);
    expect(memory.state).not.toBe(State.New);
    expect(new Date(memory.due).getTime()).toBeGreaterThan(now.getTime());
    expect(log.rating).toBe(Rating.Good);
  });

  it('a card reviewed well for weeks becomes known', () => {
    let t = new Date('2026-10-14T10:00:00Z');
    let m = newMemory(t);
    for (let i = 0; i < 8; i++) {
      m = review(m, Rating.Good, t).memory;
      t = new Date(m.due);
    }
    expect(isKnown(m)).toBe(true);
  });
});

describe('bkt', () => {
  it('raises P(known) on correct answers and lowers it on errors', () => {
    const up = bktUpdate(0.3, true);
    const down = bktUpdate(0.3, false);
    expect(up).toBeGreaterThan(0.3);
    expect(down).toBeLessThan(up);
    expect(down).toBeGreaterThanOrEqual(DEFAULT_BKT.pTransit * 0.7);
  });

  it('frontier respects prerequisites and skips mastered concepts', () => {
    const nodes = [
      { id: 'akk', title: 'Akkusativ', level: 'A1' as const, requires: [] },
      { id: 'dat', title: 'Dativ', level: 'A2' as const, requires: ['akk'] },
      { id: 'wechsel', title: 'Wechselpräp.', level: 'A2' as const, requires: ['akk', 'dat'] },
    ];
    expect(frontier(nodes, {}).map((n) => n.id)).toEqual(['akk']);
    expect(frontier(nodes, { akk: 0.97, dat: 0.7 }).map((n) => n.id)).toEqual(['dat', 'wechsel']);
  });
});

describe('cefr & forecast', () => {
  it('maps progress to levels', () => {
    expect(levelFromProgress(0.5).level).toBe('Pre-A1');
    expect(levelFromProgress(2.4)).toEqual({ level: 'A2', fraction: expect.closeTo(0.4) });
  });

  it('hoursForProgress inverts the hours table', () => {
    for (const h of [0, 60, 250, 500, 650]) {
      expect(hoursForProgress(progressFromThresholds(h, CEFR_HOURS))).toBeCloseTo(h, 5);
    }
  });

  it('weights recent days more in pace', () => {
    expect(ewmaPace([0, 0, 0, 4])).toBeGreaterThan(ewmaPace([4, 0, 0, 0]));
  });

  it('forecasts B2 honestly from an A1 start at 3.5h/day', () => {
    const now = new Date('2026-10-14T00:00:00Z');
    const f = forecast({
      hoursLogged: 60,
      recentDailyHours: Array(14).fill(3.5),
      knownLemmas: 400,
      target: 'B2',
      deadline: new Date('2027-04-14T00:00:00Z'),
      now,
    });
    expect(f.eta).not.toBeNull();
    const days = (f.eta!.getTime() - now.getTime()) / 86_400_000;
    expect(days).toBeGreaterThan(150);
    expect(days).toBeLessThan(200);
    expect(f.requiredPace).toBeGreaterThan(3);
  });
});

describe('planner', () => {
  const skills = { lesen: 0.5, hoeren: 0.2, schreiben: 0.4, sprechen: 0.1 };

  it('fills the requested time and favours the weakest skill', () => {
    const plan = buildPlan({
      minutes: 60,
      dueCards: 80,
      newCardsAvailable: 100,
      skills,
      weakConcepts: [{ id: 'dat', title: 'Dativ' }],
    });
    const total = plan.reduce((a, b) => a + b.minutes, 0);
    expect(total).toBeGreaterThanOrEqual(58);
    expect(total).toBeLessThanOrEqual(61);
    const sprechen = plan.find((b) => b.kind === 'sprechen')!;
    const lesen = plan.find((b) => b.kind === 'lesen')!;
    expect(sprechen.minutes).toBeGreaterThan(lesen.minutes);
    expect(plan[0]!.kind).toBe('review');
  });

  it('pauses new words when the review backlog is heavy', () => {
    const plan = buildPlan({ minutes: 30, dueCards: 600, newCardsAvailable: 100, skills, weakConcepts: [] });
    expect(plan.some((b) => b.kind === 'new-words')).toBe(false);
  });
});

describe('schemas', () => {
  it('validates a correction payload', () => {
    const ok = CorrectionSchema.safeParse({
      corrected: 'Ich gehe in die Schule.',
      errors: [
        {
          original: 'in der Schule',
          correction: 'in die Schule',
          conceptId: 'kasus.wechselpraepositionen',
          explanationDe: 'Richtung → Akkusativ',
          explanationFa: 'جهت حرکت ← حالت مفعولی',
          severity: 'major',
        },
      ],
      correctConcepts: ['verb.position.v2'],
      cefrEstimate: 'A2',
      praiseDe: 'Gute Wortstellung!',
    });
    expect(ok.success).toBe(true);
  });
});
