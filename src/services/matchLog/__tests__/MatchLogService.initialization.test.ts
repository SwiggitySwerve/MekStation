import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { listMatchLogs } from '@/services/matchLog/MatchLogService';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

describe('MatchLogService database initialization', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'match-log-service-'));
    resetSQLiteService();
    getSQLiteService({ path: join(tempDir, 'match-logs.db') });
  });

  afterEach(() => {
    try {
      getSQLiteService().close();
    } catch {
      // The test intentionally exercises uninitialized startup paths.
    }
    resetSQLiteService();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('initializes SQLite before listing match logs for server-rendered pages', () => {
    expect(getSQLiteService().isInitialized()).toBe(false);

    expect(listMatchLogs()).toEqual([]);

    expect(getSQLiteService().isInitialized()).toBe(true);
  });
});
