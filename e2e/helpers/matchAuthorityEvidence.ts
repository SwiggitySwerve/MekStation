import { e2eRunId } from './gmTwoPlayerMatchFlow';

/**
 * Read-only snapshot of the match row the E2E-17 letter names.
 *
 * Copied from the resilience pack's `readAuthority` shape (same
 * better-sqlite3 connection, same `mp_matches` SELECT) rather than
 * imported across packs. Only the columns this row asserts are kept.
 *
 * WHY seats/ready live here: IMatchMeta has no readinessRevision
 * column. ServerMatchHostLobbyIntents persists lobby SetReady as
 * `seats[].ready` on meta_json via updateMatchMeta. Inventing a
 * revision field would always read null.
 */
export interface IMatchSeatEvidence {
  readonly slotId: string;
  readonly kind: string;
  readonly ready: boolean;
  readonly occupantPlayerId: string | null;
}

export interface IMatchAuthorityEvidence {
  readonly status: string | null;
  readonly roomCode: string | null;
  /** The code kept inside meta_json; the column above is only an index while the match is in lobby. */
  readonly metaRoomCode: string | null;
  readonly playerIds: readonly string[];
  readonly seats: readonly IMatchSeatEvidence[];
}

export interface IParsedMatchMeta {
  readonly roomCode: string | null;
  readonly playerIds: readonly string[];
  readonly seats: readonly IMatchSeatEvidence[];
}

export function parseMatchMetaJson(metaJson: string): IParsedMatchMeta {
  const parsed: unknown = JSON.parse(metaJson);
  if (typeof parsed !== 'object' || parsed === null) {
    return { roomCode: null, playerIds: [], seats: [] };
  }
  const meta = parsed as Record<string, unknown>;
  return {
    roomCode: typeof meta.roomCode === 'string' ? meta.roomCode : null,
    playerIds: parseStringArray(meta.playerIds),
    seats: parseSeats(meta.seats),
  };
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
    const meta = match ? parseMatchMetaJson(match.metaJson) : null;
    return {
      status: match?.status ?? null,
      roomCode: match?.roomCode ?? null,
      metaRoomCode: meta?.roomCode ?? null,
      playerIds: meta?.playerIds ?? [],
      seats: meta?.seats ?? [],
    };
  } finally {
    db.close();
  }
}

function parseStringArray(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function parseSeats(value: unknown): readonly IMatchSeatEvidence[] {
  if (!Array.isArray(value)) return [];
  const seats: IMatchSeatEvidence[] = [];
  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null) continue;
    const seat = raw as Record<string, unknown>;
    if (typeof seat.slotId !== 'string') continue;
    const occupant =
      typeof seat.occupant === 'object' && seat.occupant !== null
        ? (seat.occupant as Record<string, unknown>)
        : null;
    seats.push({
      slotId: seat.slotId,
      kind: typeof seat.kind === 'string' ? seat.kind : 'human',
      ready: seat.ready === true,
      occupantPlayerId:
        occupant && typeof occupant.playerId === 'string'
          ? occupant.playerId
          : null,
    });
  }
  return seats;
}
