import { desc, eq } from 'drizzle-orm';
import { episodeScript, EpisodeScriptSchema, type EpisodeScript } from '../ai/tasks';
import type { LLMProvider } from '../ai/provider';
import type { LearnerDb } from '../db/learner';
import { episodes } from '../db/schema';
import type { LabClient, Voice } from '../lab';
import { NotFound, type Learner } from './learner';
import { headlines as fetchHeadlines } from './news';
import { learnerDay } from './time';

const VOICE: Record<EpisodeScript['segments'][number]['speaker'], Voice> = { Lena: 'kerstin', Jonas: 'thorsten' };

/**
 * Tagesfunk — every morning a personal radio show: today's news at the
 * learner's level, with their due words woven in, voiced by two hosts.
 * Script and audio are produced by Nachtschicht; the learner just presses play.
 */
export class Tagesfunk {
  constructor(
    private readonly db: LearnerDb,
    private readonly learner: Learner,
    private readonly ai: LLMProvider,
    private readonly lab: LabClient,
    private readonly news: typeof fetchHeadlines = fetchHeadlines,
  ) {}

  list(limit = 30) {
    return this.db
      .select({ id: episodes.id, title: episodes.title, duration: episodes.duration, level: episodes.level, createdAt: episodes.createdAt, listenedAt: episodes.listenedAt, audioFile: episodes.audioFile })
      .from(episodes)
      .orderBy(desc(episodes.id))
      .limit(limit)
      .all();
  }

  get(id: string) {
    const row = this.db.select().from(episodes).where(eq(episodes.id, id)).get();
    if (!row) throw new NotFound(`episode ${id}`);
    return { ...row, script: EpisodeScriptSchema.parse(row.script) };
  }

  hasToday(now = new Date()): boolean {
    return Boolean(this.db.select({ id: episodes.id }).from(episodes).where(eq(episodes.id, learnerDay(now))).get());
  }

  /** Write the script (AI) and render audio (lab). Audio is optional: without lab the script still reads well. */
  async produce(now = new Date()): Promise<string> {
    const id = learnerDay(now);
    const level = this.learner.level();
    const existing = this.db.select().from(episodes).where(eq(episodes.id, id)).get();
    let script: EpisodeScript;
    if (existing) {
      script = EpisodeScriptSchema.parse(existing.script);
    } else {
      const headlines = await this.news();
      script = await episodeScript(this.ai, { level, headlines, targets: this.learner.learningLemmas(5), day: id });
      this.db.insert(episodes).values({ id, title: script.title, script, level }).run();
    }
    if (!existing?.audioFile && (await this.lab.available())) {
      const audio = await this.lab.podcast(
        `tagesfunk-${id}`,
        script.segments.map((s) => ({ voice: VOICE[s.speaker], text: s.text })),
      );
      this.db.update(episodes).set({ audioFile: audio.file, duration: audio.duration, timings: audio.timings }).where(eq(episodes.id, id)).run();
    }
    return id;
  }

  /** Listening counts as passive input (the learner is usually working at the same time). */
  listened(id: string, seconds: number): void {
    this.db.update(episodes).set({ listenedAt: new Date().toISOString() }).where(eq(episodes.id, id)).run();
    if (seconds > 0) this.learner.logTime({ source: 'podcast', activity: 'listening', seconds: Math.min(seconds, 3600), active: false });
  }
}
