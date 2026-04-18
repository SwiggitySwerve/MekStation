/**
 * Lobby state machine tests — Wave 3b.
 *
 * These exercise pure functions, so no host/store wiring is needed.
 * Each test asserts both the happy path and the matching rejection so
 * the host's `INVALID_INTENT` envelope mapping stays accurate.
 */

import type { IPlayerRef } from '@/types/multiplayer/Player';

import { defaultSeats } from '@/types/multiplayer/Lobby';

import {
  canLaunch,
  leaveSeat,
  LobbyStateError,
  occupySeat,
  reassignSeat,
  setAiSlot,
  setHumanSlot,
  setReady,
} from '../lobby/lobbyStateMachine';

const ALICE: IPlayerRef = { playerId: 'pid_alice', displayName: 'Alice' };
const BOB: IPlayerRef = { playerId: 'pid_bob', displayName: 'Bob' };

describe('occupySeat', () => {
  it('seats the player into an empty human slot', () => {
    const seats = defaultSeats('2v2');
    const next = occupySeat(seats, 'alpha-1', ALICE);
    const target = next.find((s) => s.slotId === 'alpha-1');
    expect(target?.occupant).toEqual(ALICE);
    expect(target?.ready).toBe(false);
  });

  it('rejects when the slot is occupied by someone else', () => {
    let seats = defaultSeats('1v1');
    seats = occupySeat(seats, 'alpha-1', ALICE);
    expect(() => occupySeat(seats, 'alpha-1', BOB)).toThrow(LobbyStateError);
  });

  it('is idempotent when the same player re-occupies', () => {
    let seats = defaultSeats('1v1');
    seats = occupySeat(seats, 'alpha-1', ALICE);
    const again = occupySeat(seats, 'alpha-1', ALICE);
    expect(again.find((s) => s.slotId === 'alpha-1')?.occupant).toEqual(ALICE);
  });

  it('rejects double-occupancy across slots', () => {
    let seats = defaultSeats('2v2');
    seats = occupySeat(seats, 'alpha-1', ALICE);
    expect(() => occupySeat(seats, 'bravo-1', ALICE)).toThrow(LobbyStateError);
  });

  it('rejects when the slot is AI', () => {
    let seats = defaultSeats('1v1');
    seats = setAiSlot(seats, 'alpha-1');
    expect(() => occupySeat(seats, 'alpha-1', ALICE)).toThrow(LobbyStateError);
  });
});

describe('leaveSeat', () => {
  it('clears the occupant + ready flag', () => {
    let seats = defaultSeats('1v1');
    seats = occupySeat(seats, 'alpha-1', ALICE);
    seats = setReady(seats, 'alpha-1', true);
    seats = leaveSeat(seats, 'alpha-1', ALICE.playerId);
    const target = seats.find((s) => s.slotId === 'alpha-1');
    expect(target?.occupant).toBeNull();
    expect(target?.ready).toBe(false);
  });

  it("rejects when player doesn't occupy the slot", () => {
    const seats = defaultSeats('1v1');
    expect(() => leaveSeat(seats, 'alpha-1', ALICE.playerId)).toThrow(
      LobbyStateError,
    );
  });
});

describe('reassignSeat', () => {
  it('moves an occupant to a new empty slot', () => {
    let seats = defaultSeats('2v2');
    seats = occupySeat(seats, 'alpha-1', ALICE);
    seats = reassignSeat(seats, 'alpha-1', 'Bravo', 2);
    expect(seats.find((s) => s.slotId === 'alpha-1')?.occupant).toBeNull();
    expect(seats.find((s) => s.slotId === 'bravo-2')?.occupant).toEqual(ALICE);
  });

  it('rejects when source has no occupant', () => {
    const seats = defaultSeats('2v2');
    expect(() => reassignSeat(seats, 'alpha-1', 'Bravo', 1)).toThrow(
      LobbyStateError,
    );
  });

  it('rejects when target is occupied', () => {
    let seats = defaultSeats('2v2');
    seats = occupySeat(seats, 'alpha-1', ALICE);
    seats = occupySeat(seats, 'bravo-1', BOB);
    expect(() => reassignSeat(seats, 'alpha-1', 'Bravo', 1)).toThrow(
      LobbyStateError,
    );
  });
});

describe('setAiSlot / setHumanSlot', () => {
  it('flips a slot to AI and back', () => {
    let seats = defaultSeats('1v1');
    seats = setAiSlot(seats, 'alpha-1', 'aggressive');
    let target = seats.find((s) => s.slotId === 'alpha-1');
    expect(target?.kind).toBe('ai');
    expect(target?.aiProfile).toBe('aggressive');
    expect(target?.ready).toBe(true);

    seats = setHumanSlot(seats, 'alpha-1');
    target = seats.find((s) => s.slotId === 'alpha-1');
    expect(target?.kind).toBe('human');
    expect(target?.aiProfile).toBeUndefined();
    expect(target?.ready).toBe(false);
  });

  it('evicts an existing occupant when toggling to AI', () => {
    let seats = defaultSeats('1v1');
    seats = occupySeat(seats, 'alpha-1', ALICE);
    seats = setAiSlot(seats, 'alpha-1');
    expect(seats.find((s) => s.slotId === 'alpha-1')?.occupant).toBeNull();
  });

  it('setHumanSlot rejects on already-human slot', () => {
    const seats = defaultSeats('1v1');
    expect(() => setHumanSlot(seats, 'alpha-1')).toThrow(LobbyStateError);
  });
});

describe('setReady', () => {
  it('toggles ready on an occupied human slot', () => {
    let seats = defaultSeats('1v1');
    seats = occupySeat(seats, 'alpha-1', ALICE);
    seats = setReady(seats, 'alpha-1', true);
    expect(seats.find((s) => s.slotId === 'alpha-1')?.ready).toBe(true);
  });

  it('rejects on empty slot', () => {
    const seats = defaultSeats('1v1');
    expect(() => setReady(seats, 'alpha-1', true)).toThrow(LobbyStateError);
  });

  it('rejects on AI slot', () => {
    let seats = defaultSeats('1v1');
    seats = setAiSlot(seats, 'alpha-1');
    expect(() => setReady(seats, 'alpha-1', true)).toThrow(LobbyStateError);
  });
});

describe('canLaunch', () => {
  it('returns false when any human seat is empty', () => {
    let seats = defaultSeats('2v2');
    seats = occupySeat(seats, 'alpha-1', ALICE);
    seats = setReady(seats, 'alpha-1', true);
    expect(canLaunch(seats)).toBe(false);
  });

  it('returns false when a human seat is unready', () => {
    let seats = defaultSeats('1v1');
    seats = occupySeat(seats, 'alpha-1', ALICE);
    seats = occupySeat(seats, 'bravo-1', BOB);
    seats = setReady(seats, 'alpha-1', true);
    // Bob hasn't readied yet.
    expect(canLaunch(seats)).toBe(false);
  });

  it('returns true when all humans are ready and AI fills the rest', () => {
    let seats = defaultSeats('2v2');
    seats = occupySeat(seats, 'alpha-1', ALICE);
    seats = setReady(seats, 'alpha-1', true);
    seats = setAiSlot(seats, 'alpha-2');
    seats = occupySeat(seats, 'bravo-1', BOB);
    seats = setReady(seats, 'bravo-1', true);
    seats = setAiSlot(seats, 'bravo-2');
    expect(canLaunch(seats)).toBe(true);
  });

  it('returns false on an empty seat array', () => {
    expect(canLaunch([])).toBe(false);
  });
});
