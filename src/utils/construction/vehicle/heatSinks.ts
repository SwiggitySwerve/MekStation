/** Heat-neutral vehicle weapon load. Pinned MegaMek 48fcb2f64a1b,
 * TestEntity.java:945-950; engine allowances: Engine.java:480-493.
 */
import type { IEquipmentItem } from '@/types/equipment';

import {
  EngineType,
  type VehicleEngineType,
} from '@/types/construction/EngineType';
import { EquipmentCategory } from '@/types/equipment';
import { isValidWeight } from '@/utils/physical/weightUtils';

import { isVehicleFusionEngine } from './engine';
import { isPowerAmplifierEnergyWeapon } from './powerAmplifier';

export function getVehicleHeatNeutralWeaponHeat(
  item: Pick<IEquipmentItem, 'category' | 'name' | 'heat' | 'special'>,
): number | null {
  const weapon = [
    EquipmentCategory.ENERGY_WEAPON,
    EquipmentCategory.BALLISTIC_WEAPON,
    EquipmentCategory.MISSILE_WEAPON,
    EquipmentCategory.ARTILLERY,
    EquipmentCategory.CAPITAL_WEAPON,
  ].includes(item.category);
  return isPowerAmplifierEnergyWeapon(item) ||
    (weapon && /plasma/i.test(item.name))
    ? item.heat !== undefined && isValidWeight(item.heat)
      ? item.heat
      : null
    : 0;
}

/** TestTank.java:264-270, TestEntity.java:980-981; one ton per extra sink. */
export function computeCombatVehicleHeatSinkWeight(
  rawHeat: number | null,
  engineType: VehicleEngineType,
  stealth = false,
): number | null {
  if (rawHeat === null) return null;
  const free = isVehicleFusionEngine(engineType)
    ? 10
    : engineType === EngineType.FISSION
      ? 5
      : engineType === EngineType.FUEL_CELL
        ? 1
        : 0;
  return Math.max(0, rawHeat + (stealth ? 10 : 0) - free);
}
