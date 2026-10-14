import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Geist_Mono, Vazirmatn } from 'next/font/google';
import { LearnerProvider } from '@/components/providers';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin', 'latin-ext'],
  axes: ['opsz', 'wdth'],
});

const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin', 'latin-ext'] });

/** Fallback only — Persian renders in the learner's installed Meem when available. */
const vazirmatn = Vazirmatn({ variable: '--font-vazirmatn', subsets: ['arabic'], display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Germanio — Die Grenzen meiner Sprache', template: '%s · Germanio' },
  description:
    'A local-first German learning system that lives where you work. Every word you learn moves the frontier of your world.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2efe8' },
    { media: '(prefers-color-scheme: dark)', color: '#0e0e10' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${bricolage.variable} ${geistMono.variable} ${vazirmatn.variable}`}>
      <body className="grain min-h-dvh">
        <LearnerProvider>{children}</LearnerProvider>
      </body>
    </html>
  );
}
