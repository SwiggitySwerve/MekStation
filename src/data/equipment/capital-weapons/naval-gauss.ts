import { Equipment } from '../types';

export const LIGHT_NAVAL_GAUSS: Equipment = {
  id: 'light_naval_gauss',
  name: 'Light Naval Gauss',
  category: 'Capital Weapons',
  baseType: 'Light Naval Gauss',
  description: 'Light Naval Gauss Rifle - Light capital-class gauss weapon',
  requiresAmmo: true,
  introductionYear: 2440,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 600,
      crits: 60,
      damage: 45,
      heat: 15,
      minRange: 0,
      rangeShort: 17,
      rangeMedium: 34,
      rangeLong: 51,
      cost: 8000000,
      battleValue: 1100
    }
  }
};

export const MEDIUM_NAVAL_GAUSS: Equipment = {
  id: 'medium_naval_gauss',
  name: 'Medium Naval Gauss',
  category: 'Capital Weapons',
  baseType: 'Medium Naval Gauss',
  description: 'Medium Naval Gauss Rifle - Medium capital-class gauss weapon',
  requiresAmmo: true,
  introductionYear: 2440,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 900,
      crits: 90,
      damage: 60,
      heat: 20,
      minRange: 0,
      rangeShort: 20,
      rangeMedium: 40,
      rangeLong: 60,
      cost: 12000000,
      battleValue: 1450
    }
  }
};

export const HEAVY_NAVAL_GAUSS: Equipment = {
  id: 'heavy_naval_gauss',
  name: 'Heavy Naval Gauss',
  category: 'Capital Weapons',
  baseType: 'Heavy Naval Gauss',
  description: 'Heavy Naval Gauss Rifle - Heavy capital-class gauss weapon',
  requiresAmmo: true,
  introductionYear: 2440,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 1200,
      crits: 120,
      damage: 75,
      heat: 25,
      minRange: 0,
      rangeShort: 23,
      rangeMedium: 46,
      rangeLong: 69,
      cost: 15000000,
      battleValue: 1800
    }
  }
}; 