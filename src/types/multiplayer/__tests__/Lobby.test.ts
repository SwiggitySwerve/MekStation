/**
 * Lobby type/helper tests — Wave 3b.
 *
 * Asserts the layout -> seat-matrix expansion plus the `slotId` format
 * that the lobby state machine + WS broadcasts depend on.
 */

import {
  buildSlotId,
  defaultSeats,
  seatLayoutSpec,
  SIDE_NAMES,
  totalSeatCount,
  type TeamLayout,
} from '../Lobby';

describe('seatLayoutSpec', () => {
  it('derives 2 sides x N seats for team layouts', () => {
    expect(seatLayoutSpec('1v1')).toEqual({
      sides: ['Alpha', 'Bravo'],
      seatsPerSide: 1,
    });
    expect(seatLayoutSpec('4v4')).toEqual({
      sides: ['Alpha', 'Bravo'],
      seatsPerSide: 4,
    });
  });

  it('derives N sides x 1 seat for FFA layouts', () => {
    expect(seatLayoutSpec('ffa-3')).toEqual({
      sides: ['Alpha', 'Bravo', 'Charlie'],
      seatsPerSide: 1,
    });
    expect(seatLayoutSpec('ffa-8')).toEqual({
      sides: SIDE_NAMES.slice(0, 8),
      seatsPerSide: 1,
    });
  });
});

describe('buildSlotId', () => {
  it('lowercases the side and joins with a hyphen', () => {
    expect(buildSlotId('Alpha', 1)).toBe('alpha-1');
    expect(buildSlotId('BRAVO', 3)).toBe('bravo-3');
  });
});

describe('defaultSeats', () => {
  it.each<{ layout: TeamLayout; expected: number }>([
    { layout: '1v1', expected: 2 },
    { layout: '2v2', expected: 4 },
    { layout: '3v3', expected: 6 },
    { layout: '4v4', expected: 8 },
    { layout: 'ffa-2', expected: 2 },
    { layout: 'ffa-5', expected: 5 },
    { layout: 'ffa-8', expected: 8 },
  ])('$layout produces $expected seats', ({ layout, expected }) => {
    expect(defaultSeats(layout)).toHaveLength(expected);
    expect(totalSeatCount(layout)).toBe(expected);
  });

  it('starts every seat empty + human + not ready', () => {
    const seats = defaultSeats('2v2');
    for (const seat of seats) {
      expect(seat.kind).toBe('human');
      expect(seat.occupant).toBeNull();
      expect(seat.ready).toBe(false);
    }
  });

  it('uses canonical slotIds for every seat', () => {
    const seats = defaultSeats('2v2');
    expect(seats.map((s) => s.slotId)).toEqual([
      'alpha-1',
      'alpha-2',
      'bravo-1',
      'bravo-2',
    ]);
  });
});
