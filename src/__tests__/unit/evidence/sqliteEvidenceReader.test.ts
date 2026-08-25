/**
 * Read-only SQLite evidence reader (umbrella task 20.3).
 *
 * Two properties keep an evidence artifact honest, and both are easy to
 * lose silently:
 *
 * - A reader that CREATES a missing database reports "0 rows" for a
 *   database that never existed. Every absence assertion against it then
 *   passes for the wrong reason — the classic false pass.
 * - A reader that can WRITE stops describing the run it claims to
 *   describe. The plan's evidence gate requires an identical database
 *   hash and schema before and after the probe.
 *
 * Exercised against real SQLite files rather than a mock, because both
 * properties are enforced by the driver and a mock would prove nothing
 * about it.
 */

import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  EvidenceReaderError,
  openSqliteEvidenceReader,
} from '../../../../e2e/fixtures/sqliteEvidenceReader';

let workdir: string;

function seedDatabase(name: string, rows = 2): string {
  const file = path.join(workdir, name);
  const db = new Database(file);
  db.exec(
    `CREATE TABLE receipts (id TEXT PRIMARY KEY, actor TEXT NOT NULL);
     CREATE TABLE outbox (id TEXT PRIMARY KEY);`,
  );
  const insert = db.prepare('INSERT INTO receipts (id, actor) VALUES (?, ?)');
  for (let index = 0; index < rows; index += 1) {
    insert.run(`receipt-${index}`, `p${index}`);
  }
  db.close();
  return file;
}

beforeEach(() => {
  workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-reader-'));
});

afterEach(() => {
  fs.rmSync(workdir, { recursive: true, force: true });
});

describe('sqlite evidence reader', () => {
  it('reads rows out of a database the run actually wrote', () => {
    const reader = openSqliteEvidenceReader(seedDatabase('run.db'));
    try {
      expect(reader.count('receipts')).toBe(2);
      expect(
        reader.select<{ actor: string }>(
          'SELECT actor FROM receipts ORDER BY id',
        ),
      ).toEqual([{ actor: 'p0' }, { actor: 'p1' }]);
      expect(reader.tables()).toEqual(['outbox', 'receipts']);
    } finally {
      reader.close();
    }
  });

  it('refuses a missing database instead of creating an empty one', () => {
    const missing = path.join(workdir, 'never-written.db');

    expect(() => openSqliteEvidenceReader(missing)).toThrow(
      EvidenceReaderError,
    );
    // The critical half: it did not bring the file into existence. A
    // reader that creates it would answer "0 receipts" for a run that
    // never happened, and the assertion would pass.
    expect(fs.existsSync(missing)).toBe(false);
  });

  it('leaves the database byte-identical after a full probe', () => {
    const file = seedDatabase('immutable.db');
    const before = fs.readFileSync(file);

    const reader = openSqliteEvidenceReader(file);
    try {
      reader.count('receipts');
      reader.select('SELECT * FROM receipts');
      reader.tables();
      expect(reader.fileHash()).toHaveLength(64);
    } finally {
      reader.close();
    }

    // The plan's evidence gate requires an identical hash and schema
    // before and after. Compared as bytes, not as row counts - a probe
    // that rewrote a page while leaving the rows alone would still make
    // the artifact describe a different file than the run produced.
    expect(fs.readFileSync(file).equals(before)).toBe(true);
  });

  it('refuses a write statement by name rather than by driver error', () => {
    const reader = openSqliteEvidenceReader(seedDatabase('guarded.db'));
    try {
      // The connection is readonly, so this would fail anyway - but with
      // "attempt to write a readonly database", which does not say WHAT
      // was attempted.
      expect(() =>
        reader.select("DELETE FROM receipts WHERE id = 'x'"),
      ).toThrow(/EVIDENCE_WRITE_REFUSED/);
      expect(reader.count('receipts')).toBe(2);
    } finally {
      reader.close();
    }
  });

  it('refuses a table name that could carry SQL', () => {
    const reader = openSqliteEvidenceReader(seedDatabase('inject.db'));
    try {
      // Table names cannot be bound as parameters, so the only safe
      // interpolation is one that cannot carry SQL at all.
      expect(() => reader.count('receipts; DROP TABLE receipts')).toThrow(
        /EVIDENCE_WRITE_REFUSED/,
      );
      expect(reader.tables()).toContain('receipts');
    } finally {
      reader.close();
    }
  });

  it('does not reach into the production persistence layer', () => {
    // The plan forbids proving durability through `DurableMatchStore`,
    // whose constructor creates and migrates. Asserted on the source so
    // the ban survives a refactor that "just reuses" the store.
    const source = fs.readFileSync(
      path.join(__dirname, '../../../../e2e/fixtures/sqliteEvidenceReader.ts'),
      'utf8',
    );
    // Scanned over IMPORT lines, not the whole file. The module's own
    // comment names DurableMatchStore to explain why it is not used, and
    // a whole-file ban fails on the explanation rather than on the
    // dependency - which is exactly what the first version of this row
    // did.
    const importLines = source
      .split('\n')
      .filter((line) => /^\s*(import\b|const .*=\s*require\()/.test(line))
      .join('\n');
    expect(importLines).not.toMatch(
      /DurableMatchStore|services\/persistence|IMatchStore/,
    );
    expect(source).toContain('fileMustExist: true');
    expect(source).toContain('readonly: true');
  });
});
