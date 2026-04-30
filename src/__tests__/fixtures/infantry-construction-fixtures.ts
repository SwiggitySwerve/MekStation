/**
 * Named infantry construction fixtures for add-infantry-construction task 10.2.
 */

import {
  IInfantryFieldGun,
  IInfantryUnit,
  InfantryArmorKitType,
  InfantryMotive,
  IPlatoonComposition,
} from '@/types/unit/InfantryInterfaces';
import {
  buildFieldGun,
  findFieldGunById,
} from '@/utils/construction/infantry/fieldGuns';

export interface InfantryConstructionFixture extends IInfantryUnit {
  readonly name: string;
  readonly expectedTroopers: number;
  readonly primaryWeaponId: string;
  readonly secondaryWeaponId?: string;
}

function requiredFieldGun(weaponId: string): IInfantryFieldGun {
  const entry = findFieldGunById(weaponId);
  if (!entry) {
    throw new Error(`Missing infantry field gun fixture entry: ${weaponId}`);
  }
  return buildFieldGun(entry);
}

const footRifleComposition: IPlatoonComposition = {
  squads: 7,
  troopersPerSquad: 4,
};

const jumpSrmComposition: IPlatoonComposition = {
  squads: 5,
  troopersPerSquad: 5,
};

const mechanizedMgComposition: IPlatoonComposition = {
  squads: 4,
  troopersPerSquad: 5,
};

export const FOOT_RIFLE_PLATOON: InfantryConstructionFixture = {
  name: 'Foot Rifle Platoon',
  motiveType: InfantryMotive.FOOT,
  platoonComposition: footRifleComposition,
  armorKit: InfantryArmorKitType.STANDARD,
  primaryWeapon: 'Rifle',
  primaryWeaponId: 'inf-rifle',
  antiMechTraining: false,
  expectedTroopers: 28,
};

export const JUMP_SRM_PLATOON: InfantryConstructionFixture = {
  name: 'Jump SRM Platoon',
  motiveType: InfantryMotive.JUMP,
  platoonComposition: jumpSrmComposition,
  armorKit: InfantryArmorKitType.STANDARD,
  primaryWeapon: 'Auto-Rifle',
  primaryWeaponId: 'inf-auto-rifle',
  secondaryWeapon: 'SRM Launcher',
  secondaryWeaponId: 'inf-srm2',
  antiMechTraining: true,
  expectedTroopers: 25,
};

export const MECHANIZED_MG_PLATOON: InfantryConstructionFixture = {
  name: 'Mechanized MG Platoon',
  motiveType: InfantryMotive.MECHANIZED_TRACKED,
  platoonComposition: mechanizedMgComposition,
  armorKit: InfantryArmorKitType.FLAK,
  primaryWeapon: 'Machine Gun',
  primaryWeaponId: 'inf-mg',
  antiMechTraining: false,
  expectedTroopers: 20,
};

export const FIELD_GUN_AC5_PLATOON: InfantryConstructionFixture = {
  name: 'Field Gun (AC/5) Platoon',
  motiveType: InfantryMotive.FOOT,
  platoonComposition: footRifleComposition,
  armorKit: InfantryArmorKitType.STANDARD,
  primaryWeapon: 'Rifle',
  primaryWeaponId: 'inf-rifle',
  fieldGun: requiredFieldGun('ac5'),
  antiMechTraining: false,
  expectedTroopers: 28,
};

export const INFANTRY_CONSTRUCTION_FIXTURES = [
  FOOT_RIFLE_PLATOON,
  JUMP_SRM_PLATOON,
  MECHANIZED_MG_PLATOON,
  FIELD_GUN_AC5_PLATOON,
] as const;
