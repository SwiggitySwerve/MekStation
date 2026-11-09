import type { IBattleArmor } from '@/types/unit/PersonnelInterfaces';

import { BattleArmorLocation } from '@/types/construction/UnitLocation';
import { BattleArmorWeightClass } from '@/types/unit/PersonnelInterfaces';
import { battleArmorContractArmorType } from '@/utils/construction/battlearmor/battleArmorBVAdapter';

type BattleArmorProjectionInput = Pick<
  IBattleArmor,
  | 'squadSize'
  | 'chassisType'
  | 'motionType'
  | 'armorType'
  | 'armorPerTrooper'
  | 'leftManipulator'
  | 'rightManipulator'
  | 'hasAPMount'
  | 'hasModularMount'
  | 'equipment'
> & {
  readonly weightClass: BattleArmorWeightClass;
  readonly groundMP: number;
  readonly jumpMP: number;
  readonly umuMP: number;
};

/** Shared BA fields before UnitContract admission applies schema defaults. */
export function projectBattleArmorDefinition(
  value: BattleArmorProjectionInput,
): Record<string, unknown> {
  return {
    tonnage: value.squadSize,
    squadSize: value.squadSize,
    weightClass:
      value.weightClass === BattleArmorWeightClass.PA_L
        ? 'PAL'
        : value.weightClass.toUpperCase(),
    chassisType: value.chassisType.toUpperCase(),
    motionType: value.motionType.toUpperCase(),
    movement: {
      groundMP: value.groundMP,
      jumpMP: value.jumpMP,
      umuMP: value.umuMP,
    },
    armor: {
      type: battleArmorContractArmorType(value.armorType),
      perTrooper: value.armorPerTrooper,
    },
    armorPerTrooper: value.armorPerTrooper,
    manipulators: {
      leftArm: value.leftManipulator,
      rightArm: value.rightManipulator,
    },
    hasAntiPersonnelMount: value.hasAPMount,
    hasModularWeaponMount: value.hasModularMount,
    equipment: value.equipment.map((mount) => {
      const location = Object.entries(BattleArmorLocation).find(
        ([, name]) => name === mount.location,
      )?.[0];
      if (!location)
        throw new TypeError(`Unknown small-unit location: ${mount.location}`);
      return {
        id: mount.equipmentId,
        name: mount.name,
        location,
        ...('unitLocation' in mount
          ? { unitLocation: mount.unitLocation }
          : {}),
        ...('isAPMount' in mount ? { isAPMMounted: mount.isAPMount } : {}),
      };
    }),
  };
}
