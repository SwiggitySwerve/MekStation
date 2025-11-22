/**
 * EnergyWeapons.ts
 * Standard Inner Sphere Energy Weapons.
 */

import { IWeapon } from '../../types/Equipment';
import { ComponentType } from '../../types/ComponentType';
import { TechBase, RulesLevel } from '../../types/TechBase';

export const MEDIUM_LASER: IWeapon = {
  id: 'is_medium_laser',
  name: 'Medium Laser',
  type: ComponentType.WEAPON,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 1,
  criticalSlots: 1,
  cost: 40000,
  battleValue: 46,
  heat: 3,
  damage: 5,
  range: {
    min: 0,
    short: 3,
    medium: 6,
    long: 9,
  },
  requiresAmmo: false,
};

export const LARGE_LASER: IWeapon = {
  id: 'is_large_laser',
  name: 'Large Laser',
  type: ComponentType.WEAPON,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 5,
  criticalSlots: 2,
  cost: 100000,
  battleValue: 123,
  heat: 8,
  damage: 8,
  range: {
    min: 0,
    short: 5,
    medium: 10,
    long: 15,
  },
  requiresAmmo: false,
};

export const SMALL_LASER: IWeapon = {
  id: 'is_small_laser',
  name: 'Small Laser',
  type: ComponentType.WEAPON,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 0.5,
  criticalSlots: 1,
  cost: 11250,
  battleValue: 9,
  heat: 1,
  damage: 3,
  range: {
    min: 0,
    short: 1,
    medium: 2,
    long: 3,
  },
  requiresAmmo: false,
};

export const PPC: IWeapon = {
  id: 'is_ppc',
  name: 'PPC',
  type: ComponentType.WEAPON,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 7,
  criticalSlots: 3,
  cost: 200000,
  battleValue: 176,
  heat: 10,
  damage: 10,
  range: {
    min: 3,
    short: 6,
    medium: 12,
    long: 18,
  },
  requiresAmmo: false,
};

export const ENERGY_WEAPONS = [
  SMALL_LASER,
  MEDIUM_LASER,
  LARGE_LASER,
  PPC,
];

