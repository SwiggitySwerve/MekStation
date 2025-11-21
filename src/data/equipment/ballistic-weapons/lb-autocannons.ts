import { Equipment } from '../types';

export const LB_2_X_AC: Equipment = {
  id: 'lb_2_x_ac',
  name: 'LB 2-X AC',
  category: 'Ballistic Weapons',
  baseType: 'LB 2-X AC',
  description: 'LB 2-X Autocannon - Ultra-light cluster autocannon',
  requiresAmmo: true,
  introductionYear: 3058,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 5,
      crits: 2,
      damage: 2,
      heat: 1,
      minRange: 0,
      rangeShort: 9,
      rangeMedium: 18,
      rangeLong: 27,
      cost: 150000,
      battleValue: 42
    },
    Clan: {
      weight: 4,
      crits: 2,
      damage: 2,
      heat: 1,
      minRange: 0,
      rangeShort: 10,
      rangeMedium: 20,
      rangeLong: 30,
      cost: 150000,
      battleValue: 47
    }
  }
};

export const LB_5_X_AC: Equipment = {
  id: 'lb_5_x_ac',
  name: 'LB 5-X AC',
  category: 'Ballistic Weapons',
  baseType: 'LB 5-X AC',
  description: 'LB 5-X Autocannon - Light cluster autocannon',
  requiresAmmo: true,
  introductionYear: 3055,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 7,
      crits: 4,
      damage: 5,
      heat: 1,
      minRange: 0,
      rangeShort: 6,
      rangeMedium: 12,
      rangeLong: 18,
      cost: 250000,
      battleValue: 83
    },
    Clan: {
      weight: 6,
      crits: 3,
      damage: 5,
      heat: 1,
      minRange: 0,
      rangeShort: 7,
      rangeMedium: 14,
      rangeLong: 21,
      cost: 250000,
      battleValue: 92
    }
  }
};

export const LB_10_X_AC: Equipment = {
  id: 'lb_10_x_ac',
  name: 'LB 10-X AC',
  category: 'Ballistic Weapons',
  baseType: 'LB 10-X AC',
  description: 'LB 10-X Autocannon - Medium cluster autocannon',
  requiresAmmo: true,
  introductionYear: 2595,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 11,
      crits: 6,
      damage: 10,
      heat: 2,
      minRange: 0,
      rangeShort: 5,
      rangeMedium: 10,
      rangeLong: 15,
      cost: 400000,
      battleValue: 148
    },
    Clan: {
      weight: 10,
      crits: 5,
      damage: 10,
      heat: 2,
      minRange: 0,
      rangeShort: 6,
      rangeMedium: 12,
      rangeLong: 18,
      cost: 400000,
      battleValue: 148
    }
  }
};

export const LB_20_X_AC: Equipment = {
  id: 'lb_20_x_ac',
  name: 'LB 20-X AC',
  category: 'Ballistic Weapons',
  baseType: 'LB 20-X AC',
  description: 'LB 20-X Autocannon - Heavy cluster autocannon',
  requiresAmmo: true,
  introductionYear: 2590,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 14,
      crits: 10,
      damage: 20,
      heat: 6,
      minRange: 0,
      rangeShort: 4,
      rangeMedium: 8,
      rangeLong: 12,
      cost: 600000,
      battleValue: 237
    },
    Clan: {
      weight: 12,
      crits: 9,
      damage: 20,
      heat: 6,
      minRange: 0,
      rangeShort: 4,
      rangeMedium: 8,
      rangeLong: 12,
      cost: 600000,
      battleValue: 237
    }
  }
}; 