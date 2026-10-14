import Database from 'better-sqlite3';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ConceptNode } from '@germanio/core';

/** A tiny dictionary.sqlite with the production schema, for fast deterministic tests. */
export function makeFixtureDictionary(): string {
  const path = join(mkdtempSync(join(tmpdir(), 'germanio-dict-')), 'dictionary.sqlite');
  const db = new Database(path);
  db.exec(`
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE lexemes (id INTEGER PRIMARY KEY, lemma TEXT NOT NULL, pos TEXT NOT NULL, gender TEXT, plural TEXT, ipa TEXT,
      freq_rank INTEGER, cefr TEXT, domains TEXT NOT NULL DEFAULT '[]', senses TEXT NOT NULL, extra TEXT NOT NULL DEFAULT '{}', paradigm TEXT, parts TEXT);
    CREATE TABLE forms (form_key TEXT NOT NULL, lexeme_id INTEGER NOT NULL, form TEXT NOT NULL, tags TEXT NOT NULL, PRIMARY KEY (form_key, lexeme_id)) WITHOUT ROWID;
    CREATE TABLE sentences (id INTEGER PRIMARY KEY, de TEXT NOT NULL, en TEXT, fa TEXT, audio_id INTEGER, audio_author TEXT, audio_license TEXT);
    CREATE TABLE sentence_lexemes (lexeme_id INTEGER NOT NULL, sentence_id INTEGER NOT NULL, PRIMARY KEY (lexeme_id, sentence_id)) WITHOUT ROWID;
    INSERT INTO meta VALUES ('built_at', 'fixture');
  `);
  const lex = db.prepare(
    'INSERT INTO lexemes (id, lemma, pos, gender, plural, freq_rank, cefr, senses, extra) VALUES (?,?,?,?,?,?,?,?,?)',
  );
  const form = db.prepare('INSERT INTO forms VALUES (?,?,?,?)');
  const rows: [number, string, string, string | null, string | null, number, string, string[], [string, string[]][]][] = [
    [1, 'sein', 'verb', null, null, 1, 'A1', ['to be'], [['bin', ['first-person']], ['war', ['past']]]],
    [2, 'sein', 'det', null, null, 1, 'A1', ['his'], []],
    [3, 'gehen', 'verb', null, null, 33, 'A1', ['to go'], [['ging', ['past']], ['gegangen', ['participle']]]],
    [4, 'Haus', 'noun', 'das', 'Häuser', 200, 'A1', ['house'], [['Häuser', ['plural']], ['Hause', ['dative']]]],
    [5, 'Bewerbung', 'noun', 'die', 'Bewerbungen', 6733, 'B1', ['job application'], [['Bewerbungen', ['plural']]]],
    [6, 'schön', 'adj', null, null, 180, 'A1', ['beautiful'], []],
    [7, 'schön', 'adv', null, null, 180, 'A1', ['well'], []],
  ];
  for (const [id, lemma, pos, gender, plural, rank, cefr, senses, forms] of rows) {
    lex.run(id, lemma, pos, gender, plural, rank, cefr, JSON.stringify(senses.map((s) => ({ en: [s], fa: null }))), '{}');
    form.run(lemma.toLowerCase(), id, lemma, '["lemma"]');
    for (const [f, tags] of forms) form.run(f.toLowerCase(), id, f, JSON.stringify(tags));
  }
  db.prepare('INSERT INTO sentences VALUES (?,?,?,?,?,?,?)').run(10, 'Das Haus ist schön.', 'The house is beautiful.', 'خانه زیباست.', 99, 'someone', 'CC BY');
  db.prepare('INSERT INTO sentence_lexemes VALUES (?,?)').run(4, 10);
  db.close();
  return path;
}

export const fixtureGrammar: ConceptNode[] = [
  { id: 'kasus.akkusativ', title: 'Akkusativ', level: 'A1', requires: [] },
  { id: 'kasus.dativ', title: 'Dativ', level: 'A2', requires: ['kasus.akkusativ'] },
  { id: 'praep.wechsel', title: 'Wechselpräpositionen', level: 'A2', requires: ['kasus.akkusativ', 'kasus.dativ'] },
];
