import { Equipment } from '../types';

// MML (Multi-Missile Launcher)
export const MML_3: Equipment = {
  id: 'mml_3',
  name: 'MML-3',
  category: 'Missile Weapons',
  baseType: 'MML-3',
  description: 'Multi-Missile Launcher 3 - Dual-mode SRM/LRM launcher',
  requiresAmmo: true,
  introductionYear: 3067,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 1.5,
      crits: 2,
      damage: 6,
      heat: 2,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 7,
      rangeLong: 12,
      cost: 45000,
      battleValue: 29
    }
  }
};

export const MML_5: Equipment = {
  id: 'mml_5',
  name: 'MML-5',
  category: 'Missile Weapons',
  baseType: 'MML-5',
  description: 'Multi-Missile Launcher 5 - Dual-mode SRM/LRM launcher',
  requiresAmmo: true,
  introductionYear: 3067,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 3,
      crits: 3,
      damage: 10,
      heat: 2,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 7,
      rangeLong: 12,
      cost: 75000,
      battleValue: 45
    }
  }
};

export const MML_7: Equipment = {
  id: 'mml_7',
  name: 'MML-7',
  category: 'Missile Weapons',
  baseType: 'MML-7',
  description: 'Multi-Missile Launcher 7 - Dual-mode SRM/LRM launcher',
  requiresAmmo: true,
  introductionYear: 3067,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 4.5,
      crits: 4,
      damage: 14,
      heat: 4,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 7,
      rangeLong: 12,
      cost: 105000,
      battleValue: 67
    }
  }
};

export const MML_9: Equipment = {
  id: 'mml_9',
  name: 'MML-9',
  category: 'Missile Weapons',
  baseType: 'MML-9',
  description: 'Multi-Missile Launcher 9 - Dual-mode SRM/LRM launcher',
  requiresAmmo: true,
  introductionYear: 3067,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 6,
      crits: 5,
      damage: 18,
      heat: 5,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 7,
      rangeLong: 12,
      cost: 125000,
      battleValue: 86
    }
  }
}; 