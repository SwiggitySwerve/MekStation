import { Equipment } from '../types';

export const LIGHT_SUB_CAPITAL_CANNON: Equipment = {
  id: 'light_sub_capital_cannon',
  name: 'Light Sub-Capital Cannon',
  category: 'Capital Weapons',
  baseType: 'Light Sub-Capital Cannon',
  description: 'Light Sub-Capital Cannon - Light ballistic capital weapon',
  requiresAmmo: true,
  introductionYear: 2350,
  rulesLevel: 'Standard',
  techRating: 'D',
  variants: {
    IS: {
      weight: 300,
      crits: 30,
      damage: 20,
      heat: 8,
      minRange: 0,
      rangeShort: 11,
      rangeMedium: 22,
      rangeLong: 33,
      cost: 3000000,
      battleValue: 400
    }
  }
};

export const MEDIUM_SUB_CAPITAL_CANNON: Equipment = {
  id: 'medium_sub_capital_cannon',
  name: 'Medium Sub-Capital Cannon',
  category: 'Capital Weapons',
  baseType: 'Medium Sub-Capital Cannon',
  description: 'Medium Sub-Capital Cannon - Medium ballistic capital weapon',
  requiresAmmo: true,
  introductionYear: 2350,
  rulesLevel: 'Standard',
  techRating: 'D',
  variants: {
    IS: {
      weight: 450,
      crits: 45,
      damage: 25,
      heat: 10,
      minRange: 0,
      rangeShort: 12,
      rangeMedium: 24,
      rangeLong: 36,
      cost: 4500000,
      battleValue: 500
    }
  }
};

export const HEAVY_SUB_CAPITAL_CANNON: Equipment = {
  id: 'heavy_sub_capital_cannon',
  name: 'Heavy Sub-Capital Cannon',
  category: 'Capital Weapons',
  baseType: 'Heavy Sub-Capital Cannon',
  description: 'Heavy Sub-Capital Cannon - Heavy ballistic capital weapon',
  requiresAmmo: true,
  introductionYear: 2350,
  rulesLevel: 'Standard',
  techRating: 'D',
  variants: {
    IS: {
      weight: 600,
      crits: 60,
      damage: 30,
      heat: 12,
      minRange: 0,
      rangeShort: 13,
      rangeMedium: 26,
      rangeLong: 39,
      cost: 6000000,
      battleValue: 600
    }
  }
};

export const LIGHT_SUB_CAPITAL_LASER: Equipment = {
  id: 'light_sub_capital_laser',
  name: 'Light Sub-Capital Laser',
  category: 'Capital Weapons',
  baseType: 'Light Sub-Capital Laser',
  description: 'Light Sub-Capital Laser - Light energy capital weapon',
  requiresAmmo: false,
  introductionYear: 2350,
  rulesLevel: 'Standard',
  techRating: 'D',
  variants: {
    IS: {
      weight: 200,
      crits: 20,
      damage: 15,
      heat: 15,
      minRange: 0,
      rangeShort: 11,
      rangeMedium: 22,
      rangeLong: 33,
      cost: 2000000,
      battleValue: 300
    }
  }
};

export const MEDIUM_SUB_CAPITAL_LASER: Equipment = {
  id: 'medium_sub_capital_laser',
  name: 'Medium Sub-Capital Laser',
  category: 'Capital Weapons',
  baseType: 'Medium Sub-Capital Laser',
  description: 'Medium Sub-Capital Laser - Medium energy capital weapon',
  requiresAmmo: false,
  introductionYear: 2350,
  rulesLevel: 'Standard',
  techRating: 'D',
  variants: {
    IS: {
      weight: 300,
      crits: 30,
      damage: 20,
      heat: 20,
      minRange: 0,
      rangeShort: 12,
      rangeMedium: 24,
      rangeLong: 36,
      cost: 3000000,
      battleValue: 400
    }
  }
};

export const HEAVY_SUB_CAPITAL_LASER: Equipment = {
  id: 'heavy_sub_capital_laser',
  name: 'Heavy Sub-Capital Laser',
  category: 'Capital Weapons',
  baseType: 'Heavy Sub-Capital Laser',
  description: 'Heavy Sub-Capital Laser - Heavy energy capital weapon',
  requiresAmmo: false,
  introductionYear: 2350,
  rulesLevel: 'Standard',
  techRating: 'D',
  variants: {
    IS: {
      weight: 400,
      crits: 40,
      damage: 25,
      heat: 25,
      minRange: 0,
      rangeShort: 13,
      rangeMedium: 26,
      rangeLong: 39,
      cost: 4000000,
      battleValue: 500
    }
  }
}; 