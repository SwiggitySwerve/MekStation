import Database from 'better-sqlite3';

import { MATCH_ROOM_CODES_MIGRATION } from '../SQLiteService.matchRoomCodes.migration';

it('backfills deterministically, preserves rows, enforces uniqueness, and reapplies unchanged', () => {
  const db = new Database(':memory:');
  try {
    db.exec(`CREATE TABLE mp_matches (
      match_id TEXT PRIMARY KEY, status TEXT NOT NULL, room_code TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, meta_json TEXT NOT NULL
    )`);
    const insert = db.prepare(
      'INSERT INTO mp_matches VALUES (?, ?, ?, ?, ?, ?)',
    );
    for (const [id, status, code, date] of [
      ['later', 'lobby', 'ABC234', '2026-11-02'],
      ['tie-b', 'lobby', 'abc-234', '2026-11-01'],
      ['tie-a', 'lobby', 'ABC234', '2026-11-01'],
      ['running', 'active', null, '2026-11-01'],
      ['closed', 'completed', 'DEF567', '2026-11-01'],
      ['unique', 'lobby', 'ghi-789', '2026-11-01'],
    ] as const) {
      insert.run(
        id,
        status,
        code,
        date,
        date,
        JSON.stringify({
          matchId: id,
          status,
          roomCode: code ?? 'STALE2',
          seats: [{ slotId: 'keep' }],
          marker: id,
        }),
      );
    }
    const before = db
      .prepare('SELECT * FROM mp_matches ORDER BY match_id')
      .all() as Array<{ match_id: string; meta_json: string }>;
    expect(MATCH_ROOM_CODES_MIGRATION.up(db)).toBe(4);
    const rows = db
      .prepare('SELECT * FROM mp_matches ORDER BY match_id')
      .all() as Array<{
      match_id: string;
      room_code: string | null;
      meta_json: string;
    }>;
    for (const row of rows) {
      const old = before.find((entry) => entry.match_id === row.match_id)!;
      const code =
        row.match_id === 'tie-a'
          ? 'ABC234'
          : row.match_id === 'unique'
            ? 'GHI789'
            : undefined;
      expect(row).toEqual({
        ...old,
        room_code: code ?? null,
        meta_json: row.meta_json,
      });
      expect(JSON.parse(row.meta_json)).toEqual({
        ...JSON.parse(old.meta_json),
        roomCode: code,
      });
    }
    expect(() =>
      insert.run('collision', 'lobby', 'ABC234', 'now', 'now', '{}'),
    ).toThrow(/UNIQUE constraint failed/);
    expect(() =>
      insert.run('non-lobby', 'active', 'ABC234', 'now', 'now', '{}'),
    ).not.toThrow();
    db.prepare("DELETE FROM mp_matches WHERE match_id = 'non-lobby'").run();
    expect(MATCH_ROOM_CODES_MIGRATION.up(db)).toBe(0);
    expect(
      db.prepare('SELECT * FROM mp_matches ORDER BY match_id').all(),
    ).toEqual(rows);
  } finally {
    db.close();
  }
});
