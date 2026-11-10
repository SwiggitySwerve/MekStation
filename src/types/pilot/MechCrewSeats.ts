import type { IRecordSheetMechCrew } from '@/types/printing/RecordSheetTypes';

import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

import { getMechCrewRoles, type MechCrewType } from './MechCrewType';

/** One authored Tripod/QuadVee seat; unassigned seats are simply absent. */
export interface IMechCrewSeat {
  readonly slotIndex: number;
  readonly name: string;
  readonly gunnery: number;
  readonly piloting: number;
}

/** MM 48fcb2f64 Crew.java:218, the maximum a crew can have in any skill. */
export const MAX_CREW_SKILL = 8;
/** Native seats of the largest roster (SUPERHEAVY_TRIPOD, CrewType.java:53). */
export const MAX_CREW_SLOTS = 3;

const SUPERHEAVY_ABOVE_TONS = 100;

/**
 * Native crew type of an editor configuration: TripodMek.java:115-117 returns
 * SUPERHEAVY_TRIPOD when `isSuperHeavy()` (Mek.java:7167, weight > 100) and TRIPOD
 * otherwise; QuadVee.java:164-166 always returns QUADVEE. Other configurations
 * have the single default pilot and no native seats.
 */
export function getMechCrewType(
  configuration: MechConfiguration,
  tonnage: number,
): MechCrewType | undefined {
  if (configuration === MechConfiguration.TRIPOD)
    return tonnage > SUPERHEAVY_ABOVE_TONS ? 'SUPERHEAVY_TRIPOD' : 'TRIPOD';
  if (configuration === MechConfiguration.QUADVEE) return 'QUADVEE';
  return undefined;
}

/** Throws RangeError for a seat that could not be stored or printed. */
export function assertMechCrewSeat(seat: IMechCrewSeat): void {
  if (
    !Number.isInteger(seat.slotIndex) ||
    seat.slotIndex < 0 ||
    seat.slotIndex >= MAX_CREW_SLOTS
  )
    throw new RangeError(`Crew seat ${seat.slotIndex} does not exist`);
  if (seat.name.trim() === '')
    throw new RangeError('A crew seat needs a pilot name');
  for (const skill of [seat.gunnery, seat.piloting])
    if (!Number.isInteger(skill) || skill < 0 || skill > MAX_CREW_SKILL)
      throw new RangeError(
        `Crew skill ${skill} is outside 0 to ${MAX_CREW_SKILL}`,
      );
}

/** Canonical stored form: ascending slot order, one seat per slot (last wins), none when empty. */
export function normalizeMechCrewSeats(
  seats: readonly IMechCrewSeat[] | undefined,
): readonly IMechCrewSeat[] | undefined {
  const bySlot = new Map<number, IMechCrewSeat>();
  for (const seat of seats ?? []) bySlot.set(seat.slotIndex, { ...seat });
  return bySlot.size === 0
    ? undefined
    : [...bySlot.values()].sort((a, b) => a.slotIndex - b.slotIndex);
}

/**
 * The native roster with every seat unassigned. QuadVee.java:164-166 always
 * gives a QuadVee the QUADVEE crew, so MML prints its two seats with or
 * without named crew (PrintMek.java:343-348 selects the dual-seat panel).
 */
export function blankMechCrew(crewType: MechCrewType): IRecordSheetMechCrew {
  return {
    crewType,
    slots: getMechCrewRoles(crewType).map((role, slotIndex) => ({
      slotIndex,
      role,
    })),
  };
}

/**
 * Print roster for the stored seats, or undefined when the sheet should keep its
 * single-pilot layout. Seats the unit does not have at this tonnage (the Tech
 * Officer at 100 tons or less) stay stored but are not printed.
 */
export function buildMechCrew(
  configuration: MechConfiguration,
  tonnage: number,
  seats: readonly IMechCrewSeat[] | undefined,
): IRecordSheetMechCrew | undefined {
  const crewType = getMechCrewType(configuration, tonnage);
  if (!crewType) return undefined;
  const roles = getMechCrewRoles(crewType);
  const printed = (seats ?? []).filter((seat) => seat.slotIndex < roles.length);
  if (printed.length === 0) return undefined;
  return {
    crewType,
    slots: roles.map((role, slotIndex) => {
      const seat = printed.find((entry) => entry.slotIndex === slotIndex);
      return seat
        ? {
            slotIndex,
            role,
            pilot: {
              name: seat.name,
              gunnery: seat.gunnery,
              piloting: seat.piloting,
              wounds: 0,
            },
          }
        : { slotIndex, role };
    }),
  };
}
