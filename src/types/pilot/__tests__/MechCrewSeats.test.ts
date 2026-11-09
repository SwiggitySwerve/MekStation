/**
 * Authored Tripod and QuadVee crew seats (MM 48fcb2f64 TripodMek.java:115-117,
 * Mek.java:7167, QuadVee.java:164-166, Crew.java:218).
 */
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

import {
  assertMechCrewSeat,
  buildMechCrew,
  getMechCrewType,
  MAX_CREW_SKILL,
  normalizeMechCrewSeats,
  type IMechCrewSeat,
} from '../MechCrewSeats';

const pilot = (slotIndex: number, name = `P${slotIndex}`): IMechCrewSeat => ({
  slotIndex,
  name,
  gunnery: slotIndex + 2,
  piloting: slotIndex + 3,
});

describe('getMechCrewType', () => {
  it.each([
    [MechConfiguration.TRIPOD, 20, 'TRIPOD'],
    [MechConfiguration.TRIPOD, 100, 'TRIPOD'],
    [MechConfiguration.TRIPOD, 105, 'SUPERHEAVY_TRIPOD'],
    [MechConfiguration.QUADVEE, 30, 'QUADVEE'],
    [MechConfiguration.QUADVEE, 100, 'QUADVEE'],
    [MechConfiguration.BIPED, 50, undefined],
    [MechConfiguration.QUAD, 50, undefined],
    [MechConfiguration.LAM, 50, undefined],
  ] as const)('%s at %s tons is %s', (configuration, tonnage, expected) => {
    expect(getMechCrewType(configuration, tonnage)).toBe(expected);
  });
});

describe('normalizeMechCrewSeats', () => {
  it('sorts by slot, lets the last write win and drops an empty roster', () => {
    expect(
      normalizeMechCrewSeats([pilot(1), pilot(0), pilot(1, 'Later')]),
    ).toEqual([pilot(0), pilot(1, 'Later')]);
    expect(normalizeMechCrewSeats([])).toBeUndefined();
    expect(normalizeMechCrewSeats(undefined)).toBeUndefined();
  });
});

describe('assertMechCrewSeat', () => {
  it('accepts skills from 0 to the pinned Crew.MAX_SKILL', () => {
    expect(MAX_CREW_SKILL).toBe(8);
    expect(() =>
      assertMechCrewSeat({ slotIndex: 0, name: 'A', gunnery: 0, piloting: 8 }),
    ).not.toThrow();
  });

  it.each([
    [{ slotIndex: 0, name: 'A', gunnery: 9, piloting: 4 }],
    [{ slotIndex: 0, name: 'A', gunnery: 4, piloting: -1 }],
    [{ slotIndex: 0, name: 'A', gunnery: 3.5, piloting: 4 }],
    [{ slotIndex: 3, name: 'A', gunnery: 4, piloting: 4 }],
    [{ slotIndex: 0, name: '   ', gunnery: 4, piloting: 4 }],
  ])('rejects %j', (seat) => {
    expect(() => assertMechCrewSeat(seat)).toThrow(RangeError);
  });
});

describe('buildMechCrew', () => {
  it('prints no crew when nothing was authored', () => {
    expect(
      buildMechCrew(MechConfiguration.TRIPOD, 100, undefined),
    ).toBeUndefined();
  });

  it('leaves unassigned seats blank and keeps unequal skills', () => {
    expect(buildMechCrew(MechConfiguration.TRIPOD, 100, [pilot(1)])).toEqual({
      crewType: 'TRIPOD',
      slots: [
        { slotIndex: 0, role: 'Pilot' },
        {
          slotIndex: 1,
          role: 'Gunner',
          pilot: { name: 'P1', gunnery: 3, piloting: 4, wounds: 0 },
        },
      ],
    });
  });

  it('adds the Tech Officer above 100 tons and drops it at 100 or below', () => {
    const seats = [pilot(0), pilot(2)];
    expect(
      buildMechCrew(MechConfiguration.TRIPOD, 105, seats)?.slots.map(
        (slot) => slot.role,
      ),
    ).toEqual(['Pilot', 'Gunner', 'Tech Officer']);
    expect(
      buildMechCrew(MechConfiguration.TRIPOD, 100, seats)?.slots.map(
        (slot) => slot.pilot?.name,
      ),
    ).toEqual(['P0', undefined]);
  });

  it('prints nothing when only a seat the unit does not have is stored', () => {
    expect(
      buildMechCrew(MechConfiguration.TRIPOD, 100, [pilot(2)]),
    ).toBeUndefined();
  });

  it('builds the QuadVee roster and refuses other configurations', () => {
    expect(
      buildMechCrew(MechConfiguration.QUADVEE, 30, [pilot(0)])?.crewType,
    ).toBe('QUADVEE');
    expect(
      buildMechCrew(MechConfiguration.BIPED, 50, [pilot(0)]),
    ).toBeUndefined();
  });
});
