# @germanio/data

`build_dictionary.py` builds `data/dictionary.sqlite` from open data. It uses only the Python standard library.

## Download the inputs into `data/raw/`

| File | URL |
|---|---|
| `kaikki/german.jsonl.gz` | https://kaikki.org/dictionary/German/kaikki.org-dictionary-German.jsonl.gz |
| `freq/de_50k.txt` | https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/de/de_50k.txt |
| `tatoeba/deu_sentences.tsv.bz2` | https://downloads.tatoeba.org/exports/per_language/deu/deu_sentences.tsv.bz2 |
| `tatoeba/eng_sentences.tsv.bz2` | https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2 |
| `tatoeba/pes_sentences.tsv.bz2` | https://downloads.tatoeba.org/exports/per_language/pes/pes_sentences.tsv.bz2 |
| `tatoeba/deu-eng_links.tsv.bz2` | https://downloads.tatoeba.org/exports/per_language/deu/deu-eng_links.tsv.bz2 |
| `tatoeba/deu-pes_links.tsv.bz2` | https://downloads.tatoeba.org/exports/per_language/deu/deu-pes_links.tsv.bz2 |
| `tatoeba/sentences_with_audio.tar.bz2` | https://downloads.tatoeba.org/exports/sentences_with_audio.tar.bz2 |

Then run `python -I packages/data/build_dictionary.py`. It takes about 2–4 minutes.

## How it works

- **Frequency → lemma.** Spoken frequency counts surface forms ("ging", "würde"). Ambiguous forms are shared between their candidate lemmas with a few rounds of EM, so "würde" credits *werden* and not *die Würde*.
- **Cleaning.** The ETL drops abbreviations, gender-star spellings, nominalised function words ("das Ich"), spelling-variant senses, and standalone plural entries.
- **Sentences.** For each lemma it keeps up to 10 short examples, preferring sentences that have an English translation and native-speaker audio.
- **Stable keys.** Lexeme ids change on every rebuild. The learner database therefore refers to words by `(lemma, pos)`.
