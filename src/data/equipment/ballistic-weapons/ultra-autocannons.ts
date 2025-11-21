import { Equipment } from '../types';

export const ULTRA_AC_10: Equipment = {
  id: 'ultra_ac_10',
  name: 'Ultra AC/10',
  category: 'Ballistic Weapons',
  baseType: 'Ultra AC/10',
  description: 'Ultra Autocannon/10 - Double-firing capable autocannon',
  requiresAmmo: true,
  introductionYear: 2845,
  rulesLevel: 'Standard',
  variants: {
    Clan: {
      weight: 10,
      crits: 5,
      damage: 10,
      heat: 4,
      minRange: 0,
      rangeShort: 5,
      rangeMedium: 10,
      rangeLong: 15,
      cost: 320000,
      battleValue: 210
    },
    IS: {
      weight: 13,
      crits: 7,
      damage: 10,
      heat: 4,
      minRange: 0,
      rangeShort: 5,
      rangeMedium: 10,
      rangeLong: 15,
      cost: 320000,
      battleValue: 210
    }
  }
};

export const ULTRA_AC_2: Equipment = {
  id: 'ultra_ac_2',
  name: 'Ultra AC/2',
  category: 'Ballistic Weapons',
  baseType: 'Ultra AC/2',
  description: 'Ultra Autocannon/2 - Double-firing capable autocannon',
  requiresAmmo: true,
  introductionYear: 2827,
  rulesLevel: 'Standard',
  variants: {
    Clan: {
      weight: 6,
      crits: 2,
      damage: 2,
      heat: 1,
      minRange: 0,
      rangeShort: 2,
      rangeMedium: 9,
      rangeLong: 18,
      cost: 120000,
      battleValue: 81
    },
    IS: {
      weight: 7,
      crits: 2,
      damage: 2,
      heat: 1,
      minRange: 0,
      rangeShort: 2,
      rangeMedium: 9,
      rangeLong: 18,
      cost: 120000,
      battleValue: 81
    }
  }
};

export const ULTRA_AC_20: Equipment = {
  id: 'ultra_ac_20',
  name: 'Ultra AC/20',
  category: 'Ballistic Weapons',
  baseType: 'Ultra AC/20',
  description: 'Ultra Autocannon/20 - Double-firing capable heavy autocannon',
  requiresAmmo: true,
  introductionYear: 2830,
  rulesLevel: 'Standard',
  variants: {
    Clan: {
      weight: 12,
      crits: 8,
      damage: 20,
      heat: 8,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 480000,
      battleValue: 335
    },
    IS: {
      weight: 15,
      crits: 10,
      damage: 20,
      heat: 8,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 480000,
      battleValue: 335
    }
  }
};

export const ULTRA_AC_5: Equipment = {
  id: 'ultra_ac_5',
  name: 'Ultra AC/5',
  category: 'Ballistic Weapons',
  baseType: 'Ultra AC/5',
  description: 'Ultra Autocannon/5 - Double-firing capable autocannon',
  requiresAmmo: true,
  introductionYear: 2750,
  rulesLevel: 'Standard',
  variants: {
    Clan: {
      weight: 7,
      crits: 4,
      damage: 5,
      heat: 1,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 200000,
      battleValue: 112
    },
    IS: {
      weight: 9,
      crits: 5,
      damage: 5,
      heat: 1,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 200000,
      battleValue: 112
    }
  }
}; 