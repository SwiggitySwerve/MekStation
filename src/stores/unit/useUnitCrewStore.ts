import {
  assertMechCrewSeat,
  getMechCrewType,
  normalizeMechCrewSeats,
  type IMechCrewSeat,
} from '@/types/pilot/MechCrewSeats';
import { getMechCrewRoles } from '@/types/pilot/MechCrewType';

import type { UnitSliceGetFn, UnitSliceSetFn } from './unitSliceTypes';

import { modifiedPatch } from '../unitStoreIdentityActions';

export interface UnitCrewActions {
  setCrewSeat: (seat: IMechCrewSeat) => void;
  clearCrewSeat: (slotIndex: number) => void;
}

/**
 * Actions for the authored Tripod/QuadVee crew seats on a unit draft. A seat is
 * accepted only if the unit's native roster has it (CrewType.java:51-53); seats
 * already stored stay put when tonnage later removes the Tech Officer.
 */
export function createCrewSlice(
  set: UnitSliceSetFn,
  get: UnitSliceGetFn,
): UnitCrewActions {
  return {
    setCrewSeat: (seat) => {
      assertMechCrewSeat(seat);
      const { configuration, tonnage } = get();
      const crewType = getMechCrewType(configuration, tonnage);
      if (!crewType)
        throw new RangeError(`${configuration} units have no crew seats`);
      if (seat.slotIndex >= getMechCrewRoles(crewType).length)
        throw new RangeError(`${crewType} has no seat ${seat.slotIndex}`);
      set((state) =>
        modifiedPatch({
          crewSeats: normalizeMechCrewSeats([...(state.crewSeats ?? []), seat]),
        }),
      );
    },
    clearCrewSeat: (slotIndex) =>
      set((state) =>
        modifiedPatch({
          crewSeats: normalizeMechCrewSeats(
            (state.crewSeats ?? []).filter(
              (seat) => seat.slotIndex !== slotIndex,
            ),
          ),
        }),
      ),
  };
}
