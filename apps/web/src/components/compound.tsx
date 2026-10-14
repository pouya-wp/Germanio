'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';

/**
 * The signature motion: a German compound splits into the words it is built
 * from — "Ausbildungs|vertrag" — each part labelled with its meaning.
 * German compounds are lego; seeing the bricks makes long words stop being scary.
 */
export function Compound({
  parts,
  glosses,
  className = '',
  open: controlled,
}: {
  parts: string[];
  glosses?: string[];
  className?: string;
  open?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const reduce = useReducedMotion();
  const open = controlled ?? hover;

  return (
    <span
      className={`relative inline-flex items-baseline ${className}`}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      aria-label={parts.map((p, i) => (i ? p.toLowerCase() : p)).join('')}
    >
      {parts.map((part, i) => (
        <motion.span
          key={part + i}
          className="relative inline-block"
          animate={{ x: open ? (i - (parts.length - 1) / 2) * 28 : 0 }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 26 }}
        >
          {i > 0 && (
            <motion.span
              aria-hidden
              className="absolute top-[12%] bottom-[8%] -left-[15px] w-px bg-current"
              initial={false}
              animate={{ scaleY: open ? 1 : 0, opacity: open ? 0.5 : 0 }}
              style={{ originY: 1 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
          {i === 0 ? part : part.toLowerCase()}
          {glosses?.[i] && (
            <motion.span
              aria-hidden
              className="label absolute left-0 top-full mt-2 whitespace-nowrap normal-case"
              style={{ fontSize: '0.75rem', letterSpacing: '0.04em' }}
              initial={false}
              animate={{ opacity: open ? 1 : 0, y: open ? 0 : -6 }}
              transition={{ duration: 0.35, delay: open ? 0.12 + i * 0.06 : 0 }}
            >
              {glosses[i]}
            </motion.span>
          )}
        </motion.span>
      ))}
    </span>
  );
}
