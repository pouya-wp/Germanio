import type { Metadata } from 'next';
import { Journal } from './journal';

export const metadata: Metadata = { title: 'Schreiben' };

export default function Page() {
  return <Journal />;
}
