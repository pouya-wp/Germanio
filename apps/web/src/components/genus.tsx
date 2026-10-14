import type { Gender } from '@germanio/core';

export const GENUS_TEXT: Record<Gender, string> = {
  der: 'text-der',
  die: 'text-die',
  das: 'text-das',
};

/** The article in its gender colour — the one place Germanio uses saturated colour. */
export function Article({ gender, className = '' }: { gender: Gender | null; className?: string }) {
  if (!gender) return null;
  return <span className={`${GENUS_TEXT[gender]} ${className}`}>{gender}</span>;
}

export function genusVar(gender: Gender | null): string {
  return gender ? `var(--genus-${gender})` : 'var(--ink)';
}
