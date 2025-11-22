/**
 * BallisticWeapons.ts
 * Standard Inner Sphere Ballistic Weapons.
 */

import { IWeapon } from '../../types/Equipment';
import { ComponentType } from '../../types/ComponentType';
import { TechBase, RulesLevel } from '../../types/TechBase';

export const AC_20: IWeapon = {
  id: 'is_ac20',
  name: 'Autocannon/20',
  type: ComponentType.WEAPON,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 14,
  criticalSlots: 10,
  cost: 300000,
  battleValue: 178,
  heat: 7,
  damage: 20,
  range: {
    min: 0,
    short: 3,
    medium: 6,
    long: 9,
  },
  requiresAmmo: true,
  ammoType: 'ammo_ac20',
};

export const AC_10: IWeapon = {
  id: 'is_ac10',
  name: 'Autocannon/10',
  type: ComponentType.WEAPON,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 12,
  criticalSlots: 7,
  cost: 200000,
  battleValue: 123,
  heat: 3,
  damage: 10,
  range: {
    min: 0,
    short: 5,
    medium: 10,
    long: 15,
  },
  requiresAmmo: true,
  ammoType: 'ammo_ac10',
};

export const AC_5: IWeapon = {
  id: 'is_ac5',
  name: 'Autocannon/5',
  type: ComponentType.WEAPON,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 8,
  criticalSlots: 4,
  cost: 125000,
  battleValue: 70,
  heat: 1,
  damage: 5,
  range: {
    min: 3,
    short: 6,
    medium: 12,
    long: 18,
  },
  requiresAmmo: true,
  ammoType: 'ammo_ac5',
};

export const AC_2: IWeapon = {
  id: 'is_ac2',
  name: 'Autocannon/2',
  type: ComponentType.WEAPON,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 6,
  criticalSlots: 1,
  cost: 75000,
  battleValue: 37,
  heat: 1,
  damage: 2,
  range: {
    min: 4,
    short: 8,
    medium: 16,
    long: 24,
  },
  requiresAmmo: true,
  ammoType: 'ammo_ac2',
};

export const MACHINE_GUN: IWeapon = {
  id: 'is_machine_gun',
  name: 'Machine Gun',
  type: ComponentType.WEAPON,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 0.5,
  criticalSlots: 1,
  cost: 5000,
  battleValue: 5,
  heat: 0,
  damage: 2,
  range: {
    min: 0,
    short: 1,
    medium: 2,
    long: 3,
  },
  requiresAmmo: true,
  ammoType: 'ammo_machine_gun',
};

export const BALLISTIC_WEAPONS = [
  AC_20,
  AC_10,
  AC_5,
  AC_2,
  MACHINE_GUN,
];

