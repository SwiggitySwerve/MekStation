/**
 * Backfill the match store's own file before recovery can read its metadata.
 * This database is separate from SQLiteService's numbered capability migrations.
 */
import type Database from 'better-sqlite3';

import { roomCodeForMatch } from '@/lib/multiplayer/server/matchRoomCodes';

interface IRoomCodeRow {
  match_id: string;
  status: string;
  room_code: string | null;
  meta_json: string;
}

export const MATCH_ROOM_CODES_MIGRATION = {
  name: 'match_lobby_room_code_ownership',
  /** Returns cleared-code count without importing the environment-reading logger. */
  up(db: Database.Database): number {
    return db.transaction(() => {
      const rows = db
        .prepare(`SELECT match_id, status, room_code, meta_json FROM mp_matches
        ORDER BY created_at, match_id`)
        .all() as IRoomCodeRow[];
      const occupied = new Set<string>();
      const update = db.prepare(
        'UPDATE mp_matches SET room_code = ?, meta_json = ? WHERE match_id = ?',
      );
      let cleared = 0;
      for (const row of rows) {
        const meta = JSON.parse(row.meta_json) as { roomCode?: string };
        const candidate = roomCodeForMatch(row.status, meta.roomCode);
        const code =
          candidate && !occupied.has(candidate) ? candidate : undefined;
        if (code) occupied.add(code);
        if (!code && (row.room_code !== null || meta.roomCode !== undefined))
          cleared++;
        if (row.room_code !== (code ?? null) || meta.roomCode !== code) {
          if (code) meta.roomCode = code;
          else delete meta.roomCode;
          update.run(code ?? null, JSON.stringify(meta), row.match_id);
        }
      }
      db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_mp_matches_active_room_code
        ON mp_matches(room_code) WHERE status = 'lobby' AND room_code IS NOT NULL`);
      return cleared;
    })();
  },
};
