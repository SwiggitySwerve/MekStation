import { InfantryMotive } from '@/types/unit/InfantryInterfaces';
import { InfantryArmorKit } from '@/types/unit/PersonnelInterfaces';

import type { InfantryBVInput } from '../infantryBV';

export function baseInput(
  overrides: Partial<InfantryBVInput> = {},
): InfantryBVInput {
  return {
    motive: InfantryMotive.FOOT,
    totalTroopers: 28,
    primaryWeapon: {
      id: 'inf-laser-rifle',
      bvOverride: 12,
      damageDivisor: 1,
    },
    armorKit: InfantryArmorKit.NONE,
    hasAntiMechTraining: false,
    gunnery: 4,
    piloting: 5,
    ...overrides,
  };
}
