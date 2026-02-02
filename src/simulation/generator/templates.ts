import { IUnitTemplate, IWeaponTemplate } from './types';

const MEDIUM_LASER: IWeaponTemplate = {
  name: 'Medium Laser',
  shortRange: 3,
  mediumRange: 6,
  longRange: 9,
  damage: 5,
  heat: 3,
  minRange: 0,
  ammoPerTon: -1,
};

const LARGE_LASER: IWeaponTemplate = {
  name: 'Large Laser',
  shortRange: 5,
  mediumRange: 10,
  longRange: 15,
  damage: 8,
  heat: 8,
  minRange: 0,
  ammoPerTon: -1,
};

const AC10: IWeaponTemplate = {
  name: 'AC/10',
  shortRange: 5,
  mediumRange: 10,
  longRange: 15,
  damage: 10,
  heat: 3,
  minRange: 0,
  ammoPerTon: 10,
};

const SRM6: IWeaponTemplate = {
  name: 'SRM 6',
  shortRange: 3,
  mediumRange: 6,
  longRange: 9,
  damage: 2,
  heat: 4,
  minRange: 0,
  ammoPerTon: 15,
};

const LIGHT_MECH: IUnitTemplate = {
  name: 'Light Mech',
  tonnage: 25,
  walkMP: 6,
  jumpMP: 4,
  armor: {
    head: 6,
    center_torso: 12,
    left_torso: 8,
    right_torso: 8,
    left_arm: 6,
    right_arm: 6,
    left_leg: 8,
    right_leg: 8,
    center_torso_rear: 4,
    left_torso_rear: 3,
    right_torso_rear: 3,
  },
  structure: {
    head: 3,
    center_torso: 8,
    left_torso: 6,
    right_torso: 6,
    left_arm: 4,
    right_arm: 4,
    left_leg: 6,
    right_leg: 6,
  },
  weapons: [MEDIUM_LASER, MEDIUM_LASER],
};

const MEDIUM_MECH: IUnitTemplate = {
  name: 'Medium Mech',
  tonnage: 50,
  walkMP: 5,
  jumpMP: 0,
  armor: {
    head: 9,
    center_torso: 22,
    left_torso: 16,
    right_torso: 16,
    left_arm: 12,
    right_arm: 12,
    left_leg: 16,
    right_leg: 16,
    center_torso_rear: 6,
    left_torso_rear: 5,
    right_torso_rear: 5,
  },
  structure: {
    head: 3,
    center_torso: 16,
    left_torso: 12,
    right_torso: 12,
    left_arm: 8,
    right_arm: 8,
    left_leg: 12,
    right_leg: 12,
  },
  weapons: [MEDIUM_LASER, MEDIUM_LASER, LARGE_LASER],
};

const HEAVY_MECH: IUnitTemplate = {
  name: 'Heavy Mech',
  tonnage: 75,
  walkMP: 4,
  jumpMP: 0,
  armor: {
    head: 9,
    center_torso: 31,
    left_torso: 22,
    right_torso: 22,
    left_arm: 17,
    right_arm: 17,
    left_leg: 21,
    right_leg: 21,
    center_torso_rear: 10,
    left_torso_rear: 8,
    right_torso_rear: 8,
  },
  structure: {
    head: 3,
    center_torso: 23,
    left_torso: 17,
    right_torso: 17,
    left_arm: 12,
    right_arm: 12,
    left_leg: 17,
    right_leg: 17,
  },
  weapons: [AC10, LARGE_LASER, MEDIUM_LASER, MEDIUM_LASER],
};

const ASSAULT_MECH: IUnitTemplate = {
  name: 'Assault Mech',
  tonnage: 100,
  walkMP: 3,
  jumpMP: 0,
  armor: {
    head: 9,
    center_torso: 47,
    left_torso: 32,
    right_torso: 32,
    left_arm: 24,
    right_arm: 24,
    left_leg: 33,
    right_leg: 33,
    center_torso_rear: 14,
    left_torso_rear: 10,
    right_torso_rear: 10,
  },
  structure: {
    head: 3,
    center_torso: 31,
    left_torso: 21,
    right_torso: 21,
    left_arm: 17,
    right_arm: 17,
    left_leg: 21,
    right_leg: 21,
  },
  weapons: [AC10, AC10, LARGE_LASER, LARGE_LASER, SRM6],
};

export const UNIT_TEMPLATES: readonly IUnitTemplate[] = [
  LIGHT_MECH,
  MEDIUM_MECH,
  HEAVY_MECH,
  ASSAULT_MECH,
];

export { LIGHT_MECH, MEDIUM_MECH, HEAVY_MECH, ASSAULT_MECH };
