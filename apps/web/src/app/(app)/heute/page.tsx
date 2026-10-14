import type { Metadata } from 'next';
import { Heute } from './heute';

export const metadata: Metadata = { title: 'Heute' };

export default function Page() {
  return <Heute />;
}
