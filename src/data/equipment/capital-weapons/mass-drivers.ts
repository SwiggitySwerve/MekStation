import { Equipment } from '../types';

export const LIGHT_MASS_DRIVER: Equipment = {
  id: 'light_mass_driver',
  name: 'Light Mass Driver',
  category: 'Capital Weapons',
  baseType: 'Light Mass Driver',
  description: 'Light Mass Driver - Light magnetic acceleration weapon',
  requiresAmmo: true,
  introductionYear: 2600,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 1000,
      crits: 100,
      damage: 60,
      heat: 30,
      minRange: 12,
      rangeShort: 24,
      rangeMedium: 48,
      rangeLong: 72,
      cost: 15000000,
      battleValue: 1500
    }
  }
};

export const MEDIUM_MASS_DRIVER: Equipment = {
  id: 'medium_mass_driver',
  name: 'Medium Mass Driver',
  category: 'Capital Weapons',
  baseType: 'Medium Mass Driver',
  description: 'Medium Mass Driver - Medium magnetic acceleration weapon',
  requiresAmmo: true,
  introductionYear: 2600,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 1500,
      crits: 150,
      damage: 90,
      heat: 45,
      minRange: 12,
      rangeShort: 30,
      rangeMedium: 60,
      rangeLong: 90,
      cost: 22000000,
      battleValue: 2250
    }
  }
};

export const HEAVY_MASS_DRIVER: Equipment = {
  id: 'heavy_mass_driver',
  name: 'Heavy Mass Driver',
  category: 'Capital Weapons',
  baseType: 'Heavy Mass Driver',
  description: 'Heavy Mass Driver - Heavy magnetic acceleration weapon',
  requiresAmmo: true,
  introductionYear: 2600,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 2000,
      crits: 200,
      damage: 120,
      heat: 60,
      minRange: 12,
      rangeShort: 36,
      rangeMedium: 72,
      rangeLong: 108,
      cost: 30000000,
      battleValue: 3000
    }
  }
}; 