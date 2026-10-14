import type { Metadata } from 'next';
import { Library } from './library';

export const metadata: Metadata = { title: 'Lesesaal' };

export default function Page() {
  return <Library />;
}
