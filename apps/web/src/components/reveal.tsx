'use client';

import { motion, useReducedMotion, type Variants } from 'motion/react';
import type { ReactNode } from 'react';

const line: Variants = {
  hidden: { y: '110%' },
  shown: (i: number) => ({ y: '0%', transition: { duration: 1.1, delay: i * 0.09, ease: [0.16, 1, 0.3, 1] } }),
};

/**
 * Line-by-line typographic reveal: each line rises out of its own mask.
 * The *container* is observed — the lines themselves start clipped by their
 * masks, so observing them directly would never report them as visible.
 */
export function RevealLines({ lines, className = '', delay = 0 }: { lines: ReactNode[]; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className={`block ${className}`}
      initial={reduce ? false : 'hidden'}
      whileInView="shown"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ delayChildren: delay }}
    >
      {lines.map((l, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em]">
          <motion.span className="block" variants={line} custom={i}>
            {l}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

export function FadeUp({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
