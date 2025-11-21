import { Equipment } from '../types';

// Thunderbolt Missiles
export const THUNDERBOLT_5: Equipment = {
  id: 'thunderbolt_5',
  name: 'Thunderbolt 5',
  category: 'Missile Weapons',
  baseType: 'Thunderbolt 5',
  description: 'Thunderbolt 5 - Heavy single-shot missile',
  requiresAmmo: true,
  introductionYear: 3052,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 3,
      crits: 1,
      damage: 5,
      heat: 3,
      minRange: 5,
      rangeShort: 6,
      rangeMedium: 12,
      rangeLong: 18,
      cost: 50000,
      battleValue: 64
    }
  }
};

export const THUNDERBOLT_10: Equipment = {
  id: 'thunderbolt_10',
  name: 'Thunderbolt 10',
  category: 'Missile Weapons',
  baseType: 'Thunderbolt 10',
  description: 'Thunderbolt 10 - Heavy single-shot missile',
  requiresAmmo: true,
  introductionYear: 3052,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 7,
      crits: 2,
      damage: 10,
      heat: 5,
      minRange: 5,
      rangeShort: 6,
      rangeMedium: 12,
      rangeLong: 18,
      cost: 175000,
      battleValue: 127
    }
  }
};

export const THUNDERBOLT_15: Equipment = {
  id: 'thunderbolt_15',
  name: 'Thunderbolt 15',
  category: 'Missile Weapons',
  baseType: 'Thunderbolt 15',
  description: 'Thunderbolt 15 - Heavy single-shot missile',
  requiresAmmo: true,
  introductionYear: 3052,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 11,
      crits: 3,
      damage: 15,
      heat: 7,
      minRange: 5,
      rangeShort: 6,
      rangeMedium: 12,
      rangeLong: 18,
      cost: 325000,
      battleValue: 229
    }
  }
};

export const THUNDERBOLT_20: Equipment = {
  id: 'thunderbolt_20',
  name: 'Thunderbolt 20',
  category: 'Missile Weapons',
  baseType: 'Thunderbolt 20',
  description: 'Thunderbolt 20 - Heavy single-shot missile',
  requiresAmmo: true,
  introductionYear: 3052,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 15,
      crits: 5,
      damage: 20,
      heat: 8,
      minRange: 5,
      rangeShort: 6,
      rangeMedium: 12,
      rangeLong: 18,
      cost: 450000,
      battleValue: 305
    }
  }
}; 