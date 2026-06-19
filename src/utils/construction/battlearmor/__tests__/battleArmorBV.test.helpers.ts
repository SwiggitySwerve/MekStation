import {
  BAArmorType,
  BAManipulator,
  BAWeightClass,
} from '@/types/unit/BattleArmorInterfaces';

import type { IBattleArmorBVInput } from '../battleArmorBV';

export function baseInput(
  overrides: Partial<IBattleArmorBVInput> = {},
): IBattleArmorBVInput {
  return {
    weightClass: BAWeightClass.MEDIUM,
    squadSize: 5,
    groundMP: 1,
    jumpMP: 0,
    umuMP: 0,
    armorPointsPerTrooper: 5,
    armorType: BAArmorType.STANDARD,
    manipulators: {
      left: BAManipulator.NONE,
      right: BAManipulator.NONE,
    },
    weapons: [],
    ammo: [],
    hasMagneticClamp: false,
    gunnery: 4,
    piloting: 5,
    ...overrides,
  };
}
