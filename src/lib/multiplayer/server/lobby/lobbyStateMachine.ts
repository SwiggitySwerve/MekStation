/**
 * Lobby State Machine — pure functions over `IMatchSeat[]`.
 *
 * Wave 3b of Phase 4. Every mutation flows through one of these
 * functions: occupy / leave / reassign / set AI / set ready. The
 * functions are deliberately pure so the `ServerMatchHost` intent
 * dispatchers stay thin (validate auth -> call function -> persist).
 *
 * Errors are thrown as plain `Error`s with a stable prefix so the host
 * can map them to typed `Error` envelopes (`code: 'INVALID_INTENT'`)
 * for the client without re-classifying.
 *
 * Why pure functions instead of a class: tests want to assert seat
 * mutations in isolation, and the host wants to compute the *next*
 * seat array before persisting (so a failed persist leaves the lobby
 * untouched). A class with internal state would couple those concerns.
 *
 * @spec openspec/changes/add-multiplayer-lobby-and-matchmaking-2-8/specs/multiplayer-server/spec.md
 */

import type { IMatchSeat } from '@/types/multiplayer/Lobby';
import type { IPlayerRef } from '@/types/multiplayer/Player';

// =============================================================================
// Errors
// =============================================================================

/**
 * Tag thrown errors with a known prefix so the host's intent handler
 * can lift them straight into an `INVALID_INTENT` Error envelope.
 */
export class LobbyStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LobbyStateError';
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Locate a seat by id or throw a `LobbyStateError`. Centralised so each
 * mutation function gets the same error message format.
 */
function requireSeat(seats: readonly IMatchSeat[], slotId: string): IMatchSeat {
  const seat = seats.find((s) => s.slotId === slotId);
  if (!seat) {
    throw new LobbyStateError(`Unknown slotId: ${slotId}`);
  }
  return seat;
}

/**
 * Replace one seat in the array, returning a new array. Pure — the
 * input is never mutated. We rebuild the whole array because seats are
 * usually <=8 elements; the cost is trivial and immutability gives the
 * host a clean before/after for diffing/broadcasts.
 */
function replaceSeat(
  seats: readonly IMatchSeat[],
  next: IMatchSeat,
): IMatchSeat[] {
  return seats.map((s) => (s.slotId === next.slotId ? next : s));
}

// =============================================================================
// occupySeat
// =============================================================================

/**
 * A joining player occupies an unoccupied human seat. Rejects if:
 *   - The slot is unknown
 *   - The slot is `kind: 'ai'`
 *   - The slot is already occupied by another player
 *   - The same player already occupies a different seat in the match
 *     (no double-occupancy — the player must `LeaveSeat` first)
 *
 * Idempotent for self: if the player already occupies the target seat,
 * the seats array is returned unchanged.
 */
export function occupySeat(
  seats: readonly IMatchSeat[],
  slotId: string,
  player: IPlayerRef,
): IMatchSeat[] {
  const seat = requireSeat(seats, slotId);
  if (seat.kind !== 'human') {
    throw new LobbyStateError(`Slot ${slotId} is not a human slot`);
  }
  if (seat.occupant && seat.occupant.playerId === player.playerId) {
    return seats.slice();
  }
  if (seat.occupant) {
    throw new LobbyStateError(`Slot ${slotId} is already occupied`);
  }
  // Reject if this player is already seated elsewhere — Wave 3b spec
  // disallows double occupancy. Host can use ReassignSeat to move
  // someone instead.
  const conflict = seats.find(
    (s) => s.occupant && s.occupant.playerId === player.playerId,
  );
  if (conflict) {
    throw new LobbyStateError(
      `Player ${player.playerId} already occupies slot ${conflict.slotId}`,
    );
  }
  return replaceSeat(seats, {
    ...seat,
    occupant: player,
    ready: false,
  });
}

// =============================================================================
// leaveSeat
// =============================================================================

/**
 * Player leaves a seat they occupy. Rejects if the slot is unknown or
 * the player isn't the current occupant. Clears the ready flag along
 * with the occupant so a re-join doesn't inherit stale readiness.
 */
export function leaveSeat(
  seats: readonly IMatchSeat[],
  slotId: string,
  playerId: string,
): IMatchSeat[] {
  const seat = requireSeat(seats, slotId);
  if (!seat.occupant || seat.occupant.playerId !== playerId) {
    throw new LobbyStateError(
      `Player ${playerId} does not occupy slot ${slotId}`,
    );
  }
  return replaceSeat(seats, {
    ...seat,
    occupant: null,
    ready: false,
  });
}

// =============================================================================
// reassignSeat
// =============================================================================

/**
 * Host moves an occupant from `slotId` to a different `(toSide,
 * toSeat)`. Rejects if either slot is unknown, if the source has no
 * occupant, or if the destination is occupied / not human. Auth (host
 * only) is enforced by the caller.
 */
export function reassignSeat(
  seats: readonly IMatchSeat[],
  slotId: string,
  toSide: string,
  toSeat: number,
): IMatchSeat[] {
  const source = requireSeat(seats, slotId);
  if (!source.occupant) {
    throw new LobbyStateError(`Source slot ${slotId} has no occupant`);
  }
  const targetId = `${toSide.toLowerCase()}-${toSeat}`;
  if (targetId === slotId) {
    return seats.slice();
  }
  const target = requireSeat(seats, targetId);
  if (target.kind !== 'human') {
    throw new LobbyStateError(`Target slot ${targetId} is not a human slot`);
  }
  if (target.occupant) {
    throw new LobbyStateError(`Target slot ${targetId} is already occupied`);
  }
  // Two-step replace — vacate source, then fill target. Both flips
  // happen in the same returned array so observers see one transition.
  let next = replaceSeat(seats, {
    ...source,
    occupant: null,
    ready: false,
  });
  next = replaceSeat(next, {
    ...target,
    occupant: source.occupant,
    ready: false,
  });
  return next;
}

// =============================================================================
// setAiSlot
// =============================================================================

/**
 * Toggle a slot to AI. If the slot is currently human and occupied,
 * the occupant is evicted (use case: host fills a no-show seat with a
 * bot at launch). Going to AI sets `ready: true` because AI seats are
 * always considered ready per spec 6.2.
 *
 * Pass `aiProfile: undefined` (or omit) to default to `'basic'`. Auth
 * (host only) is enforced by the caller.
 */
export function setAiSlot(
  seats: readonly IMatchSeat[],
  slotId: string,
  aiProfile?: string,
): IMatchSeat[] {
  const seat = requireSeat(seats, slotId);
  return replaceSeat(seats, {
    ...seat,
    kind: 'ai',
    occupant: null,
    ready: true,
    aiProfile: aiProfile ?? 'basic',
  });
}

// =============================================================================
// setHumanSlot
// =============================================================================

/**
 * Flip an AI slot back to an unoccupied human slot. Rejects if the
 * slot is currently human (host should use `LeaveSeat` to vacate a
 * human seat instead). Auth (host only) is enforced by the caller.
 */
export function setHumanSlot(
  seats: readonly IMatchSeat[],
  slotId: string,
): IMatchSeat[] {
  const seat = requireSeat(seats, slotId);
  if (seat.kind !== 'ai') {
    throw new LobbyStateError(`Slot ${slotId} is already a human slot`);
  }
  // Strip aiProfile by spreading without it.
  return replaceSeat(seats, {
    slotId: seat.slotId,
    side: seat.side,
    seatNumber: seat.seatNumber,
    occupant: null,
    kind: 'human',
    ready: false,
  });
}

// =============================================================================
// setReady
// =============================================================================

/**
 * Toggle the ready flag on an occupied human seat. Rejects if the
 * slot is unknown, the seat is unoccupied, or the seat is AI (AI is
 * always ready by spec).
 */
export function setReady(
  seats: readonly IMatchSeat[],
  slotId: string,
  ready: boolean,
): IMatchSeat[] {
  const seat = requireSeat(seats, slotId);
  if (seat.kind !== 'human') {
    throw new LobbyStateError(`Slot ${slotId} is an AI slot — always ready`);
  }
  if (!seat.occupant) {
    throw new LobbyStateError(`Slot ${slotId} is empty — cannot set ready`);
  }
  return replaceSeat(seats, { ...seat, ready });
}

// =============================================================================
// canLaunch
// =============================================================================

/**
 * Readiness gate: every seat must be either AI (always ready) or a
 * human seat with an occupant who has set `ready: true`. Empty human
 * seats block launch.
 */
export function canLaunch(seats: readonly IMatchSeat[]): boolean {
  if (seats.length === 0) return false;
  return seats.every((s) => {
    if (s.kind === 'ai') return true;
    return s.occupant !== null && s.ready;
  });
}
