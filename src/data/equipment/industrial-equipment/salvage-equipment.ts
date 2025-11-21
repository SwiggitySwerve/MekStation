import { Equipment } from '../types';

// Salvage Arm
export const SALVAGE_ARM: Equipment = {
  id: 'salvage_arm',
  name: 'Salvage Arm',
  category: 'Industrial Equipment',
  baseType: 'Salvage Arm',
  description: 'Specialized equipment for salvage and recovery operations',
  requiresAmmo: false,
  introductionYear: 2300,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 3,
      crits: 7,
      damage: 0,
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 50000,
      battleValue: 0
    }
  },
  special: ['Industrial Tool', 'Salvage Equipment', 'Non-Combat']
};

// Lift Hoist
export const LIFT_HOIST: Equipment = {
  id: 'lift_hoist',
  name: 'Lift Hoist',
  category: 'Industrial Equipment',
  baseType: 'Lift Hoist',
  description: 'Heavy lifting equipment for construction operations',
  requiresAmmo: false,
  introductionYear: 2000,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 3,
      crits: 3,
      damage: 0,
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 50000,
      battleValue: 0
    }
  },
  special: ['Industrial Tool', 'Lifting Equipment', 'Non-Combat']
};

// Spot Welder
export const SPOT_WELDER: Equipment = {
  id: 'spot_welder',
  name: 'Spot Welder',
  category: 'Industrial Equipment',
  baseType: 'Spot Welder',
  description: 'Precision welding equipment for metal fabrication',
  requiresAmmo: false,
  introductionYear: 2000,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 2,
      crits: 2,
      damage: 5,
      heat: 2,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 75000,
      battleValue: 5
    }
  },
  special: ['Industrial Tool', 'Welding Equipment', 'Heat Weapon']
}; 