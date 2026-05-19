/**
 * Spectator seat tests — `add-matchmaking-and-spectator` (M3).
 *
 * Covers the `spectator` seat kind (design D4): a spectator seat owns
 * no game units, is excluded from the readiness gate, and does not
 * count toward a layout's player-seat budget.
 *
 * @spec openspec/changes/add-matchmaking-and-spectator/specs/multiplayer-server/spec.md
 */

import type { IPlayerRef } from '@/types/multiplayer/Player';

import {
  defaultSeats,
  isPlayingSeat,
  playingSeatCount,
  SPECTATOR_SIDE,
} from '@/types/multiplayer/Lobby';

import { canLaunch, occupySeat, setReady } from '../lobby/lobbyStateMachine';
import {
  addSpectatorSeat,
  findSpectatorSeat,
  isSpectatorPlayer,
  isSpectatorSeat,
  MAX_SPECTATORS_PER_MATCH,
  removeSpectatorSeat,
  spectatorSeats,
  SpectatorSeatError,
} from '../lobby/spectatorSeats';

const ALICE: IPlayerRef = { playerId: 'pid_alice', displayName: 'Alice' };
const BOB: IPlayerRef = { playerId: 'pid_bob', displayName: 'Bob' };
const WATCHER: IPlayerRef = { playerId: 'pid_watcher', displayName: 'Watcher' };

/** A `1v1` lobby with both human seats occupied + ready. */
function readyOneVOne() {
  let seats = defaultSeats('1v1');
  seats = occupySeat(seats, 'alpha-1', ALICE);
  seats = occupySeat(seats, 'bravo-1', BOB);
  seats = setReady(seats, 'alpha-1', true);
  seats = setReady(seats, 'bravo-1', true);
  return seats;
}

describe('addSpectatorSeat', () => {
  it('appends a spectator seat that owns no playing slot', () => {
    const seats = addSpectatorSeat(defaultSeats('1v1'), WATCHER);
    const seat = findSpectatorSeat(seats, WATCHER.playerId);
    expect(seat).not.toBeNull();
    expect(seat?.kind).toBe('spectator');
    expect(seat?.side).toBe(SPECTATOR_SIDE);
    expect(seat?.occupant).toEqual(WATCHER);
    expect(isPlayingSeat(seat!)).toBe(false);
  });

  it('1-indexes spectator slot ids', () => {
    let seats = defaultSeats('1v1');
    seats = addSpectatorSeat(seats, WATCHER);
    seats = addSpectatorSeat(seats, {
      playerId: 'pid_w2',
      displayName: 'W2',
    });
    expect(spectatorSeats(seats).map((s) => s.slotId)).toEqual([
      'spectator-1',
      'spectator-2',
    ]);
  });

  it('is idempotent for a player already spectating', () => {
    let seats = addSpectatorSeat(defaultSeats('1v1'), WATCHER);
    seats = addSpectatorSeat(seats, WATCHER);
    expect(spectatorSeats(seats)).toHaveLength(1);
  });

  it('rejects a player who occupies a playing seat', () => {
    const seats = occupySeat(defaultSeats('1v1'), 'alpha-1', ALICE);
    expect(() => addSpectatorSeat(seats, ALICE)).toThrow(SpectatorSeatError);
  });

  it('rejects past the spectator cap', () => {
    let seats = defaultSeats('1v1');
    for (let i = 0; i < MAX_SPECTATORS_PER_MATCH; i += 1) {
      seats = addSpectatorSeat(seats, {
        playerId: `pid_s${i}`,
        displayName: `S${i}`,
      });
    }
    expect(spectatorSeats(seats)).toHaveLength(MAX_SPECTATORS_PER_MATCH);
    expect(() =>
      addSpectatorSeat(seats, { playerId: 'pid_over', displayName: 'Over' }),
    ).toThrow(SpectatorSeatError);
  });
});

describe('removeSpectatorSeat', () => {
  it('drops the spectator seat for a player', () => {
    let seats = addSpectatorSeat(defaultSeats('1v1'), WATCHER);
    seats = removeSpectatorSeat(seats, WATCHER.playerId);
    expect(findSpectatorSeat(seats, WATCHER.playerId)).toBeNull();
  });

  it('is a no-op for a non-spectating player', () => {
    const seats = defaultSeats('1v1');
    expect(removeSpectatorSeat(seats, 'pid_nobody')).toHaveLength(seats.length);
  });
});

describe('spectator classification', () => {
  it('isSpectatorPlayer is true for a seated spectator', () => {
    const seats = addSpectatorSeat(defaultSeats('1v1'), WATCHER);
    expect(isSpectatorPlayer(seats, WATCHER.playerId)).toBe(true);
  });

  it('isSpectatorPlayer is false for a playing occupant', () => {
    const seats = addSpectatorSeat(
      occupySeat(defaultSeats('1v1'), 'alpha-1', ALICE),
      WATCHER,
    );
    expect(isSpectatorPlayer(seats, ALICE.playerId)).toBe(false);
  });

  it('isSpectatorSeat distinguishes seat kinds', () => {
    const seats = addSpectatorSeat(defaultSeats('1v1'), WATCHER);
    expect(seats.filter(isSpectatorSeat)).toHaveLength(1);
    expect(seats.filter((s) => !isSpectatorSeat(s))).toHaveLength(2);
  });
});

describe('canLaunch with spectator seats — design D4', () => {
  it('launches with exactly its human seats ready, ignoring spectators', () => {
    // Scenario: Spectator seat does not block launch.
    let seats = readyOneVOne();
    seats = addSpectatorSeat(seats, WATCHER);
    expect(canLaunch(seats)).toBe(true);
  });

  it('an empty human seat still blocks launch even with a spectator', () => {
    let seats = occupySeat(defaultSeats('1v1'), 'alpha-1', ALICE);
    seats = setReady(seats, 'alpha-1', true);
    seats = addSpectatorSeat(seats, WATCHER);
    // bravo-1 is still empty — the spectator does not paper over it.
    expect(canLaunch(seats)).toBe(false);
  });

  it('a roster of spectators alone cannot launch', () => {
    const seats = addSpectatorSeat([], WATCHER);
    expect(canLaunch(seats)).toBe(false);
  });
});

describe('player-seat budget — design D4', () => {
  it('a 1v1 with a spectator still has exactly two playing seats', () => {
    // Scenario: Spectator does not consume a player slot.
    let seats = readyOneVOne();
    seats = addSpectatorSeat(seats, WATCHER);
    expect(playingSeatCount(seats)).toBe(2);
    expect(seats.filter((s) => s.kind === 'human')).toHaveLength(2);
    expect(seats.filter((s) => s.kind === 'spectator')).toHaveLength(1);
  });
});
