import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import type { VehicleBVInput } from '../vehicleBV';

export function baseInput(
  overrides: Partial<VehicleBVInput> = {},
): VehicleBVInput {
  return {
    motionType: GroundMotionType.TRACKED,
    cruiseMP: 4,
    flankMP: 6,
    jumpMP: 0,
    tonnage: 60,
    totalArmorPoints: 176,
    totalStructurePoints: 30,
    armorType: 'standard',
    structureType: 'standard',
    barRating: null,
    weapons: [],
    ammo: [],
    defensiveEquipment: [],
    offensiveEquipment: [],
    explosivePenalty: 0,
    gunnery: 4,
    piloting: 5,
    ...overrides,
  };
}
