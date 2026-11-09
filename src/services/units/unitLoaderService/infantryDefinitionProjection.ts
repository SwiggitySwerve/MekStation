import type { IPlatoonComposition } from '@/types/unit/InfantryInterfaces';
import type { IInfantry } from '@/types/unit/PersonnelInterfaces';

import { totalTroopers } from '@/utils/construction/infantry/platoonComposition';

type InfantryProjectionInput = Pick<
  IInfantry,
  | 'squadSize'
  | 'numberOfSquads'
  | 'motionType'
  | 'primaryWeapon'
  | 'primaryWeaponId'
  | 'secondaryWeapon'
  | 'secondaryWeaponId'
  | 'secondaryWeaponCount'
  | 'damageDivisor'
> & {
  readonly platoonComposition: IPlatoonComposition;
  readonly motiveType: string;
  readonly armorKit: string;
};

/** Shared infantry fields before UnitContract admission applies schema defaults. */
export function projectInfantryDefinition(
  value: InfantryProjectionInput,
): Record<string, unknown> {
  return {
    platoon: {
      squadSize: value.squadSize,
      squadCount: value.numberOfSquads,
      totalTroopers: totalTroopers(value.platoonComposition),
    },
    motionType: value.motionType.toUpperCase(),
    motiveType: value.motiveType,
    primaryWeapon: {
      id: value.primaryWeaponId ?? value.primaryWeapon,
      name: value.primaryWeapon,
    },
    secondaryWeapon: value.secondaryWeapon
      ? {
          id: value.secondaryWeaponId ?? value.secondaryWeapon,
          name: value.secondaryWeapon,
          count: value.secondaryWeaponCount,
        }
      : undefined,
    armorKit: value.armorKit,
    damageDivisor: value.damageDivisor,
  };
}
