/** Heat-neutral vehicle weapon load. Pinned MegaMek 48fcb2f64a1b,
 * TestEntity.java:945-950; engine allowances: Engine.java:480-493.
 */
import type { IEquipmentItem } from '@/types/equipment';

import { isPowerAmplifierEnergyWeapon } from './powerAmplifier';

export function getVehicleHeatNeutralWeaponHeat(
  item: Pick<IEquipmentItem, 'category' | 'name' | 'heat' | 'special'>,
): number {
  return isPowerAmplifierEnergyWeapon(item) || /plasma/i.test(item.name)
    ? (item.heat ?? 0)
    : 0;
}
