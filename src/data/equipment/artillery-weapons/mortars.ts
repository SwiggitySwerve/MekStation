import { Equipment } from '../types';

export const BA_TUBE_ARTILLERY: Equipment = {
  id: 'ba_tube_artillery',
  name: 'BA Tube Artillery',
  category: 'Artillery Weapons',
  baseType: 'BA Tube Artillery',
  description: 'Battle Armor Tube Artillery - Portable artillery system',
  requiresAmmo: true,
  introductionYear: 3055,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '230',
  variants: {
    IS: {
      weight: 8,
      crits: 8,
      damage: 10,
      heat: 3,
      minRange: 4,
      rangeShort: 4,
      rangeMedium: 8,
      rangeLong: 12,
      rangeExtreme: 16,
      cost: 125000,
      battleValue: 45
    },
    Clan: {
      weight: 6,
      crits: 6,
      damage: 10,
      heat: 3,
      minRange: 4,
      rangeShort: 4,
      rangeMedium: 8,
      rangeLong: 12,
      rangeExtreme: 16,
      cost: 125000,
      battleValue: 45
    }
  }
};

export const MECH_MORTAR_1: Equipment = {
  id: 'mech_mortar_1',
  name: 'Mech Mortar/1',
  category: 'Artillery Weapons',
  baseType: 'Mech Mortar/1',
  description: 'Mech Mortar/1 - Light mortar system',
  requiresAmmo: true,
  introductionYear: 3064,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 2,
      crits: 2,
      damage: 1,
      heat: 1,
      minRange: 6,
      rangeShort: 6,
      rangeMedium: 12,
      rangeLong: 18,
      rangeExtreme: 24,
      cost: 30000,
      battleValue: 10
    }
  }
};

export const MECH_MORTAR_2: Equipment = {
  id: 'mech_mortar_2',
  name: 'Mech Mortar/2',
  category: 'Artillery Weapons',
  baseType: 'Mech Mortar/2',
  description: 'Mech Mortar/2 - Medium mortar system',
  requiresAmmo: true,
  introductionYear: 3064,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '230',
  variants: {
    IS: {
      weight: 3,
      crits: 3,
      damage: 2,
      heat: 1,
      minRange: 6,
      rangeShort: 6,
      rangeMedium: 12,
      rangeLong: 18,
      rangeExtreme: 24,
      cost: 40000,
      battleValue: 15
    }
  }
};

export const MECH_MORTAR_4: Equipment = {
  id: 'mech_mortar_4',
  name: 'Mech Mortar/4',
  category: 'Artillery Weapons',
  baseType: 'Mech Mortar/4',
  description: 'Mech Mortar/4 - Heavy mortar system',
  requiresAmmo: true,
  introductionYear: 3064,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '230',
  variants: {
    IS: {
      weight: 5,
      crits: 3,
      damage: 4,
      heat: 1,
      minRange: 6,
      rangeShort: 6,
      rangeMedium: 12,
      rangeLong: 18,
      rangeExtreme: 24,
      cost: 70000,
      battleValue: 22
    }
  }
};

export const MECH_MORTAR_8: Equipment = {
  id: 'mech_mortar_8',
  name: 'Mech Mortar/8',
  category: 'Artillery Weapons',
  baseType: 'Mech Mortar/8',
  description: 'Mech Mortar/8 - Very heavy mortar system',
  requiresAmmo: true,
  introductionYear: 3064,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '230',
  variants: {
    IS: {
      weight: 8,
      crits: 5,
      damage: 8,
      heat: 1,
      minRange: 6,
      rangeShort: 6,
      rangeMedium: 12,
      rangeLong: 18,
      rangeExtreme: 24,
      cost: 110000,
      battleValue: 30
    }
  }
}; 