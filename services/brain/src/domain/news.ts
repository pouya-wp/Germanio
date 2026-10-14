/** Today's headlines from public German RSS feeds — used only as topics, never copied into content. */
const FEEDS = ['https://www.tagesschau.de/xml/rss2/', 'https://www.deutschlandfunk.de/nachrichten-100.rss'];

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();

export function parseRss(xml: string): { title: string; description: string }[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => ({
    title: decode(m[1]!.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ''),
    description: decode(m[1]!.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? '').slice(0, 300),
  })).filter((h) => h.title);
}

export async function headlines(limit = 8): Promise<{ title: string; description: string }[]> {
  const results = await Promise.allSettled(
    FEEDS.map(async (url) => parseRss(await (await fetch(url, { signal: AbortSignal.timeout(10_000) })).text())),
  );
  const all = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  const seen = new Set<string>();
  return all.filter((h) => !seen.has(h.title) && seen.add(h.title)).slice(0, limit);
}
