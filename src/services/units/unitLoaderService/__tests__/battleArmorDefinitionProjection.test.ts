import { createDefaultBattleArmorState } from '@/stores/battleArmorState';
import { BattleArmorLocation } from '@/types/construction/UnitLocation';
import { SquadMotionType } from '@/types/unit/BaseUnitInterfaces';
import {
  BattleArmorChassisType,
  BattleArmorWeightClass,
  ManipulatorType,
} from '@/types/unit/PersonnelInterfaces';

import { projectBattleArmorDefinition } from '../battleArmorDefinitionProjection';

it('projects PA(L), per-trooper armor and ordered native mounts without losing entity locations', () => {
  const definition = projectBattleArmorDefinition({
    ...createDefaultBattleArmorState(),
    weightClass: BattleArmorWeightClass.PA_L,
    chassisType: BattleArmorChassisType.BIPED,
    squadSize: 3,
    motionType: SquadMotionType.UMU,
    groundMP: 2,
    jumpMP: 0,
    umuMP: 3,
    armorType: 35,
    armorPerTrooper: 4,
    leftManipulator: ManipulatorType.BASIC,
    rightManipulator: ManipulatorType.SALVAGE_ARM,
    hasAPMount: true,
    hasModularMount: true,
    equipment: [
      {
        id: 'mount-original',
        equipmentId: 'InfantryAssaultRifle:APM:LA',
        name: 'native rifle',
        location: BattleArmorLocation.LEFT_ARM,
        unitLocation: 'Trooper 2',
        isAPMount: true,
        isTurretMounted: false,
        isModular: true,
      },
    ],
  });
  expect(definition).toEqual({
    tonnage: 3,
    squadSize: 3,
    weightClass: 'PAL',
    chassisType: 'BIPED',
    motionType: 'UMU',
    movement: { groundMP: 2, jumpMP: 0, umuMP: 3 },
    armor: { type: 'FIRE_RESISTANT', perTrooper: 4 },
    armorPerTrooper: 4,
    manipulators: { leftArm: 'Basic', rightArm: 'Salvage Arm' },
    hasAntiPersonnelMount: true,
    hasModularWeaponMount: true,
    equipment: [
      {
        id: 'InfantryAssaultRifle:APM:LA',
        name: 'native rifle',
        location: 'LEFT_ARM',
        unitLocation: 'Trooper 2',
        isAPMMounted: true,
      },
    ],
  });
});

it('rejects an unknown native armor code instead of inventing a standard type', () => {
  expect(() =>
    projectBattleArmorDefinition({
      ...createDefaultBattleArmorState(),
      armorType: 999,
    }),
  ).toThrow('Unknown battle armor code: 999');
});
