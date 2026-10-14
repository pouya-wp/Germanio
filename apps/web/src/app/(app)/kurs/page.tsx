import type { Metadata } from 'next';
import { Path } from './path';

export const metadata: Metadata = { title: 'Der Weg' };

export default function Page() {
  return <Path />;
}
