# Germanio — Die Grenzen meiner Sprache

> „Die Grenzen meiner Sprache bedeuten die Grenzen meiner Welt." — Wittgenstein, *Tractatus* 5.6

Germanio is a personal, local-first system for learning German from A1 to B2 while working at a computer. It runs where you already are (browser, desktop, editor, terminal) and needs no paper. Your vocabulary is drawn as a sky, and every word you learn lights up part of it.

## Status

Phase 1 (MVP) is in progress. See the [20-week roadmap](docs/roadmap.md).

| Area | State |
|---|---|
| Dictionary: 22k lemmas, 118k example sentences, audio | ✅ |
| Brain service: FSRS reviews, daily plan, B2 forecast, time tracking, Fehlerprofil (BKT), AI via Codex | ✅ |
| Web: landing page, Heute dashboard, review session, ⌘K lookup, adaptive German UI | ✅ |
| Firefox extension: lookup + mining | 🚧 |
| Reader, writing, speech, exam simulator, Neues Leben, desktop companion, VS Code, CLI | planned |

## Architecture

```
apps/web            Next.js 16 · React 19 · Tailwind v4 · Motion
apps/extension      WXT · Firefox
services/brain      Node · Hono · SQLite (Drizzle) on 127.0.0.1:4317
packages/core       learner model: FSRS, BKT, forecast, planner, schemas
packages/client     typed SDK shared by every client
packages/i18n-adaptive   UI strings that turn German as you learn them
packages/data       ETL that builds data/dictionary.sqlite
content/            grammar concept graph, personas, scenarios
```

The AI layer sits behind one `LLMProvider` interface. The default implementation is `CodexProvider`, which runs the Codex CLI with your own ChatGPT subscription (personal use only). Results are cached by content hash, heavy generation is batched in the background ("Nachtschicht"), and when the subscription hits its usage limit, brain waits until the time the limit resets.

## Run it

```bash
pnpm install
npm i -g @openai/codex && codex login     # once, with your ChatGPT account
python -I packages/data/build_dictionary.py   # once; needs data/raw (see packages/data/README.md)
pnpm --filter @germanio/brain dev
pnpm --filter @germanio/web dev            # http://localhost:3000
```

## Principles

1. **Colour means gender.** der = Kobalt, die = Zinnober, das = Moos. These are the only saturated colours in the system.
2. **Honest, not addictive.** No guilt streaks. Hours are tracked, the forecast is honest, and the plan adapts.
3. **Local and private.** Personal data lives in `data/learner.sqlite` and never leaves your machine.

## Data & licences

- Wiktionary via kaikki.org (CC BY-SA 4.0)
- Tatoeba sentences and audio (CC BY 2.0 FR; audio licensed per contributor)
- FrequencyWords / OpenSubtitles 2018 (CC BY-SA 4.0)

Persian text renders in **Meem** when it is installed locally. Meem is a licensed fontha.com font and is never bundled; everyone else sees Vazirmatn.
