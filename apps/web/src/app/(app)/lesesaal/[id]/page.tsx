import type { Metadata } from 'next';
import { Reader } from './reader';

export const metadata: Metadata = { title: 'Lesesaal' };

export default function Page() {
  return <Reader />;
}
