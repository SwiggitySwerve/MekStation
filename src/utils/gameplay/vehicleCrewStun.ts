import type { IUnitGameState } from '@/types/gameplay';

/**
 * Advance crew stun once at a new round's Initiative boundary.
 * MegaMek 48fcb2f64: megamek/src/megamek/common/units/Tank.java:1112-1121.
 */
export function advanceVehicleCrewStun(unit: IUnitGameState): IUnitGameState {
  if (unit.combatState?.kind !== 'vehicle') return unit;

  const vehicle = unit.combatState.state;
  return {
    ...unit,
    combatState: {
      kind: 'vehicle',
      state: {
        ...vehicle,
        motive: {
          ...vehicle.motive,
          crewStunnedPhases: Math.max(0, vehicle.motive.crewStunnedPhases - 1),
        },
      },
    },
  };
}
