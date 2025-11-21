import { Equipment } from '../types';

// MRM (Medium Range Missiles)
export const MRM_10: Equipment = {
  id: 'mrm_10',
  name: 'MRM 10',
  category: 'Missile Weapons',
  baseType: 'MRM 10',
  description: 'Medium Range Missile 10',
  requiresAmmo: true,
  introductionYear: 3052,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 3,
      crits: 2,
      damage: 10,
      heat: 4,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 8,
      rangeLong: 15,
      cost: 50000,
      battleValue: 56
    }
  }
};

export const MRM_20: Equipment = {
  id: 'mrm_20',
  name: 'MRM 20',
  category: 'Missile Weapons',
  baseType: 'MRM 20',
  description: 'Medium Range Missile 20',
  requiresAmmo: true,
  introductionYear: 3052,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 7,
      crits: 3,
      damage: 20,
      heat: 6,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 8,
      rangeLong: 15,
      cost: 125000,
      battleValue: 112
    }
  }
};

export const MRM_30: Equipment = {
  id: 'mrm_30',
  name: 'MRM 30',
  category: 'Missile Weapons',
  baseType: 'MRM 30',
  description: 'Medium Range Missile 30',
  requiresAmmo: true,
  introductionYear: 3052,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 10,
      crits: 5,
      damage: 30,
      heat: 10,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 8,
      rangeLong: 15,
      cost: 225000,
      battleValue: 168
    }
  }
};

export const MRM_40: Equipment = {
  id: 'mrm_40',
  name: 'MRM 40',
  category: 'Missile Weapons',
  baseType: 'MRM 40',
  description: 'Medium Range Missile 40',
  requiresAmmo: true,
  introductionYear: 3052,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 12,
      crits: 7,
      damage: 40,
      heat: 12,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 8,
      rangeLong: 15,
      cost: 350000,
      battleValue: 224
    }
  }
}; 