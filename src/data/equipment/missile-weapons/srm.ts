import { Equipment } from '../types';

export const IMPROVED_SRM_6: Equipment = {
  id: 'improved_srm_6',
  name: 'Improved SRM 6',
  category: 'Missile Weapons',
  baseType: 'Improved SRM 6',
  description: 'Improved SRM 6 - Star League era enhanced short-range missile system',
  requiresAmmo: true,
  introductionYear: 2824,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TRO 3058',
  pageReference: '45',
  variants: {
    IS: {
      weight: 3,
      crits: 2,
      damage: 12,
      heat: 4,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 95000,
      battleValue: 71
    }
  }
};

export const SRM_2: Equipment = {
  id: 'srm_2',
  name: 'SRM 2',
  category: 'Missile Weapons',
  baseType: 'SRM 2',
  description: 'Short Range Missile 2-pack - Light direct fire support weapon',
  requiresAmmo: true,
  introductionYear: 2462,
  rulesLevel: 'Standard',
  techRating: 'C',
  sourceBook: 'TM',
  pageReference: '229',
  variants: {
    Clan: {
      weight: 0.5,
      crits: 1,
      damage: 4,
      heat: 2,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 10000,
      battleValue: 21
    },
    IS: {
      weight: 1,
      crits: 1,
      damage: 4,
      heat: 2,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 10000,
      battleValue: 21
    }
  }
};

export const SRM_4: Equipment = {
  id: 'srm_4',
  name: 'SRM 4',
  category: 'Missile Weapons',
  baseType: 'SRM 4',
  description: 'Short Range Missile 4-pack - Standard direct fire support weapon',
  requiresAmmo: true,
  introductionYear: 2442,
  rulesLevel: 'Standard',
  techRating: 'C',
  sourceBook: 'TM',
  pageReference: '229',
  variants: {
    Clan: {
      weight: 1,
      crits: 1,
      damage: 8,
      heat: 3,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 60000,
      battleValue: 39
    },
    IS: {
      weight: 2,
      crits: 1,
      damage: 8,
      heat: 3,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 60000,
      battleValue: 39
    }
  }
};

export const SRM_6: Equipment = {
  id: 'srm_6',
  name: 'SRM 6',
  category: 'Missile Weapons',
  baseType: 'SRM 6',
  description: 'Short Range Missile 6-pack - Heavy direct fire support weapon',
  requiresAmmo: true,
  introductionYear: 2460,
  rulesLevel: 'Standard',
  techRating: 'C',
  sourceBook: 'TM',
  pageReference: '229',
  variants: {
    Clan: {
      weight: 1.5,
      crits: 1,
      damage: 12,
      heat: 4,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 80000,
      battleValue: 59
    },
    IS: {
      weight: 3,
      crits: 2,
      damage: 12,
      heat: 4,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 80000,
      battleValue: 59
    }
  }
}; 