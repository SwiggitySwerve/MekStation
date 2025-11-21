import { Equipment } from '../types';

export const ARROW_IV_ARTILLERY: Equipment = {
  id: 'arrow_iv_artillery',
  name: 'Arrow IV Artillery',
  category: 'Artillery Weapons',
  baseType: 'Arrow IV Artillery',
  description: 'Arrow IV Artillery System - Long-range indirect fire support weapon',
  requiresAmmo: true,
  introductionYear: 2593,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 15,
      crits: 15,
      damage: 20,
      heat: 10,
      minRange: 8,
      rangeShort: 8,
      rangeMedium: 16,
      rangeLong: 24,
      rangeExtreme: 32,
      cost: 450000,
      battleValue: 240
    },
    Clan: {
      weight: 12,
      crits: 12,
      damage: 20,
      heat: 10,
      minRange: 8,
      rangeShort: 8,
      rangeMedium: 16,
      rangeLong: 24,
      rangeExtreme: 32,
      cost: 450000,
      battleValue: 240
    }
  }
};

export const LONG_TOM_ARTILLERY: Equipment = {
  id: 'long_tom_artillery',
  name: 'Long Tom Artillery',
  category: 'Artillery Weapons',
  baseType: 'Long Tom Artillery',
  description: 'Long Tom Artillery Piece - Heavy long-range bombardment weapon',
  requiresAmmo: true,
  introductionYear: 2453,
  rulesLevel: 'Standard',
  techRating: 'B',
  sourceBook: 'TM',
  pageReference: '230',
  variants: {
    IS: {
      weight: 30,
      crits: 30,
      damage: 25,
      heat: 20,
      minRange: 30,
      rangeShort: 30,
      rangeMedium: 60,
      rangeLong: 90,
      rangeExtreme: 120,
      cost: 750000,
      battleValue: 368
    }
  }
};

export const SNIPER_ARTILLERY: Equipment = {
  id: 'sniper_artillery',
  name: 'Sniper Artillery',
  category: 'Artillery Weapons',
  baseType: 'Sniper Artillery',
  description: 'Sniper Artillery Piece - Medium-range precision artillery',
  requiresAmmo: true,
  introductionYear: 2455,
  rulesLevel: 'Standard',
  techRating: 'B',
  sourceBook: 'TM',
  pageReference: '230',
  variants: {
    IS: {
      weight: 20,
      crits: 20,
      damage: 20,
      heat: 10,
      minRange: 12,
      rangeShort: 12,
      rangeMedium: 24,
      rangeLong: 36,
      rangeExtreme: 48,
      cost: 300000,
      battleValue: 163
    }
  }
};

export const THUMPER_ARTILLERY: Equipment = {
  id: 'thumper_artillery',
  name: 'Thumper Artillery',
  category: 'Artillery Weapons',
  baseType: 'Thumper Artillery',
  description: 'Thumper Artillery Piece - Light artillery support weapon',
  requiresAmmo: true,
  introductionYear: 2439,
  rulesLevel: 'Standard',
  techRating: 'B',
  variants: {
    IS: {
      weight: 15,
      crits: 15,
      damage: 15,
      heat: 5,
      minRange: 6,
      rangeShort: 6,
      rangeMedium: 12,
      rangeLong: 18,
      rangeExtreme: 24,
      cost: 187500,
      battleValue: 66
    }
  }
}; 