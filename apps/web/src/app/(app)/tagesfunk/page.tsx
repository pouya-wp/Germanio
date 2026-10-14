import type { Metadata } from 'next';
import { Radio } from './radio';

export const metadata: Metadata = { title: 'Tagesfunk' };

export default function Page() {
  return <Radio />;
}
