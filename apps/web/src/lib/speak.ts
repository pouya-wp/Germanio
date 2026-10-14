import { brain } from './brain';

export type Voice = 'thorsten' | 'kerstin';

/** Female characters speak with Kerstin, everyone else with Thorsten. */
const FEMALE = new Set(['Lena', 'Frau Weber', 'Kellnerin', 'Anna', 'Mia', 'Sara']);
export const voiceFor = (speaker: string): Voice => (FEMALE.has(speaker) ? 'kerstin' : 'thorsten');

let current: HTMLAudioElement | null = null;

/**
 * Say German text with Piper (local neural TTS via brain → lab).
 * Falls back to the browser's own German voice when lab isn't running.
 */
export function say(text: string, voice: Voice = 'thorsten'): Promise<void> {
  current?.pause();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) speechSynthesis.cancel();
  return new Promise((resolve) => {
    const a = new Audio(brain.ttsUrl(text, voice));
    current = a;
    a.onended = () => resolve();
    a.play().catch(() => {
      if (!('speechSynthesis' in window)) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'de-DE';
      u.rate = 0.9;
      u.onend = () => resolve();
      speechSynthesis.speak(u);
    });
  });
}
