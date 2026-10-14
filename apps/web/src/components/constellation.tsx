'use client';

import { useEffect, useRef } from 'react';
import sky from '@/lib/sky-words.json';
import { useLearner } from './providers';

interface Star {
  w: string;
  g: 'der' | 'die' | 'das' | null;
  x: number;
  y: number;
  z: number;
}

/** Fibonacci sphere: evenly spread points, so the sky has no poles or clumps. */
function sphere(n: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = golden * i;
    out.push([Math.cos(t) * r, y, Math.sin(t) * r]);
  }
  return out;
}

/**
 * Sprachgrenze — the learner's vocabulary as a slowly turning sky. Known words
 * shine in ink (their gender as a coloured point); unknown words are faint dust.
 * Every word learned literally lights up the learner's world.
 *
 * Canvas 2D for now (cheap, crisp text); the R3F/shader version comes in phase 6.
 */
export function Constellation({ className = '', interactive = true }: { className?: string; interactive?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { known } = useLearner();
  const knownRef = useRef(known);
  knownRef.current = known;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const words = sky as { w: string; g: Star['g'] }[];
    const stars: Star[] = sphere(words.length).map(([x, y, z], i) => ({ ...words[i]!, x, y, z }));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const css = getComputedStyle(document.documentElement);
    const color = (v: string) => css.getPropertyValue(v).trim();
    let palette = { ink: color('--ink'), muted: color('--muted'), der: color('--genus-der'), die: color('--genus-die'), das: color('--genus-das') };
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => {
      const c = getComputedStyle(document.documentElement);
      palette = { ink: c.getPropertyValue('--ink').trim(), muted: c.getPropertyValue('--muted').trim(), der: c.getPropertyValue('--genus-der').trim(), die: c.getPropertyValue('--genus-die').trim(), das: c.getPropertyValue('--genus-das').trim() };
    };
    scheme.addEventListener('change', onScheme);

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    if (interactive) window.addEventListener('pointermove', onMove, { passive: true });

    let raf = 0;
    let angle = 0.6;
    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      if (!reduced) angle += dt * 0.000045;
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const R = Math.min(w, h) * 0.46;
      const cx = w / 2;
      const cy = h / 2;
      const ay = angle + pointer.x * 0.25;
      const ax = -0.25 + pointer.y * 0.15;
      const [sy, cyR, sx, cxR] = [Math.sin(ay), Math.cos(ay), Math.sin(ax), Math.cos(ax)];
      const knownSet = knownRef.current;

      const projected = stars
        .map((s) => {
          const x1 = s.x * cyR + s.z * sy;
          const z1 = -s.x * sy + s.z * cyR;
          const y2 = s.y * cxR - z1 * sx;
          const z2 = s.y * sx + z1 * cxR;
          const p = 2.6 / (2.6 + z2);
          return { s, px: cx + x1 * R * p, py: cy + y2 * R * p, depth: (1 - z2) / 2, p };
        })
        .sort((a, b) => a.depth - b.depth);

      // The horizon: a hairline great circle — the current frontier of the learner's world.
      ctx.strokeStyle = palette.muted;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, R * 1.04, R * 1.04 * Math.abs(Math.cos(ax + 1.2)) * 0.32 + 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const { s, px, py, depth, p } of projected) {
        const isKnown = knownSet.has(s.w);
        const front = depth;
        const alpha = isKnown ? 0.3 + front * 0.7 : 0.12 + front * 0.5;
        const r = (isKnown ? 2.4 : 1.3) * p;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = isKnown && s.g ? palette[s.g] : isKnown ? palette.ink : palette.muted;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        if (front > 0.55) {
          const size = Math.round((isKnown ? 13 : 11) * p);
          ctx.font = `${isKnown ? 600 : 400} ${size}px ${css.getPropertyValue('--font-bricolage') || 'sans-serif'}`;
          ctx.globalAlpha = isKnown ? Math.min(1, (front - 0.5) * 2.4) : Math.min(0.55, (front - 0.55) * 1.6);
          ctx.fillStyle = isKnown ? palette.ink : palette.muted;
          ctx.fillText(s.w, px, py - 10 * p);
        }
      }
      ctx.globalAlpha = 1;
      if (!reduced) raf = requestAnimationFrame(draw);
    };
    // Paint the first frame synchronously: the sky must exist even before (or without) rAF.
    draw(performance.now());

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      scheme.removeEventListener('change', onScheme);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [interactive]);

  return <canvas ref={canvasRef} className={`block h-full w-full ${className}`} aria-hidden />;
}
