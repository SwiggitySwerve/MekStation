/**
 * The S7 marker migration (S1b answer 4): designed, stubbed, NOT activated.
 *
 * S7 will ship a no-op migration as the new highest version so every S1b+ build
 * whose catalog lacks it refuses the file (startup check, row N). Until S7, the
 * stub must stay out of the catalog, and the whole chain must hold: applying
 * the stub by hand makes a catalog-without-it refuse the file.
 *
 * @spec openspec/changes/add-contract-lifecycle-s1b/specs/mission-contracts/spec.md
 */
import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  DatabaseNewerThanAppError,
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  buildLifecycleRulesMarkerMigration,
  LIFECYCLE_RULES_MARKER_NAME,
} from '@/services/persistence/SQLiteService.lifecycleMarker';
import { MIGRATIONS } from '@/services/persistence/SQLiteService.migrations';

const HEAD = Math.max(...MIGRATIONS.map((migration) => migration.version));

describe('S7 lifecycle-rules marker migration (inactive stub)', () => {
  it('is not in the catalog, so nothing writes it before S7', () => {
    expect(
      MIGRATIONS.some(
        (migration) => migration.name === LIFECYCLE_RULES_MARKER_NAME,
      ),
    ).toBe(false);
  });

  it('builds as the next highest version with a no-op body', () => {
    const marker = buildLifecycleRulesMarkerMigration(HEAD);
    expect(marker.version).toBe(HEAD + 1);
    expect(marker.name).toBe(LIFECYCLE_RULES_MARKER_NAME);
    expect(typeof marker.up).toBe('string');
  });

  describe('once applied (as S7 will), a catalog without it refuses the file', () => {
    let dir: string;
    let dbPath: string;

    beforeEach(async () => {
      dir = await mkdtemp(path.join(tmpdir(), 'sqlite-marker-'));
      dbPath = path.join(dir, 'marker.db');
      resetSQLiteService();
    });
    afterEach(async () => {
      resetSQLiteService();
      await rm(dir, { recursive: true, force: true, maxRetries: 3 });
    });

    it('applies cleanly as the runner would (schema change and record together)', () => {
      getSQLiteService({ path: dbPath }).initialize();
      resetSQLiteService();
      const marker = buildLifecycleRulesMarkerMigration(HEAD);
      const db = new Database(dbPath);
      try {
        db.transaction(() => {
          db.exec(marker.up as string);
          db.prepare(
            'INSERT INTO migrations (version, name, applied_at) VALUES (?, ?, ?)',
          ).run(marker.version, marker.name, '2026-11-10T00:00:00.000Z');
        })();
      } finally {
        db.close();
      }
      expect(() => getSQLiteService({ path: dbPath }).initialize()).toThrow(
        DatabaseNewerThanAppError,
      );
    });
  });
});
