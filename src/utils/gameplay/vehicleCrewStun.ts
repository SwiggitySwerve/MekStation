import type { IUnitGameState, IVehicleCombatState } from '@/types/gameplay';

/**
 * First stun starts at two rounds; another stun adds one remaining round.
 * MegaMek 48fcb2f64: megamek/src/megamek/common/units/Tank.java:1065-1071.
 * @spec openspec/changes/correct-repeated-vehicle-crew-stun/specs/game-state-management/spec.md
 */
export function stunCrew(vehicle: IVehicleCombatState): IVehicleCombatState {
  return {
    ...vehicle,
    motive: {
      ...vehicle.motive,
      crewStunnedPhases:
        vehicle.motive.crewStunnedPhases === 0
          ? 2
          : vehicle.motive.crewStunnedPhases + 1,
    },
  };
}

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
