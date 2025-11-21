import { Equipment } from '../types';

export const LIGHT_N_GAUSS: Equipment = {
  id: 'light_n_gauss',
  name: 'Light N-Gauss',
  category: 'Capital Weapons',
  baseType: 'Light N-Gauss',
  description: 'Light N-Gauss - Light nuclear-enhanced gauss rifle',
  requiresAmmo: true,
  introductionYear: 2440,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 700,
      crits: 70,
      damage: 50,
      heat: 18,
      minRange: 0,
      rangeShort: 17,
      rangeMedium: 34,
      rangeLong: 51,
      cost: 10000000,
      battleValue: 1300
    }
  }
};

export const MEDIUM_N_GAUSS: Equipment = {
  id: 'medium_n_gauss',
  name: 'Medium N-Gauss',
  category: 'Capital Weapons',
  baseType: 'Medium N-Gauss',
  description: 'Medium N-Gauss - Medium nuclear-enhanced gauss rifle',
  requiresAmmo: true,
  introductionYear: 2440,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 1000,
      crits: 100,
      damage: 65,
      heat: 22,
      minRange: 0,
      rangeShort: 20,
      rangeMedium: 40,
      rangeLong: 60,
      cost: 14000000,
      battleValue: 1650
    }
  }
};

export const HEAVY_N_GAUSS: Equipment = {
  id: 'heavy_n_gauss',
  name: 'Heavy N-Gauss',
  category: 'Capital Weapons',
  baseType: 'Heavy N-Gauss',
  description: 'Heavy N-Gauss - Heavy nuclear-enhanced gauss rifle',
  requiresAmmo: true,
  introductionYear: 2440,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 1300,
      crits: 130,
      damage: 80,
      heat: 27,
      minRange: 0,
      rangeShort: 23,
      rangeMedium: 46,
      rangeLong: 69,
      cost: 18000000,
      battleValue: 2000
    }
  }
}; 