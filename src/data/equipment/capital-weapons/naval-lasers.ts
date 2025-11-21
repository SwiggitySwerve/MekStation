import { Equipment } from '../types';

export const NAVAL_LASER_35: Equipment = {
  id: 'naval_laser_35',
  name: 'Naval Laser 35',
  category: 'Capital Weapons',
  baseType: 'Naval Laser 35',
  description: 'Naval Laser 35 - Light capital-class laser weapon',
  requiresAmmo: false,
  introductionYear: 2300,
  rulesLevel: 'Standard',
  techRating: 'D',
  variants: {
    IS: {
      weight: 600,
      crits: 60,
      damage: 35,
      heat: 35,
      minRange: 0,
      rangeShort: 11,
      rangeMedium: 22,
      rangeLong: 33,
      cost: 6000000,
      battleValue: 900
    }
  }
};

export const NAVAL_LASER_45: Equipment = {
  id: 'naval_laser_45',
  name: 'Naval Laser 45',
  category: 'Capital Weapons',
  baseType: 'Naval Laser 45',
  description: 'Naval Laser 45 - Medium capital-class laser weapon',
  requiresAmmo: false,
  introductionYear: 2300,
  rulesLevel: 'Standard',
  techRating: 'D',
  variants: {
    IS: {
      weight: 800,
      crits: 80,
      damage: 45,
      heat: 45,
      minRange: 0,
      rangeShort: 13,
      rangeMedium: 26,
      rangeLong: 39,
      cost: 8000000,
      battleValue: 1150
    }
  }
};

export const NAVAL_LASER_55: Equipment = {
  id: 'naval_laser_55',
  name: 'Naval Laser 55',
  category: 'Capital Weapons',
  baseType: 'Naval Laser 55',
  description: 'Naval Laser 55 - Heavy capital-class laser weapon',
  requiresAmmo: false,
  introductionYear: 2300,
  rulesLevel: 'Standard',
  techRating: 'D',
  variants: {
    IS: {
      weight: 1000,
      crits: 100,
      damage: 55,
      heat: 55,
      minRange: 0,
      rangeShort: 15,
      rangeMedium: 30,
      rangeLong: 45,
      cost: 10000000,
      battleValue: 1400
    }
  }
}; 