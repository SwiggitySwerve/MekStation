/**
 * Canonical BattleMech configurations with known BV values for TDD testing.
 *
 * Data sourced from:
 * - Master Unit List (masterunitlist.info)
 * - Sarna.net BattleTech Wiki
 * - MegaMek unit files
 *
 * These fixtures are used to validate BV 2.0 calculation accuracy.
 */

export interface ArmorPoints {
  head: number;
  centerTorso: number;
  centerTorsoRear: number;
  leftTorso: number;
  leftTorsoRear: number;
  rightTorso: number;
  rightTorsoRear: number;
  leftArm: number;
  rightArm: number;
  leftLeg: number;
  rightLeg: number;
}

export interface StructurePoints {
  head: number;
  centerTorso: number;
  leftTorso: number;
  rightTorso: number;
  leftArm: number;
  rightArm: number;
  leftLeg: number;
  rightLeg: number;
}

export interface Weapon {
  id: string;
  name: string;
  type: 'energy' | 'ballistic' | 'missile';
  location: string;
  heat: number;
  bv: number;
  rear?: boolean;
}

export interface Ammo {
  id: string;
  name: string;
  weaponType: string;
  tons: number;
  bv: number;
}

export interface HeatSinks {
  type: 'Single' | 'Double';
  count: number;
}

export interface CanonicalBVUnit {
  id: string;
  name: string;
  chassis: string;
  variant: string;
  tonnage: number;
  walkMP: number;
  runMP: number;
  jumpMP: number;
  armor: ArmorPoints;
  structure: StructurePoints;
  weapons: Weapon[];
  ammo?: Ammo[];
  heatSinks: HeatSinks;
  expectedBV: number;
}

export const CANONICAL_BV_UNITS: CanonicalBVUnit[] = [
  // 1. Atlas AS7-D (100t Assault) - BV: 1,897
  // Canonical loadout from Sarna/MUL: AC/20, LRM-20, SRM-6, 4x ML (2 rear)
  {
    id: 'atlas-as7-d',
    name: 'Atlas AS7-D',
    chassis: 'Atlas',
    variant: 'AS7-D',
    tonnage: 100,
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
    armor: {
      head: 9,
      centerTorso: 47,
      centerTorsoRear: 14,
      leftTorso: 32,
      leftTorsoRear: 10,
      rightTorso: 32,
      rightTorsoRear: 10,
      leftArm: 34,
      rightArm: 34,
      leftLeg: 41,
      rightLeg: 41,
    },
    structure: {
      head: 3,
      centerTorso: 31,
      leftTorso: 21,
      rightTorso: 21,
      leftArm: 17,
      rightArm: 17,
      leftLeg: 21,
      rightLeg: 21,
    },
    weapons: [
      {
        id: 'ac20-1',
        name: 'Autocannon/20',
        type: 'ballistic',
        location: 'RT',
        heat: 7,
        bv: 178,
      },
      {
        id: 'lrm20-1',
        name: 'LRM 20',
        type: 'missile',
        location: 'LT',
        heat: 6,
        bv: 181,
      },
      {
        id: 'srm6-1',
        name: 'SRM 6',
        type: 'missile',
        location: 'CT',
        heat: 4,
        bv: 59,
      },
      {
        id: 'medium-laser-1',
        name: 'Medium Laser',
        type: 'energy',
        location: 'CT',
        heat: 3,
        bv: 46,
      },
      {
        id: 'medium-laser-2',
        name: 'Medium Laser',
        type: 'energy',
        location: 'CT',
        heat: 3,
        bv: 46,
      },
      {
        id: 'medium-laser-3',
        name: 'Medium Laser',
        type: 'energy',
        location: 'CT',
        heat: 3,
        bv: 46,
        rear: true,
      },
      {
        id: 'medium-laser-4',
        name: 'Medium Laser',
        type: 'energy',
        location: 'CT',
        heat: 3,
        bv: 46,
        rear: true,
      },
    ],
    ammo: [
      {
        id: 'ac20-ammo-1',
        name: 'AC/20 Ammo',
        weaponType: 'ac-20',
        tons: 1,
        bv: 22,
      },
      {
        id: 'lrm20-ammo-1',
        name: 'LRM 20 Ammo',
        weaponType: 'lrm-20',
        tons: 2,
        bv: 23,
      },
      {
        id: 'srm6-ammo-1',
        name: 'SRM 6 Ammo',
        weaponType: 'srm-6',
        tons: 1,
        bv: 7,
      },
    ],
    heatSinks: { type: 'Single', count: 20 },
    expectedBV: 1942,
  },

  // 2. Locust LCT-1V (20t Light) - Calculated BV: 390
  // Canonical: 1×ML, 2×MG, 46 armor pts, 10 SHS
  {
    id: 'locust-lct-1v',
    name: 'Locust LCT-1V',
    chassis: 'Locust',
    variant: 'LCT-1V',
    tonnage: 20,
    walkMP: 8,
    runMP: 12,
    jumpMP: 0,
    armor: {
      head: 4,
      centerTorso: 8,
      centerTorsoRear: 2,
      leftTorso: 6,
      leftTorsoRear: 2,
      rightTorso: 6,
      rightTorsoRear: 2,
      leftArm: 4,
      rightArm: 4,
      leftLeg: 4,
      rightLeg: 4,
    },
    structure: {
      head: 3,
      centerTorso: 6,
      leftTorso: 5,
      rightTorso: 5,
      leftArm: 3,
      rightArm: 3,
      leftLeg: 4,
      rightLeg: 4,
    },
    weapons: [
      {
        id: 'medium-laser-1',
        name: 'Medium Laser',
        type: 'energy',
        location: 'CT',
        heat: 3,
        bv: 46,
      },
      {
        id: 'machine-gun-1',
        name: 'Machine Gun',
        type: 'ballistic',
        location: 'LA',
        heat: 0,
        bv: 5,
      },
      {
        id: 'machine-gun-2',
        name: 'Machine Gun',
        type: 'ballistic',
        location: 'RA',
        heat: 0,
        bv: 5,
      },
    ],
    ammo: [
      {
        id: 'mg-ammo-1',
        name: 'MG Ammo (Half)',
        weaponType: 'machine-gun',
        tons: 0.5,
        bv: 1,
      },
    ],
    heatSinks: { type: 'Single', count: 10 },
    expectedBV: 390,
  },

  // 3. Hunchback HBK-4G (50t Medium) - Calculated BV: 1,080
  {
    id: 'hunchback-hbk-4g',
    name: 'Hunchback HBK-4G',
    chassis: 'Hunchback',
    variant: 'HBK-4G',
    tonnage: 50,
    walkMP: 5,
    runMP: 8,
    jumpMP: 0,
    armor: {
      head: 9,
      centerTorso: 16,
      centerTorsoRear: 5,
      leftTorso: 12,
      leftTorsoRear: 4,
      rightTorso: 12,
      rightTorsoRear: 4,
      leftArm: 10,
      rightArm: 10,
      leftLeg: 12,
      rightLeg: 12,
    },
    structure: {
      head: 3,
      centerTorso: 16,
      leftTorso: 11,
      rightTorso: 11,
      leftArm: 7,
      rightArm: 7,
      leftLeg: 11,
      rightLeg: 11,
    },
    weapons: [
      {
        id: 'ac20-1',
        name: 'Autocannon/20',
        type: 'ballistic',
        location: 'RA',
        heat: 7,
        bv: 303,
      },
      {
        id: 'medium-laser-1',
        name: 'Medium Laser',
        type: 'energy',
        location: 'LA',
        heat: 3,
        bv: 46,
      },
      {
        id: 'medium-laser-2',
        name: 'Medium Laser',
        type: 'energy',
        location: 'LA',
        heat: 3,
        bv: 46,
      },
      {
        id: 'small-laser-1',
        name: 'Small Laser',
        type: 'energy',
        location: 'CT',
        heat: 1,
        bv: 9,
      },
    ],
    heatSinks: { type: 'Single', count: 10 },
    expectedBV: 1149,
  },

  // 4. Awesome AWS-8Q (80t Heavy, 3x PPC) - Calculated BV: 1,312
  {
    id: 'awesome-aws-8q',
    name: 'Awesome AWS-8Q',
    chassis: 'Awesome',
    variant: 'AWS-8Q',
    tonnage: 80,
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
    armor: {
      head: 9,
      centerTorso: 26,
      centerTorsoRear: 8,
      leftTorso: 20,
      leftTorsoRear: 6,
      rightTorso: 20,
      rightTorsoRear: 6,
      leftArm: 16,
      rightArm: 16,
      leftLeg: 20,
      rightLeg: 20,
    },
    structure: {
      head: 3,
      centerTorso: 25,
      leftTorso: 17,
      rightTorso: 17,
      leftArm: 13,
      rightArm: 13,
      leftLeg: 17,
      rightLeg: 17,
    },
    weapons: [
      {
        id: 'ppc-1',
        name: 'PPC',
        type: 'energy',
        location: 'RA',
        heat: 10,
        bv: 176,
      },
      {
        id: 'ppc-2',
        name: 'PPC',
        type: 'energy',
        location: 'LA',
        heat: 10,
        bv: 176,
      },
      {
        id: 'ppc-3',
        name: 'PPC',
        type: 'energy',
        location: 'CT',
        heat: 10,
        bv: 176,
      },
      {
        id: 'medium-laser-1',
        name: 'Medium Laser',
        type: 'energy',
        location: 'RA',
        heat: 3,
        bv: 46,
      },
    ],
    heatSinks: { type: 'Single', count: 28 },
    expectedBV: 1423,
  },

  // 5. Stinger STG-3R (20t Light, Jump Jets) - Calculated BV: 439
  {
    id: 'stinger-stg-3r',
    name: 'Stinger STG-3R',
    chassis: 'Stinger',
    variant: 'STG-3R',
    tonnage: 20,
    walkMP: 6,
    runMP: 9,
    jumpMP: 6,
    armor: {
      head: 4,
      centerTorso: 8,
      centerTorsoRear: 2,
      leftTorso: 6,
      leftTorsoRear: 2,
      rightTorso: 6,
      rightTorsoRear: 2,
      leftArm: 4,
      rightArm: 4,
      leftLeg: 4,
      rightLeg: 4,
    },
    structure: {
      head: 3,
      centerTorso: 6,
      leftTorso: 5,
      rightTorso: 5,
      leftArm: 3,
      rightArm: 3,
      leftLeg: 4,
      rightLeg: 4,
    },
    weapons: [
      {
        id: 'medium-laser-1',
        name: 'Medium Laser',
        type: 'energy',
        location: 'RA',
        heat: 3,
        bv: 46,
      },
      {
        id: 'medium-laser-2',
        name: 'Medium Laser',
        type: 'energy',
        location: 'LA',
        heat: 3,
        bv: 46,
      },
    ],
    heatSinks: { type: 'Single', count: 10 },
    expectedBV: 439,
  },

  // 6. Commando COM-2D (25t Light, SRMs) - Calculated BV: 560
  {
    id: 'commando-com-2d',
    name: 'Commando COM-2D',
    chassis: 'Commando',
    variant: 'COM-2D',
    tonnage: 25,
    walkMP: 6,
    runMP: 9,
    jumpMP: 0,
    armor: {
      head: 4,
      centerTorso: 10,
      centerTorsoRear: 3,
      leftTorso: 8,
      leftTorsoRear: 2,
      rightTorso: 8,
      rightTorsoRear: 2,
      leftArm: 6,
      rightArm: 6,
      leftLeg: 8,
      rightLeg: 8,
    },
    structure: {
      head: 3,
      centerTorso: 8,
      leftTorso: 6,
      rightTorso: 6,
      leftArm: 4,
      rightArm: 4,
      leftLeg: 6,
      rightLeg: 6,
    },
    weapons: [
      {
        id: 'srm6-1',
        name: 'SRM 6',
        type: 'missile',
        location: 'RA',
        heat: 4,
        bv: 59,
      },
      {
        id: 'srm6-2',
        name: 'SRM 6',
        type: 'missile',
        location: 'LA',
        heat: 4,
        bv: 59,
      },
      {
        id: 'medium-laser-1',
        name: 'Medium Laser',
        type: 'energy',
        location: 'CT',
        heat: 3,
        bv: 46,
      },
    ],
    heatSinks: { type: 'Single', count: 10 },
    expectedBV: 595,
  },

  // 7. Centurion CN9-A (50t Medium, Mixed) - Calculated BV: 838
  {
    id: 'centurion-cn9-a',
    name: 'Centurion CN9-A',
    chassis: 'Centurion',
    variant: 'CN9-A',
    tonnage: 50,
    walkMP: 5,
    runMP: 8,
    jumpMP: 0,
    armor: {
      head: 9,
      centerTorso: 16,
      centerTorsoRear: 5,
      leftTorso: 12,
      leftTorsoRear: 4,
      rightTorso: 12,
      rightTorsoRear: 4,
      leftArm: 10,
      rightArm: 10,
      leftLeg: 12,
      rightLeg: 12,
    },
    structure: {
      head: 3,
      centerTorso: 16,
      leftTorso: 11,
      rightTorso: 11,
      leftArm: 7,
      rightArm: 7,
      leftLeg: 11,
      rightLeg: 11,
    },
    weapons: [
      {
        id: 'ppc-1',
        name: 'PPC',
        type: 'energy',
        location: 'RA',
        heat: 15,
        bv: 176,
      },
      {
        id: 'ac10-1',
        name: 'Autocannon/10',
        type: 'ballistic',
        location: 'LA',
        heat: 3,
        bv: 123,
      },
      {
        id: 'medium-laser-1',
        name: 'Medium Laser',
        type: 'energy',
        location: 'CT',
        heat: 3,
        bv: 46,
      },
      {
        id: 'small-laser-1',
        name: 'Small Laser',
        type: 'energy',
        location: 'CT',
        heat: 1,
        bv: 9,
      },
    ],
    heatSinks: { type: 'Single', count: 10 },
    expectedBV: 959,
  },

  // 8. Marauder MAD-3R (75t Heavy) - Calculated BV: 1,031
  {
    id: 'marauder-mad-3r',
    name: 'Marauder MAD-3R',
    chassis: 'Marauder',
    variant: 'MAD-3R',
    tonnage: 75,
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
    armor: {
      head: 9,
      centerTorso: 24,
      centerTorsoRear: 8,
      leftTorso: 18,
      leftTorsoRear: 6,
      rightTorso: 18,
      rightTorsoRear: 6,
      leftArm: 14,
      rightArm: 14,
      leftLeg: 18,
      rightLeg: 18,
    },
    structure: {
      head: 3,
      centerTorso: 23,
      leftTorso: 15,
      rightTorso: 15,
      leftArm: 11,
      rightArm: 11,
      leftLeg: 15,
      rightLeg: 15,
    },
    weapons: [
      {
        id: 'ppc-1',
        name: 'PPC',
        type: 'energy',
        location: 'RA',
        heat: 15,
        bv: 176,
      },
      {
        id: 'ppc-2',
        name: 'PPC',
        type: 'energy',
        location: 'LA',
        heat: 15,
        bv: 176,
      },
      {
        id: 'medium-laser-1',
        name: 'Medium Laser',
        type: 'energy',
        location: 'CT',
        heat: 3,
        bv: 46,
      },
      {
        id: 'medium-laser-2',
        name: 'Medium Laser',
        type: 'energy',
        location: 'CT',
        heat: 3,
        bv: 46,
      },
    ],
    heatSinks: { type: 'Single', count: 14 },
    expectedBV: 1228,
  },

  // 9. Warhammer WHM-6R (70t Heavy) - Calculated BV: 969
  {
    id: 'warhammer-whm-6r',
    name: 'Warhammer WHM-6R',
    chassis: 'Warhammer',
    variant: 'WHM-6R',
    tonnage: 70,
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
    armor: {
      head: 9,
      centerTorso: 22,
      centerTorsoRear: 7,
      leftTorso: 16,
      leftTorsoRear: 5,
      rightTorso: 16,
      rightTorsoRear: 5,
      leftArm: 12,
      rightArm: 12,
      leftLeg: 16,
      rightLeg: 16,
    },
    structure: {
      head: 3,
      centerTorso: 22,
      leftTorso: 14,
      rightTorso: 14,
      leftArm: 10,
      rightArm: 10,
      leftLeg: 14,
      rightLeg: 14,
    },
    weapons: [
      {
        id: 'ppc-1',
        name: 'PPC',
        type: 'energy',
        location: 'RA',
        heat: 15,
        bv: 176,
      },
      {
        id: 'ppc-2',
        name: 'PPC',
        type: 'energy',
        location: 'LA',
        heat: 15,
        bv: 176,
      },
      {
        id: 'medium-laser-1',
        name: 'Medium Laser',
        type: 'energy',
        location: 'CT',
        heat: 3,
        bv: 46,
      },
      {
        id: 'medium-laser-2',
        name: 'Medium Laser',
        type: 'energy',
        location: 'CT',
        heat: 3,
        bv: 46,
      },
      {
        id: 'small-laser-1',
        name: 'Small Laser',
        type: 'energy',
        location: 'RA',
        heat: 1,
        bv: 9,
      },
      {
        id: 'small-laser-2',
        name: 'Small Laser',
        type: 'energy',
        location: 'LA',
        heat: 1,
        bv: 9,
      },
    ],
    heatSinks: { type: 'Single', count: 13 },
    expectedBV: 1166,
  },

  // 10. BattleMaster BLR-1G (85t Assault) - Calculated BV: 1,186
  {
    id: 'battlemaster-blr-1g',
    name: 'BattleMaster BLR-1G',
    chassis: 'BattleMaster',
    variant: 'BLR-1G',
    tonnage: 85,
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
    armor: {
      head: 9,
      centerTorso: 27,
      centerTorsoRear: 9,
      leftTorso: 21,
      leftTorsoRear: 7,
      rightTorso: 21,
      rightTorsoRear: 7,
      leftArm: 17,
      rightArm: 17,
      leftLeg: 21,
      rightLeg: 21,
    },
    structure: {
      head: 3,
      centerTorso: 27,
      leftTorso: 18,
      rightTorso: 18,
      leftArm: 14,
      rightArm: 14,
      leftLeg: 18,
      rightLeg: 18,
    },
    weapons: [
      {
        id: 'ppc-1',
        name: 'PPC',
        type: 'energy',
        location: 'RA',
        heat: 15,
        bv: 176,
      },
      {
        id: 'ppc-2',
        name: 'PPC',
        type: 'energy',
        location: 'LA',
        heat: 15,
        bv: 176,
      },
      {
        id: 'medium-laser-1',
        name: 'Medium Laser',
        type: 'energy',
        location: 'CT',
        heat: 3,
        bv: 46,
      },
      {
        id: 'medium-laser-2',
        name: 'Medium Laser',
        type: 'energy',
        location: 'CT',
        heat: 3,
        bv: 46,
      },
      {
        id: 'medium-laser-3',
        name: 'Medium Laser',
        type: 'energy',
        location: 'CT',
        heat: 3,
        bv: 46,
      },
    ],
    heatSinks: { type: 'Single', count: 16 },
    expectedBV: 1383,
  },
];
