/**
 * The baseline table refuses to be rewritten (leaf task 1.3).
 *
 * The pure import is unit-tested next door. This proves the property
 * that only the database can enforce: a second write for the same match
 * FAILS rather than replacing the row. Immutability that lives only in
 * a code path is a convention; this is a constraint.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  insertMatchAuthorityBaseline,
  readMatchAuthorityBaseline,
} from '@/services/campaignPersistence/MatchAuthorityBaselineStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

const BASELINE = {
  streamType: 'match' as const,
  streamId: 'match-immutable',
  branchId: 'main',
  revision: 4,
  digest: 'digest-abc',
  effectiveGeneration: 1,
  source: 'retained-log' as const,
  firstRetainedRevision: 0,
  importedAt: '2026-08-25T00:00:00.000Z',
};

describe('match_authority_baseline migration', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mek-baseline-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'test.db') }).initialize();
  });

  afterEach(() => {
    resetSQLiteService();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('round-trips the D4 tuple', () => {
    insertMatchAuthorityBaseline(BASELINE);

    expect(readMatchAuthorityBaseline('match-immutable')).toEqual(BASELINE);
  });

  it('refuses a second baseline for the same match', () => {
    insertMatchAuthorityBaseline(BASELINE);

    expect(() =>
      insertMatchAuthorityBaseline({ ...BASELINE, revision: 99 }),
    ).toThrow();
    expect(readMatchAuthorityBaseline('match-immutable')?.revision).toBe(4);
  });

  it('rejects a source the schema does not know', () => {
    // The label is what tells a later reader whether a prefix is
    // missing. A free-text column would let a typo read as "complete".
    expect(() =>
      insertMatchAuthorityBaseline({
        ...BASELINE,
        streamId: 'match-bad-source',
        source: 'guessed' as unknown as 'retained-log',
      }),
    ).toThrow();
  });

  it('has no baseline for a match that was never imported', () => {
    expect(readMatchAuthorityBaseline('match-never')).toBeNull();
  });
});
