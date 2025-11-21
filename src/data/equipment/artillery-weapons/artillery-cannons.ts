import { Equipment } from '../types';

export const LONG_TOM_CANNON: Equipment = {
  id: 'long_tom_cannon',
  name: 'Long Tom Cannon',
  category: 'Artillery Weapons',
  baseType: 'Long Tom Cannon',
  description: 'Long Tom Cannon - Vehicle-mounted artillery variant',
  requiresAmmo: true,
  introductionYear: 2465,
  rulesLevel: 'Standard',
  techRating: 'B',
  sourceBook: 'TM',
  pageReference: '230',
  variants: {
    IS: {
      weight: 30,
      crits: 15,
      damage: 25,
      heat: 20,
      minRange: 30,
      rangeShort: 30,
      rangeMedium: 60,
      rangeLong: 90,
      rangeExtreme: 120,
      cost: 750000,
      battleValue: 295
    }
  }
};

export const SNIPER_ARTILLERY_CANNON: Equipment = {
  id: 'sniper_artillery_cannon',
  name: 'Sniper Artillery Cannon',
  category: 'Artillery Weapons',
  baseType: 'Sniper Artillery Cannon',
  description: 'Sniper Artillery Cannon - Vehicle-mounted precision artillery',
  requiresAmmo: true,
  introductionYear: 2467,
  rulesLevel: 'Standard',
  techRating: 'B',
  sourceBook: 'TM',
  pageReference: '230',
  variants: {
    IS: {
      weight: 20,
      crits: 10,
      damage: 20,
      heat: 10,
      minRange: 12,
      rangeShort: 12,
      rangeMedium: 24,
      rangeLong: 36,
      rangeExtreme: 48,
      cost: 300000,
      battleValue: 130
    }
  }
};

export const THUMPER_ARTILLERY_CANNON: Equipment = {
  id: 'thumper_artillery_cannon',
  name: 'Thumper Artillery Cannon',
  category: 'Artillery Weapons',
  baseType: 'Thumper Artillery Cannon',
  description: 'Thumper Artillery Cannon - Vehicle-mounted light artillery',
  requiresAmmo: true,
  introductionYear: 2449,
  rulesLevel: 'Standard',
  techRating: 'B',
  sourceBook: 'TM',
  pageReference: '230',
  variants: {
    IS: {
      weight: 15,
      crits: 7,
      damage: 15,
      heat: 5,
      minRange: 6,
      rangeShort: 6,
      rangeMedium: 12,
      rangeLong: 18,
      rangeExtreme: 24,
      cost: 187500,
      battleValue: 53
    }
  }
};

export const ARTILLERY_CANNON: Equipment = {
  id: 'artillery_cannon',
  name: 'Artillery Cannon',
  category: 'Artillery Weapons',
  baseType: 'Artillery Cannon',
  description: 'Generic Artillery Cannon - Standard artillery piece',
  requiresAmmo: true,
  introductionYear: 2400,
  rulesLevel: 'Standard',
  techRating: 'B',
  sourceBook: 'TM',
  pageReference: '230',
  variants: {
    IS: {
      weight: 20,
      crits: 10,
      damage: 20,
      heat: 8,
      minRange: 10,
      rangeShort: 10,
      rangeMedium: 20,
      rangeLong: 30,
      rangeExtreme: 40,
      cost: 250000,
      battleValue: 140
    }
  }
}; 