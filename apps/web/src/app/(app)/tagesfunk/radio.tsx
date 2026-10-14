'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Episode, EpisodeSummary } from '@germanio/client';
import { brain } from '@/lib/brain';
import { AiError } from '@/components/ai-error';
import { RevealLines } from '@/components/reveal';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * Tagesfunk player. The transcript follows the audio line by line (timings come
 * from the lab render), a click on any line seeks there, and listening time is
 * reported as passive input.
 */
export function Radio() {
  const [list, setList] = useState<EpisodeSummary[]>([]);
  const [ep, setEp] = useState<Episode | null>(null);
  const [current, setCurrent] = useState(-1);
  const [time, setTime] = useState(0);
  const [showFa, setShowFa] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const listened = useRef(0);
  const lineRefs = useRef<(HTMLLIElement | null)[]>([]);

  const load = useCallback(async (id?: string) => {
    const r = await brain.episodes();
    setList(r.episodes);
    const target = id ?? r.episodes[0]?.id;
    if (target) setEp(await brain.episode(target));
  }, []);

  useEffect(() => {
    load().catch(setError);
  }, [load]);

  // Report listening time when leaving or switching episodes.
  useEffect(() => {
    const id = ep?.id;
    return () => {
      if (id && listened.current > 5) void brain.listened(id, listened.current).catch(() => {});
      listened.current = 0;
    };
  }, [ep?.id]);

  const onTime = () => {
    const a = audio.current;
    if (!a || !ep?.timings) return;
    if (!a.paused) listened.current += Math.max(0, a.currentTime - time);
    setTime(a.currentTime);
    const idx = ep.timings.findIndex((t) => a.currentTime >= t.start && a.currentTime < t.end + 0.4);
    if (idx !== -1 && idx !== current) {
      setCurrent(idx);
      lineRefs.current[idx]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  };

  const seek = (i: number) => {
    const t = ep?.timings?.[i];
    if (!t || !audio.current) return;
    audio.current.currentTime = t.start;
    void audio.current.play();
  };

  const produce = async () => {
    setBusy(true);
    setError(null);
    try {
      const { id } = await brain.produceEpisode();
      await load(id);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-4 pt-8 pb-32 sm:px-12 sm:pt-14">
      <p className="label">Dein persönliches Radio · jeden Morgen neu</p>
      <h1 className="mt-3 font-display text-[clamp(3rem,8vw,7.5rem)] leading-[0.88] font-semibold tracking-[-0.045em]">
        <RevealLines lines={['Tagesfunk']} />
      </h1>

      {!ep && (
        <div className="mt-14 max-w-2xl space-y-4">
          <p className="text-xl">Noch keine Sendung. Nachtschicht produziert sie automatisch — oder jetzt sofort:</p>
          <p lang="fa" className="text-ink-2">هنوز برنامه‌ای ساخته نشده. هر صبح خودکار ساخته می‌شود؛ یا همین حالا بساز (چند دقیقه طول می‌کشد).</p>
          <button onClick={() => void produce()} disabled={busy} className="border border-ink bg-ink px-5 py-3 font-medium text-paper hover:bg-transparent hover:text-ink disabled:opacity-40">
            {busy ? 'Lena und Jonas nehmen auf …' : 'Sendung produzieren'}
          </button>
          <AiError error={error} />
        </div>
      )}

      {ep && (
        <div className="mt-12 grid gap-12 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section>
            <div className="border-y border-ink py-5">
              <p className="label">{ep.id} · {ep.level}{ep.duration ? ` · ${fmt(ep.duration)}` : ''}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">{ep.script.title}</h2>
              {ep.audioFile ? (
                <audio
                  ref={audio}
                  src={brain.audioUrl(`/tagesfunk/${ep.id}/audio`)}
                  controls
                  preload="metadata"
                  onTimeUpdate={onTime}
                  className="mt-5 w-full"
                />
              ) : (
                <p className="label mt-4">Audio wird noch gerendert (lab offline?) — Text ist schon da.</p>
              )}
            </div>

            <ol className="mt-8 space-y-1">
              {ep.script.segments.map((s, i) => (
                <li
                  key={i}
                  ref={(el) => {
                    lineRefs.current[i] = el;
                  }}
                  onClick={() => seek(i)}
                  className={`grid cursor-pointer grid-cols-[64px_1fr] gap-4 py-2 transition-opacity ${current === -1 || current === i ? 'opacity-100' : 'opacity-40 hover:opacity-80'}`}
                >
                  <span className="label pt-1.5">{s.speaker}</span>
                  <span className={`text-[clamp(1.15rem,1.7vw,1.45rem)] leading-snug ${current === i ? 'font-medium' : ''}`}>{s.text}</span>
                </li>
              ))}
            </ol>
          </section>

          <aside className="space-y-10 xl:sticky xl:top-8 xl:self-start">
            <section>
              <button onClick={() => setShowFa((v) => !v)} className="label hover:text-ink">
                {showFa ? '− ' : '+ '}Zusammenfassung auf Persisch
              </button>
              {showFa && <p lang="fa" className="mt-3 text-lg leading-relaxed">{ep.script.summaryFa}</p>}
            </section>
            <section>
              <h3 className="label border-b border-ink pb-2">Wörter</h3>
              <dl>
                {ep.script.vocabulary.map((v) => (
                  <div key={v.de} className="flex items-baseline justify-between gap-4 border-b border-line py-2">
                    <dt className="font-medium">{v.de}</dt>
                    <dd lang="fa">{v.fa}</dd>
                  </div>
                ))}
              </dl>
            </section>
            {list.length > 1 && (
              <section>
                <h3 className="label border-b border-ink pb-2">Archiv</h3>
                <ul>
                  {list.map((e) => (
                    <li key={e.id}>
                      <button onClick={() => void load(e.id)} className={`flex w-full justify-between border-b border-line py-2 text-left ${e.id === ep.id ? 'font-semibold' : 'text-ink-2'}`}>
                        <span className="truncate">{e.title}</span>
                        <span className="label">{e.id.slice(5)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
