import type { AmmoBVPools } from '../battleValueOffensiveTypes';
import type { VehicleBVInput } from './vehicleBVTypes';

import { projectMechAmmoBVPools } from '../battleValueAmmo';
import { getDefensiveEquipmentKind } from '../battleValueEquipment';
import { isOneShotBVWeapon } from '../equipmentBV/weaponHeat';

/** Vehicle diagnostic pools, separate from the offensive ammunition arithmetic. */
export function projectVehicleAmmoPools(
  input: VehicleBVInput,
  pools: AmmoBVPools,
  resolveMountBV: (mount: { id: string; bvOverride?: number }) => number,
): Pick<AmmoBVPools, 'available' | 'cap'> {
  // BVCalculator.assembleAmmo also records raw defensive launcher caps.
  // Reuse the shared diagnostic API, whose compatibility name retains Mech.
  return projectMechAmmoBVPools(pools, undefined, undefined, {
    weapons: (input.defensiveEquipment ?? [])
      .filter(
        (entry) =>
          getDefensiveEquipmentKind(entry.id) === 'ams' &&
          !isOneShotBVWeapon(entry.id),
      )
      .map((entry) => ({
        id: entry.id,
        bv: resolveMountBV(entry),
      })),
    bins: [],
  });
}
