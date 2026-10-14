import type { Metadata } from 'next';
import { Onboarding } from './onboarding';

export const metadata: Metadata = { title: 'Willkommen' };

export default function Page() {
  return <Onboarding />;
}
