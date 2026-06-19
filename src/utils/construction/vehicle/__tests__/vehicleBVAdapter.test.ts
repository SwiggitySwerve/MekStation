import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import {
  toVehicleBVInput,
  type VehicleBVStateSubset,
} from '../vehicleBVAdapter';

function baseState(
  overrides: Partial<VehicleBVStateSubset> = {},
): VehicleBVStateSubset {
  return {
    motionType: GroundMotionType.TRACKED,
    tonnage: 30,
    cruiseMP: 4,
    armorType: 'standard',
    armorAllocation: {},
    structureType: 'standard',
    turret: null,
    secondaryTurret: null,
    barRating: null,
    equipment: [],
    ...overrides,
  };
}

describe('toVehicleBVInput', () => {
  it('sums direct and one-level nested numeric armor allocation fields', () => {
    const input = toVehicleBVInput(
      baseState({
        armorAllocation: {
          front: 10,
          rear: 3,
          turret: {
            armor: 7,
            ignoredLabel: 'turret',
            ignoredDeepObject: { armor: 20 },
          },
          ignoredNull: null,
          ignoredString: 'armor',
        },
      }),
    );

    expect(input.totalArmorPoints).toBe(20);
  });
});
