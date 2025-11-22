/**
 * MissileWeapons.ts
 * Standard Inner Sphere Missile Weapons.
 */

import { IWeapon } from '../../types/Equipment';
import { ComponentType } from '../../types/ComponentType';
import { TechBase, RulesLevel } from '../../types/TechBase';

export const LRM_20: IWeapon = {
  id: 'is_lrm20',
  name: 'LRM 20',
  type: ComponentType.WEAPON,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 10,
  criticalSlots: 5,
  cost: 250000,
  battleValue: 181,
  heat: 6,
  damage: 1, // Per missile (cluster)
  range: {
    min: 6,
    short: 7,
    medium: 14,
    long: 21,
  },
  requiresAmmo: true,
  ammoType: 'ammo_lrm20',
};

export const LRM_15: IWeapon = {
  id: 'is_lrm15',
  name: 'LRM 15',
  type: ComponentType.WEAPON,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 7,
  criticalSlots: 3,
  cost: 175000,
  battleValue: 136,
  heat: 5,
  damage: 1,
  range: {
    min: 6,
    short: 7,
    medium: 14,
    long: 21,
  },
  requiresAmmo: true,
  ammoType: 'ammo_lrm15',
};

export const LRM_10: IWeapon = {
  id: 'is_lrm10',
  name: 'LRM 10',
  type: ComponentType.WEAPON,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 5,
  criticalSlots: 2,
  cost: 100000,
  battleValue: 90,
  heat: 4,
  damage: 1,
  range: {
    min: 6,
    short: 7,
    medium: 14,
    long: 21,
  },
  requiresAmmo: true,
  ammoType: 'ammo_lrm10',
};

export const LRM_5: IWeapon = {
  id: 'is_lrm5',
  name: 'LRM 5',
  type: ComponentType.WEAPON,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 2,
  criticalSlots: 1,
  cost: 30000,
  battleValue: 45,
  heat: 2,
  damage: 1,
  range: {
    min: 6,
    short: 7,
    medium: 14,
    long: 21,
  },
  requiresAmmo: true,
  ammoType: 'ammo_lrm5',
};

export const SRM_6: IWeapon = {
  id: 'is_srm6',
  name: 'SRM 6',
  type: ComponentType.WEAPON,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 3,
  criticalSlots: 2,
  cost: 80000,
  battleValue: 59,
  heat: 4,
  damage: 2, // Per missile
  range: {
    min: 0,
    short: 3,
    medium: 6,
    long: 9,
  },
  requiresAmmo: true,
  ammoType: 'ammo_srm6',
};

export const SRM_4: IWeapon = {
  id: 'is_srm4',
  name: 'SRM 4',
  type: ComponentType.WEAPON,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 2,
  criticalSlots: 1,
  cost: 60000,
  battleValue: 39,
  heat: 3,
  damage: 2,
  range: {
    min: 0,
    short: 3,
    medium: 6,
    long: 9,
  },
  requiresAmmo: true,
  ammoType: 'ammo_srm4',
};

export const SRM_2: IWeapon = {
  id: 'is_srm2',
  name: 'SRM 2',
  type: ComponentType.WEAPON,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 1,
  criticalSlots: 1,
  cost: 10000,
  battleValue: 21,
  heat: 2,
  damage: 2,
  range: {
    min: 0,
    short: 3,
    medium: 6,
    long: 9,
  },
  requiresAmmo: true,
  ammoType: 'ammo_srm2',
};

export const MISSILE_WEAPONS = [
  LRM_20,
  LRM_15,
  LRM_10,
  LRM_5,
  SRM_6,
  SRM_4,
  SRM_2,
];

