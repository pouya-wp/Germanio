import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Reader } from './reader';

export const metadata: Metadata = { title: 'Lesesaal' };

// The text id is runtime data (useParams), so it streams in behind a Suspense boundary.
export default function Page() {
  return (
    <Suspense fallback={<p className="label px-12 pt-14">…</p>}>
      <Reader />
    </Suspense>
  );
}
