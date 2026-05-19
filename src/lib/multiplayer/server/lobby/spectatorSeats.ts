/**
 * Spectator seat helpers — pure functions over `IMatchSeat[]`.
 *
 * `add-matchmaking-and-spectator` (M3), design D4. A `spectator` seat
 * is a third seat `kind` alongside `human` and `ai`. It is occupied by
 * an authenticated player id but owns no game units, never blocks the
 * readiness gate, and does not count toward the layout player-seat
 * budget.
 *
 * Why a separate module from `lobbyStateMachine`: the state machine's
 * `occupySeat` / `leaveSeat` / `reassignSeat` family operates on the
 * fixed seat grid `defaultSeats` produced from a `TeamLayout`. Spectator
 * seats are *appended* on demand — there is no pre-generated spectator
 * grid — so they have their own append / remove / lookup helpers.
 * Keeping them out of `lobbyStateMachine` keeps that file's contract
 * (pure mutations over a fixed grid) intact.
 *
 * @spec openspec/changes/add-matchmaking-and-spectator/specs/multiplayer-server/spec.md
 */

import type { IPlayerRef } from '@/types/multiplayer/Player';

import {
  buildSpectatorSlotId,
  isPlayingSeat,
  SPECTATOR_SIDE,
  type IMatchSeat,
} from '@/types/multiplayer/Lobby';

/**
 * A generous per-match spectator cap (design Open-Question resolution).
 * A popular match cannot exhaust server sockets with observers; a join
 * past the cap is rejected. 16 is well above any realistic Wave 3
 * audience and far below a socket-exhaustion threshold.
 */
export const MAX_SPECTATORS_PER_MATCH = 16;

/** Thrown by `addSpectatorSeat` when a spectator-specific rule fails. */
export class SpectatorSeatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpectatorSeatError';
  }
}

/**
 * True iff `seat` is a `kind: 'spectator'` seat. The inverse of
 * `isPlayingSeat` for spectator-only call sites that want to read
 * positively.
 */
export function isSpectatorSeat(seat: Pick<IMatchSeat, 'kind'>): boolean {
  return seat.kind === 'spectator';
}

/** Every `kind: 'spectator'` seat in a seat array. */
export function spectatorSeats(
  seats: readonly IMatchSeat[],
): readonly IMatchSeat[] {
  return seats.filter(isSpectatorSeat);
}

/**
 * The spectator seat occupied by `playerId`, or `null` if that player
 * is not spectating this match.
 */
export function findSpectatorSeat(
  seats: readonly IMatchSeat[],
  playerId: string,
): IMatchSeat | null {
  return (
    seats.find(
      (s) => isSpectatorSeat(s) && s.occupant?.playerId === playerId,
    ) ?? null
  );
}

/**
 * True iff `playerId` occupies a `kind: 'spectator'` seat in this
 * match. Used by the server intent gate (D5) to reject any `Intent`
 * originating from a spectator-kind seat.
 */
export function isSpectatorPlayer(
  seats: readonly IMatchSeat[],
  playerId: string,
): boolean {
  return findSpectatorSeat(seats, playerId) !== null;
}

/**
 * Append a new `kind: 'spectator'` seat occupied by `player`, returning
 * a new seat array (pure — the input is never mutated).
 *
 * Rejects when:
 *   - `player` already occupies any seat in the match (playing or
 *     spectator) — a player cannot watch a match they are in, and the
 *     no-double-occupancy rule from `occupySeat` carries over;
 *   - the match already has `MAX_SPECTATORS_PER_MATCH` spectators.
 *
 * Idempotent for self: if `player` already occupies a spectator seat,
 * the seat array is returned unchanged.
 *
 * A spectator seat carries `side: SPECTATOR_SIDE`, `ready: true` (it is
 * never part of the readiness gate, so the value is inert but `true`
 * keeps any "is this seat ready" read truthful), and a `slotId` of
 * `spectator-<n>` where `n` is the next free 1-indexed spectator
 * number.
 */
export function addSpectatorSeat(
  seats: readonly IMatchSeat[],
  player: IPlayerRef,
): IMatchSeat[] {
  const existing = findSpectatorSeat(seats, player.playerId);
  if (existing) {
    // Idempotent re-join — already spectating.
    return seats.slice();
  }

  const playingConflict = seats.find(
    (s) => isPlayingSeat(s) && s.occupant?.playerId === player.playerId,
  );
  if (playingConflict) {
    throw new SpectatorSeatError(
      `Player ${player.playerId} occupies playing slot ${playingConflict.slotId} — cannot also spectate`,
    );
  }

  const current = spectatorSeats(seats);
  if (current.length >= MAX_SPECTATORS_PER_MATCH) {
    throw new SpectatorSeatError(
      `Match is at the spectator cap (${MAX_SPECTATORS_PER_MATCH})`,
    );
  }

  const seatNumber = current.length + 1;
  const seat: IMatchSeat = {
    slotId: buildSpectatorSlotId(seatNumber),
    side: SPECTATOR_SIDE,
    seatNumber,
    occupant: player,
    kind: 'spectator',
    ready: true,
  };
  return [...seats, seat];
}

/**
 * Remove the spectator seat occupied by `playerId`, returning a new
 * seat array. A no-op (returns a copy) when the player is not
 * spectating — leaving a match you are not watching is harmless.
 */
export function removeSpectatorSeat(
  seats: readonly IMatchSeat[],
  playerId: string,
): IMatchSeat[] {
  return seats.filter(
    (s) => !(isSpectatorSeat(s) && s.occupant?.playerId === playerId),
  );
}
