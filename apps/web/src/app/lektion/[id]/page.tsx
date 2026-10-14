import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Lesson } from './lesson';

export const metadata: Metadata = { title: 'Lektion' };

// The lesson id is runtime data (useParams), so it streams in behind a Suspense boundary.
export default function Page() {
  return (
    <Suspense fallback={<p className="label px-10 pt-24">…</p>}>
      <Lesson />
    </Suspense>
  );
}
