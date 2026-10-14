"""
Build data/dictionary.sqlite from open sources.

  kaikki.org German (Wiktionary, CC-BY-SA 4.0)  → lemmas, gender, plural, paradigms, IPA, English senses
  FrequencyWords de_50k (OpenSubtitles, CC-BY-SA 4.0) → spoken-language frequency
  Tatoeba (CC-BY 2.0 FR; audio per-contributor)   → example sentences with EN/FA translations + audio

Standard library only. Run:  python -I packages/data/build_dictionary.py
Inputs are expected in data/raw (see packages/data/README.md for download URLs).
"""

from __future__ import annotations

import bz2
import gzip
import json
import re
import sqlite3
import sys
import tarfile
import time
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "dictionary.sqlite"

KEEP_POS = {"noun", "verb", "adj", "adv", "prep", "conj", "pron", "det", "article", "num", "intj", "particle", "postp", "contraction"}
SKIP_FORM_TAGS = {"table-tags", "inflection-template", "class"}
DROP_SENSE_TAGS = {"archaic", "obsolete", "dated", "historical", "rare"}
# Spelling-variant senses ("obsolete spelling of dass") carry no meaning of their own.
JUNK_GLOSS = re.compile(r"^(?:obsolete|archaic|dated|alternative|nonstandard|misspelling|eye dialect|pre-\d{4})\b.*\b(?:spelling|form|of)\b", re.I)
CEFR_BY_RANK = [(650, "A1"), (1300, "A2"), (2400, "B1"), (4000, "B2"), (8000, "C1")]
FULL_PARADIGM_TOP = 12000  # keep full declension/conjugation tables for the most frequent lemmas
MAX_SENTENCES_PER_LEXEME = 10
MAX_SENTENCE_LEN = 110

WORD_RE = re.compile(r"[A-Za-zÄÖÜäöüßẞ]+(?:-[A-Za-zÄÖÜäöüßẞ]+)*")
# Glosses like "plural of Freund" on entries that lack structured form_of data.
GLOSS_FORM_OF = re.compile(r"\b(?:plural|singular|form|inflection|participle|preterite|comparative|superlative|diminutive) of ([A-ZÄÖÜa-zäöüß][\wäöüß-]*)\s*$")
FUNCTION_POS = {"pron", "det", "conj", "prep", "particle", "adv", "intj", "num"}


def bad_lemma(word: str) -> bool:
    """Abbreviations (SO, TU), gender-star/colon spellings and anything with digits or spaces."""
    return (len(word) > 1 and word.isupper()) or any(c in word for c in ":*_/ .0123456789")


def key(word: str) -> str:
    return word.lower().replace("ẞ", "ß")


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


# ── 1. Frequency ────────────────────────────────────────────────────────────

def load_frequency() -> dict[str, int]:
    counts: dict[str, int] = {}
    with open(RAW / "freq" / "de_50k.txt", encoding="utf8") as f:
        for line in f:
            parts = line.split()
            if len(parts) == 2 and WORD_RE.fullmatch(parts[0]):
                counts[key(parts[0])] = int(parts[1])
    log(f"frequency: {len(counts):,} surface forms")
    return counts


# ── 2. Wiktionary ───────────────────────────────────────────────────────────

def gender_of(entry: dict) -> str | None:
    for h in entry.get("head_templates", []):
        if (h.get("args") or {}).get("1", "").split(",")[0].strip() == "p":
            return None  # plurale tantum (die Eltern, die Leute)
        g = (h.get("args") or {}).get("1", "")
        first = g.split(",")[0].strip()[:1]
        if first in ("m", "f", "n") and h.get("name", "").startswith("de-"):
            return {"m": "der", "f": "die", "n": "das"}[first]
    tags = {t for s in entry.get("senses", []) for t in (s.get("tags") or [])}
    for tag, art in (("masculine", "der"), ("feminine", "die"), ("neuter", "das")):
        if tag in tags:
            return art
    return None


def ipa_of(entry: dict) -> str | None:
    ipas = [s for s in entry.get("sounds", []) if s.get("ipa")]
    for s in ipas:
        if s["ipa"].startswith("/") and not set(s.get("tags", [])) & DROP_SENSE_TAGS:
            return s["ipa"]
    return ipas[0]["ipa"] if ipas else None


def plural_only(entry: dict) -> bool:
    return any((h.get("args") or {}).get("1", "").split(",")[0].strip() == "p" for h in entry.get("head_templates", []))


def is_form_entry(entry: dict) -> bool:
    senses = entry.get("senses", [])
    return bool(senses) and all(s.get("form_of") for s in senses)


def parse_wiktionary(freq: dict[str, int]):
    lexemes: dict[tuple[str, str], dict] = {}
    form_of: list[tuple[str, str, list[str]]] = []  # (form, lemma, tags)
    path = RAW / "kaikki" / "german.jsonl.gz"
    with gzip.open(path, "rt", encoding="utf8") as f:
        for i, line in enumerate(f):
            if i % 100_000 == 0 and i:
                log(f"  wiktionary lines: {i:,}")
            e = json.loads(line)
            if e.get("lang_code") != "de" or e.get("pos") not in KEEP_POS:
                continue
            word = e["word"]
            if bad_lemma(word):
                continue
            if is_form_entry(e):
                for s in e["senses"]:
                    for fo in s.get("form_of") or []:
                        form_of.append((word, fo["word"], [t for t in s.get("tags", []) if t != "form-of"]))
                continue

            senses = []
            for s in e.get("senses", []):
                if s.get("form_of") or not s.get("glosses"):
                    continue
                m = GLOSS_FORM_OF.search(s["glosses"][-1])
                if m:
                    form_of.append((word, m.group(1), [t for t in s.get("tags", []) if t != "form-of"]))
                    continue
                tags = set(s.get("tags") or [])
                if JUNK_GLOSS.search(s["glosses"][-1]):
                    continue
                senses.append({"gloss": s["glosses"][-1], "drop": bool(tags & DROP_SENSE_TAGS)})
            if not senses:
                continue

            pos = "det" if e["pos"] == "article" else e["pos"]
            k = (word, pos)
            lex = lexemes.get(k)
            if lex is None:
                lex = lexemes[k] = {
                    "lemma": word, "pos": pos, "gender": None, "plural": None, "ipa": None,
                    "senses": [], "forms": [], "extra": {},
                }
            lex["gender"] = lex["gender"] or (gender_of(e) if pos == "noun" else None)
            if pos == "noun" and plural_only(e):
                lex["extra"]["pluraleTantum"] = True
            lex["ipa"] = lex["ipa"] or ipa_of(e)
            lex["senses"].extend(senses)

            for fm in e.get("forms", []):
                form, tags = fm.get("form", ""), fm.get("tags") or []
                if not form or form in ("-", "no-table-tags", "de-ndecl", "de-adecl", "de-conj") or set(tags) & SKIP_FORM_TAGS:
                    continue
                if "auxiliary" in tags:
                    lex["extra"].setdefault("aux", [])
                    if form not in lex["extra"]["aux"]:
                        lex["extra"]["aux"].append(form)
                    continue
                if fm.get("source") is None:  # head-line forms: the essentials
                    if tags == ["plural"] and not lex["plural"]:
                        lex["plural"] = form
                    elif tags == ["genitive"]:
                        lex["extra"].setdefault("genitive", form)
                    elif tags == ["past"]:
                        lex["extra"].setdefault("praeteritum", form)
                    elif tags == ["participle", "past"]:
                        lex["extra"].setdefault("partizip2", form)
                    elif tags == ["comparative"]:
                        lex["extra"].setdefault("komparativ", form)
                    elif tags == ["superlative"]:
                        lex["extra"].setdefault("superlativ", form)
                lex["forms"].append((form, tags, fm.get("source") is None))
    # "das Ich", "das Du", "das Es": nominalised function words would steal their frequency.
    function_lemmas = {lemma.lower() for (lemma, pos) in lexemes if pos in FUNCTION_POS}
    for k in [k for k in lexemes if k[1] == "noun" and k[0][:1].isupper() and k[0].lower() in function_lemmas]:
        del lexemes[k]
    # Standalone plural entries ("Freunde" = friends) shadow the real lemma; fold them into it.
    plural_of = {lex["plural"]: lemma for (lemma, pos), lex in lexemes.items() if pos == "noun" and lex["plural"]}
    for k in [k for k in lexemes if k[1] == "noun" and k[0] in plural_of and plural_of[k[0]] != k[0]]:
        lex = lexemes[k]
        if lex["gender"] is None and not lex["extra"].get("pluraleTantum"):
            form_of.append((k[0], plural_of[k[0]], ["plural"]))
            del lexemes[k]
    log(f"wiktionary: {len(lexemes):,} lexemes, {len(form_of):,} form-of links")
    return lexemes, form_of


# ── 3. Select + rank ────────────────────────────────────────────────────────

def rank_lexemes(lexemes: dict, form_of: list, freq: dict[str, int]) -> list[dict]:
    # Surface form → candidate lemmas (so frequency of "ging" credits "gehen").
    surface_to_lemmas: dict[str, set[str]] = defaultdict(set)
    for (lemma, _pos), lex in lexemes.items():
        surface_to_lemmas[key(lemma)].add(lemma)
        for form, _tags, _head in lex["forms"]:
            if " " not in form:
                surface_to_lemmas[key(form)].add(lemma)
    for form, lemma, _tags in form_of:
        surface_to_lemmas[key(form)].add(lemma)

    # Ambiguous surfaces ("würde" = werden or die Würde; "hat" = haben or haten) are
    # split with a few rounds of EM: each surface's count is shared in proportion to
    # how frequent each candidate lemma is overall, so "haben" absorbs "hat" while
    # rare homographs keep only a sliver. Exact lemma spellings get a mild prior.
    surfaces = [(s, c, sorted(surface_to_lemmas[s])) for s, c in freq.items() if s in surface_to_lemmas]
    lemma_count: dict[str, float] = defaultdict(lambda: 1.0)
    for _round in range(5):
        nxt: dict[str, float] = defaultdict(float)
        for surface, count, cands in surfaces:
            weights = [lemma_count[c] * (2.0 if key(c) == surface else 1.0) for c in cands]
            total = sum(weights)
            for c, w in zip(cands, weights):
                nxt[c] += count * w / total
        lemma_count = defaultdict(float, nxt)

    kept = [lex for (lemma, _), lex in lexemes.items() if lemma_count.get(lemma, 0) > 0]
    kept.sort(key=lambda x: -lemma_count[x["lemma"]])
    rank_of: dict[str, int] = {}
    for lex in kept:
        rank_of.setdefault(lex["lemma"], len(rank_of) + 1)
    for lex in kept:
        r = rank_of[lex["lemma"]]
        lex["freq_rank"] = r
        lex["cefr"] = next((lvl for limit, lvl in CEFR_BY_RANK if r <= limit), "C2")
    log(f"ranked: {len(kept):,} lexemes appear in spoken frequency data")
    return kept


# ── 4. Tatoeba ──────────────────────────────────────────────────────────────

def read_sentences(name: str, max_len: int | None = None) -> dict[int, str]:
    out: dict[int, str] = {}
    with bz2.open(RAW / "tatoeba" / name, "rt", encoding="utf8") as f:
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if len(parts) == 3 and (max_len is None or len(parts[2]) <= max_len):
                out[int(parts[0])] = parts[2]
    return out


def read_links(name: str) -> dict[int, int]:
    out: dict[int, int] = {}
    with bz2.open(RAW / "tatoeba" / name, "rt", encoding="utf8") as f:
        for line in f:
            a, b = line.split()
            out.setdefault(int(a), int(b))
    return out


def read_audio() -> dict[int, tuple[int, str, str]]:
    out: dict[int, tuple[int, str, str]] = {}
    with tarfile.open(RAW / "tatoeba" / "sentences_with_audio.tar.bz2") as t:
        member = next(m for m in t.getmembers() if m.name.endswith(".csv"))
        for raw in t.extractfile(member):  # type: ignore[union-attr]
            parts = raw.decode("utf8").rstrip("\n").split("\t")
            if len(parts) >= 3:
                lic = parts[3] if len(parts) > 3 else ""
                out.setdefault(int(parts[1]), (int(parts[0]), parts[2], lic))
    return out


# ── 5. Write ────────────────────────────────────────────────────────────────

SCHEMA = """
PRAGMA journal_mode = OFF;
PRAGMA synchronous = OFF;
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE lexemes (
  id INTEGER PRIMARY KEY,
  lemma TEXT NOT NULL,
  pos TEXT NOT NULL,
  gender TEXT,
  plural TEXT,
  ipa TEXT,
  freq_rank INTEGER,
  cefr TEXT,
  domains TEXT NOT NULL DEFAULT '[]',
  senses TEXT NOT NULL,
  extra TEXT NOT NULL DEFAULT '{}',
  paradigm TEXT,
  parts TEXT
);
CREATE INDEX lexemes_lemma ON lexemes(lemma);
CREATE INDEX lexemes_rank ON lexemes(freq_rank);
CREATE TABLE forms (
  form_key TEXT NOT NULL,
  lexeme_id INTEGER NOT NULL,
  form TEXT NOT NULL,
  tags TEXT NOT NULL,
  PRIMARY KEY (form_key, lexeme_id)
) WITHOUT ROWID;
CREATE TABLE sentences (
  id INTEGER PRIMARY KEY,
  de TEXT NOT NULL,
  en TEXT,
  fa TEXT,
  audio_id INTEGER,
  audio_author TEXT,
  audio_license TEXT
);
CREATE TABLE sentence_lexemes (
  lexeme_id INTEGER NOT NULL,
  sentence_id INTEGER NOT NULL,
  PRIMARY KEY (lexeme_id, sentence_id)
) WITHOUT ROWID;
"""


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    freq = load_frequency()
    lexemes, form_of = parse_wiktionary(freq)
    kept = rank_lexemes(lexemes, form_of, freq)

    if OUT.exists():
        OUT.unlink()
    db = sqlite3.connect(OUT)
    db.executescript(SCHEMA)

    ids_by_lemma: dict[str, list[int]] = defaultdict(list)
    form_rows: dict[tuple[str, int], tuple[str, str]] = {}
    for i, lex in enumerate(kept, start=1):
        senses = [s["gloss"] for s in lex["senses"] if not s["drop"]] or [s["gloss"] for s in lex["senses"]]
        seen: set[str] = set()
        senses = [s for s in senses if not (s in seen or seen.add(s))][:6]
        paradigm = None
        if lex["freq_rank"] <= FULL_PARADIGM_TOP and lex["pos"] in ("verb", "noun", "adj"):
            paradigm = json.dumps([[f, t] for f, t, _ in lex["forms"]], ensure_ascii=False)
        db.execute(
            "INSERT INTO lexemes (id, lemma, pos, gender, plural, ipa, freq_rank, cefr, senses, extra, paradigm) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (
                i, lex["lemma"], lex["pos"], lex["gender"], lex["plural"], lex["ipa"], lex["freq_rank"], lex["cefr"],
                json.dumps([{"en": [s], "fa": None} for s in senses], ensure_ascii=False),
                json.dumps(lex["extra"], ensure_ascii=False), paradigm,
            ),
        )
        ids_by_lemma[lex["lemma"]].append(i)
        form_rows[(key(lex["lemma"]), i)] = (lex["lemma"], json.dumps(["lemma"]))
        for form, tags, _ in lex["forms"]:
            if " " in form:
                continue
            form_rows.setdefault((key(form), i), (form, json.dumps(tags)))

    for form, lemma, tags in form_of:
        for lid in ids_by_lemma.get(lemma, []):
            form_rows.setdefault((key(form), lid), (form, json.dumps(tags)))

    db.executemany(
        "INSERT INTO forms (form_key, lexeme_id, form, tags) VALUES (?,?,?,?)",
        ((k, lid, f, t) for (k, lid), (f, t) in form_rows.items()),
    )
    log(f"wrote {len(kept):,} lexemes, {len(form_rows):,} forms")

    # Sentences: prefer translated, audio-backed, short sentences; cap per lexeme.
    de = read_sentences("deu_sentences.tsv.bz2", MAX_SENTENCE_LEN)
    en_text = read_sentences("eng_sentences.tsv.bz2")
    fa_text = read_sentences("pes_sentences.tsv.bz2")
    en_link = read_links("deu-eng_links.tsv.bz2")
    fa_link = read_links("deu-pes_links.tsv.bz2")
    audio = read_audio()
    log(f"tatoeba: {len(de):,} German sentences ≤{MAX_SENTENCE_LEN} chars, {len(audio):,} with audio (all langs)")

    form_to_ids: dict[str, list[int]] = defaultdict(list)
    for (k, lid) in form_rows:
        form_to_ids[k].append(lid)

    def score(sid: int) -> tuple:
        return (sid not in en_link, sid not in audio, sid not in fa_link, len(de[sid]))

    per_lexeme: dict[int, int] = defaultdict(int)
    chosen = 0
    for sid in sorted(de, key=score):
        text = de[sid]
        lids = {lid for tok in WORD_RE.findall(text) for lid in form_to_ids.get(key(tok), [])}
        useful = [lid for lid in lids if per_lexeme[lid] < MAX_SENTENCES_PER_LEXEME]
        if not useful:
            continue
        a = audio.get(sid)
        db.execute(
            "INSERT INTO sentences (id, de, en, fa, audio_id, audio_author, audio_license) VALUES (?,?,?,?,?,?,?)",
            (sid, text, en_text.get(en_link.get(sid, -1)), fa_text.get(fa_link.get(sid, -1)),
             a[0] if a else None, a[1] if a else None, a[2] if a else None),
        )
        for lid in useful:
            per_lexeme[lid] += 1
            db.execute("INSERT INTO sentence_lexemes VALUES (?,?)", (lid, sid))
        chosen += 1
    log(f"sentences: kept {chosen:,}; {len(per_lexeme):,} lexemes have examples")

    db.executemany("INSERT INTO meta VALUES (?,?)", [
        ("built_at", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())),
        ("sources", json.dumps({
            "wiktionary": "kaikki.org German extract — CC-BY-SA 4.0",
            "frequency": "hermitdave/FrequencyWords (OpenSubtitles 2018) — CC-BY-SA 4.0",
            "tatoeba": "tatoeba.org — CC-BY 2.0 FR (audio: per contributor license)",
        })),
    ])
    db.commit()
    db.execute("VACUUM")
    db.close()
    log(f"done → {OUT} ({OUT.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
