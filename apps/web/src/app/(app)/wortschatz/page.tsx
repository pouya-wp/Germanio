import type { Metadata } from 'next';
import { Review } from './review';

export const metadata: Metadata = { title: 'Wortschatz' };

export default function Page() {
  return <Review />;
}
