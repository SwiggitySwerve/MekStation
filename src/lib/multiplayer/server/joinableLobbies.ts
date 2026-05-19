/**
 * Joinable-lobby + spectatable-match queries over the match store.
 *
 * `add-matchmaking-and-spectator` (M3), design D2 / D7. The match
 * browser is a *query* over the durable store plus a list UI — no
 * separate index structure. A joinable lobby is a match in
 * `status: 'lobby'` with at least one open `kind: 'human'` seat; a
 * spectatable match is any match in `status: 'active'`.
 *
 * Each query returns a compact projection (`IJoinableLobby` /
 * `ISpectatableMatch`) carrying only what a joiner / spectator needs —
 * no leaked internal detail. The projection shape is exactly what the
 * match browser renders and what the REST endpoint serializes.
 *
 * @spec openspec/changes/add-matchmaking-and-spectator/specs/multiplayer-matchmaking/spec.md
 */

import type { TeamLayout } from '@/types/multiplayer/Lobby';

import { isPlayingSeat } from '@/types/multiplayer/Lobby';

import type { IMatchMeta, IMatchStore } from './IMatchStore';

// =============================================================================
// Projections
// =============================================================================

/**
 * Seat-occupancy summary for a browser row. `humanSeats` is the layout
 * player-seat budget for human seats; `occupiedHumanSeats` is how many
 * of those currently hold a player. `openHumanSeats` is the difference
 * — a joinable lobby always has `openHumanSeats >= 1`. `aiSeats` and
 * `spectatorSeats` are surfaced so a browser row can show the full
 * composition without leaking occupant identities.
 */
export interface ISeatOccupancySummary {
  readonly humanSeats: number;
  readonly occupiedHumanSeats: number;
  readonly openHumanSeats: number;
  readonly aiSeats: number;
  readonly spectatorSeats: number;
}

/**
 * Compact projection of a joinable lobby — the exact shape the match
 * browser renders and the REST endpoint returns. Deliberately omits
 * `playerIds`, `sideAssignments`, occupant identities, and the raw
 * config blob: a joiner needs the room code to join and the summary to
 * decide, nothing more.
 */
export interface IJoinableLobby {
  readonly matchId: string;
  readonly roomCode: string;
  readonly layout: TeamLayout;
  readonly hostDisplayName: string;
  readonly occupancy: ISeatOccupancySummary;
  readonly fogOfWar: boolean;
  readonly createdAt: string;
}

/**
 * Compact projection of a spectatable (`active`) match — the shape the
 * match browser's spectate tab renders. A spectatable match has no room
 * code (the code expires at launch), so a spectator joins by `matchId`.
 */
export interface ISpectatableMatch {
  readonly matchId: string;
  readonly layout: TeamLayout;
  readonly hostDisplayName: string;
  readonly occupancy: ISeatOccupancySummary;
  readonly fogOfWar: boolean;
  readonly createdAt: string;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Resolve the host's display name from a match meta. The host's
 * `IPlayerRef` lives on whichever seat the host occupies; fall back to
 * the raw host id when no seat carries a display name (e.g. a Wave 1
 * roster-only match with no seat grid).
 */
function hostDisplayName(meta: IMatchMeta): string {
  const seats = meta.seats ?? [];
  const hostSeat = seats.find(
    (s) => s.occupant?.playerId === meta.hostPlayerId,
  );
  return hostSeat?.occupant?.displayName ?? meta.hostPlayerId;
}

/** Build the seat-occupancy summary for a match's seat array. */
function summarizeOccupancy(meta: IMatchMeta): ISeatOccupancySummary {
  const seats = meta.seats ?? [];
  let humanSeats = 0;
  let occupiedHumanSeats = 0;
  let aiSeats = 0;
  let spectatorSeats = 0;
  for (const seat of seats) {
    if (seat.kind === 'human') {
      humanSeats += 1;
      if (seat.occupant) occupiedHumanSeats += 1;
    } else if (seat.kind === 'ai') {
      aiSeats += 1;
    } else {
      spectatorSeats += 1;
    }
  }
  return {
    humanSeats,
    occupiedHumanSeats,
    openHumanSeats: humanSeats - occupiedHumanSeats,
    aiSeats,
    spectatorSeats,
  };
}

/**
 * True iff `meta` describes a joinable lobby: `status: 'lobby'`, a room
 * code present, a layout present, and at least one unoccupied
 * `kind: 'human'` seat. A match that has transitioned out of
 * `status: 'lobby'` fails the first check, so a launched or completed
 * match is never joinable.
 */
function isJoinable(meta: IMatchMeta): boolean {
  if (meta.status !== 'lobby') return false;
  if (!meta.roomCode || !meta.layout) return false;
  const seats = meta.seats ?? [];
  return seats.some((s) => s.kind === 'human' && !s.occupant);
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Query the match store for every joinable lobby. Returns the compact
 * `IJoinableLobby` projection per match, newest first (so a browser
 * shows fresh lobbies at the top).
 *
 * Per design D2 this is a filtered read over existing `IMatchMeta` — no
 * new index. A full lobby (every human seat occupied) and a launched
 * match (`status: 'active'`) are both excluded by `isJoinable`.
 */
export async function getJoinableLobbies(
  store: IMatchStore,
): Promise<readonly IJoinableLobby[]> {
  const lobbyMatches = await store.listMatches({ status: 'lobby' });
  return lobbyMatches
    .filter(isJoinable)
    .map((meta) => ({
      matchId: meta.matchId,
      // `isJoinable` guaranteed both are present.
      roomCode: meta.roomCode as string,
      layout: meta.layout as TeamLayout,
      hostDisplayName: hostDisplayName(meta),
      occupancy: summarizeOccupancy(meta),
      fogOfWar: meta.config.fogOfWar ?? false,
      createdAt: meta.createdAt,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Query the match store for every spectatable (`active`) match. Returns
 * the compact `ISpectatableMatch` projection, newest first. A match in
 * `status: 'lobby'` or `'completed'` is never returned — only a live
 * match can be observed.
 */
export async function getSpectatableMatches(
  store: IMatchStore,
): Promise<readonly ISpectatableMatch[]> {
  const activeMatches = await store.listMatches({ status: 'active' });
  return activeMatches
    .filter((meta) => Boolean(meta.layout))
    .map((meta) => ({
      matchId: meta.matchId,
      layout: meta.layout as TeamLayout,
      hostDisplayName: hostDisplayName(meta),
      occupancy: summarizeOccupancy(meta),
      fogOfWar: meta.config.fogOfWar ?? false,
      createdAt: meta.createdAt,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// `isPlayingSeat` re-exported as a convenience for callers that mix
// occupancy summarization with seat-budget checks.
export { isPlayingSeat };
