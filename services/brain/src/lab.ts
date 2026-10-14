/** Client for the local speech lab (services/lab, 127.0.0.1:4318). */
export interface LabClient {
  available(): Promise<boolean>;
  tts(text: string, voice?: Voice, rate?: number): Promise<ArrayBuffer>;
  podcast(id: string, segments: { voice: Voice; text: string }[]): Promise<{ file: string; duration: number; timings: { index: number; start: number; end: number }[] }>;
}

export type Voice = 'thorsten' | 'kerstin';

export function createLabClient(baseUrl = process.env.GERMANIO_LAB ?? 'http://127.0.0.1:4318'): LabClient {
  const post = async (path: string, body: unknown, timeoutMs: number) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`lab ${path} failed: ${res.status} ${await res.text().catch(() => '')}`);
    return res;
  };
  return {
    async available() {
      try {
        return (await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(1500) })).ok;
      } catch {
        return false;
      }
    },
    async tts(text, voice = 'thorsten', rate = 0.95) {
      return (await post('/tts', { text, voice, rate }, 60_000)).arrayBuffer();
    },
    async podcast(id, segments) {
      // CPU synthesis runs ~3 s per segment; a full episode takes a few minutes.
      return (await post('/podcast', { id, segments }, 15 * 60_000)).json() as ReturnType<LabClient['podcast']>;
    },
  };
}
