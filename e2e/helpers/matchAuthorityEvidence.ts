import { e2eRunId } from './gmTwoPlayerMatchFlow';

/**
 * Read-only snapshot of the match row the E2E-17 letter names.
 *
 * Copied from the resilience pack's `readAuthority` shape (same
 * better-sqlite3 connection, same `mp_matches` SELECT) rather than
 * imported across packs. Only the columns this row asserts are kept.
 */
export interface IMatchAuthorityEvidence {
  readonly status: string | null;
  readonly roomCode: string | null;
  /** The code kept inside meta_json; the column above is only an index while the match is in lobby. */
  readonly metaRoomCode: string | null;
  readonly playerIds: readonly string[];
}

export function readMatchAuthorityEvidence(
  matchId: string,
): IMatchAuthorityEvidence {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3') as typeof import('better-sqlite3');
  // The e2e server's store lives in the per-run runtime dir (see
  // playwright.config.ts MULTIPLAYER_DB_PATH) - never the repo default.
  const db = new Database(
    `.sisyphus/e2e-runtime/${e2eRunId()}/multiplayer-matches.db`,
    { readonly: true, fileMustExist: true },
  );
  try {
    const match = db
      .prepare(
        'SELECT status, room_code AS roomCode, meta_json AS metaJson FROM mp_matches WHERE match_id = ?',
      )
      .get(matchId) as
      | { status: string; roomCode: string | null; metaJson: string }
      | undefined;
    const meta = match ? parsePlayerIds(match.metaJson) : [];
    return {
      status: match?.status ?? null,
      roomCode: match?.roomCode ?? null,
      metaRoomCode: match
        ? ((JSON.parse(match.metaJson) as { roomCode?: string | null })
            .roomCode ?? null)
        : null,
      playerIds: meta,
    };
  } finally {
    db.close();
  }
}

function parsePlayerIds(metaJson: string): readonly string[] {
  const parsed = JSON.parse(metaJson) as { playerIds?: unknown };
  return Array.isArray(parsed.playerIds)
    ? parsed.playerIds.filter(
        (value): value is string => typeof value === 'string',
      )
    : [];
}
