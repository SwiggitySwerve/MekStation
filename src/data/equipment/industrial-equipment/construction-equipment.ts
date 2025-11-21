import { Equipment } from '../types';

// Backhoe
export const BACKHOE: Equipment = {
  id: 'backhoe',
  name: 'Backhoe',
  category: 'Industrial Equipment',
  baseType: 'Backhoe',
  description: 'Excavation equipment for construction and mining operations',
  requiresAmmo: false,
  introductionYear: 2000,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 5,
      crits: 6,
      damage: 6,
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 50000,
      battleValue: 10
    }
  },
  special: ['Industrial Tool', 'Melee Weapon', 'Construction Equipment']
};

// Bulldozer
export const BULLDOZER: Equipment = {
  id: 'bulldozer',
  name: 'Bulldozer',
  category: 'Industrial Equipment',
  baseType: 'Bulldozer',
  description: 'Heavy earth-moving equipment with pushing blade',
  requiresAmmo: false,
  introductionYear: 2000,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 10,
      crits: 8,
      damage: 5,
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 100000,
      battleValue: 12
    }
  },
  special: ['Industrial Tool', 'Pushing Weapon', 'Earth Moving']
};

// Chainsaw
export const CHAINSAW: Equipment = {
  id: 'chainsaw',
  name: 'Chainsaw',
  category: 'Industrial Equipment',
  baseType: 'Chainsaw',
  description: 'Motorized cutting tool for forestry operations',
  requiresAmmo: false,
  introductionYear: 2000,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 1,
      crits: 2,
      damage: 2,
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 100000,
      battleValue: 4
    }
  },
  special: ['Industrial Tool', 'Cutting Tool', 'Motorized']
};

// Dual Saw
export const DUAL_SAW: Equipment = {
  id: 'dual_saw',
  name: 'Dual Saw',
  category: 'Industrial Equipment',
  baseType: 'Dual Saw',
  description: 'Double-bladed cutting equipment for heavy duty operations',
  requiresAmmo: false,
  introductionYear: 2000,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 3,
      crits: 3,
      damage: 3,
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 150000,
      battleValue: 7
    }
  },
  special: ['Industrial Tool', 'Cutting Tool', 'Dual Blade']
};

// Mining Drill
export const MINING_DRILL: Equipment = {
  id: 'mining_drill',
  name: 'Mining Drill',
  category: 'Industrial Equipment',
  baseType: 'Mining Drill',
  description: 'Heavy-duty drilling equipment for mining operations',
  requiresAmmo: false,
  introductionYear: 2000,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 7,
      crits: 7,
      damage: 7,
      heat: 3,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 100000,
      battleValue: 17
    }
  },
  special: ['Industrial Tool', 'Drilling Equipment', 'Mining Tool']
};

// Pile Driver
export const PILE_DRIVER: Equipment = {
  id: 'pile_driver',
  name: 'Pile Driver',
  category: 'Industrial Equipment',
  baseType: 'Pile Driver',
  description: 'Heavy construction equipment for driving support piles',
  requiresAmmo: false,
  introductionYear: 2000,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 10,
      crits: 8,
      damage: 10,
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 100000,
      battleValue: 20
    }
  },
  special: ['Industrial Tool', 'Pile Driving', 'Construction Equipment']
};

// Wrecking Ball
export const WRECKING_BALL: Equipment = {
  id: 'wrecking_ball',
  name: 'Wrecking Ball',
  category: 'Industrial Equipment',
  baseType: 'Wrecking Ball',
  description: 'Heavy demolition equipment for destroying structures',
  requiresAmmo: false,
  introductionYear: 2000,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 8,
      crits: 8,
      damage: 10,
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 80000,
      battleValue: 18
    }
  },
  special: ['Industrial Tool', 'Demolition Equipment', 'Swinging Weapon']
}; 