import { Equipment } from './types';

export const TORPEDO: Equipment = {
  id: 'torpedo',
  name: 'Torpedo',
  category: 'Torpedoes',
  baseType: 'Torpedo',
  description: 'Standard Torpedo - Naval warfare weapon for underwater and space combat',
  requiresAmmo: true,
  introductionYear: 2300,
  rulesLevel: 'Standard',
  techRating: 'B',
  variants: {
    IS: {
      weight: 1.5,
      crits: 1,
      damage: 6,
      heat: 0,
      minRange: 3,
      rangeShort: 6,
      rangeMedium: 12,
      rangeLong: 18,
      cost: 30000,
      battleValue: 15
    }
  }
};

export const LONG_RANGE_TORPEDO: Equipment = {
  id: 'long_range_torpedo',
  name: 'Long Range Torpedo',
  category: 'Torpedoes',
  baseType: 'Long Range Torpedo',
  description: 'Long Range Torpedo - Extended range naval weapon',
  requiresAmmo: true,
  introductionYear: 2350,
  rulesLevel: 'Standard',
  techRating: 'C',
  variants: {
    IS: {
      weight: 2,
      crits: 2,
      damage: 8,
      heat: 0,
      minRange: 6,
      rangeShort: 12,
      rangeMedium: 24,
      rangeLong: 36,
      cost: 45000,
      battleValue: 20
    }
  }
};

export const SHORT_RANGE_TORPEDO: Equipment = {
  id: 'short_range_torpedo',
  name: 'Short Range Torpedo',
  category: 'Torpedoes',
  baseType: 'Short Range Torpedo',
  description: 'Short Range Torpedo - High-damage close-range naval weapon',
  requiresAmmo: true,
  introductionYear: 2300,
  rulesLevel: 'Standard',
  techRating: 'B',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      damage: 4,
      heat: 0,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 20000,
      battleValue: 8
    }
  }
};

export const K_F_TORPEDO: Equipment = {
  id: 'k_f_torpedo',
  name: 'K-F Torpedo',
  category: 'Torpedoes',
  baseType: 'K-F Torpedo',
  description: 'Kearny-Fuchida Torpedo - Advanced space-combat torpedo with jump capability',
  requiresAmmo: true,
  introductionYear: 3068,
  rulesLevel: 'Advanced',
  techRating: 'F',
  variants: {
    IS: {
      weight: 5,
      crits: 5,
      damage: 30,
      heat: 0,
      minRange: 12,
      rangeShort: 24,
      rangeMedium: 48,
      rangeLong: 72,
      cost: 150000,
      battleValue: 60
    },
    Clan: {
      weight: 4,
      crits: 4,
      damage: 30,
      heat: 0,
      minRange: 12,
      rangeShort: 24,
      rangeMedium: 48,
      rangeLong: 72,
      cost: 150000,
      battleValue: 60
    }
  }
};

export const LRT_5: Equipment = {
  id: 'lrt_5',
  name: 'LRT-5',
  category: 'Torpedoes',
  baseType: 'LRT-5',
  description: 'Long Range Torpedo 5 - 5-tube long range torpedo launcher',
  requiresAmmo: true,
  introductionYear: 2380,
  rulesLevel: 'Standard',
  techRating: 'C',
  variants: {
    IS: {
      weight: 2,
      crits: 1,
      damage: 5,
      heat: 2,
      minRange: 6,
      rangeShort: 7,
      rangeMedium: 14,
      rangeLong: 21,
      cost: 30000,
      battleValue: 9
    }
  }
};

export const LRT_10: Equipment = {
  id: 'lrt_10',
  name: 'LRT-10',
  category: 'Torpedoes',
  baseType: 'LRT-10',
  description: 'Long Range Torpedo 10 - 10-tube long range torpedo launcher',
  requiresAmmo: true,
  introductionYear: 2380,
  rulesLevel: 'Standard',
  techRating: 'C',
  variants: {
    IS: {
      weight: 5,
      crits: 2,
      damage: 10,
      heat: 4,
      minRange: 6,
      rangeShort: 7,
      rangeMedium: 14,
      rangeLong: 21,
      cost: 60000,
      battleValue: 18
    }
  }
};

export const LRT_15: Equipment = {
  id: 'lrt_15',
  name: 'LRT-15',
  category: 'Torpedoes',
  baseType: 'LRT-15',
  description: 'Long Range Torpedo 15 - 15-tube long range torpedo launcher',
  requiresAmmo: true,
  introductionYear: 2380,
  rulesLevel: 'Standard',
  techRating: 'C',
  variants: {
    IS: {
      weight: 7,
      crits: 3,
      damage: 15,
      heat: 5,
      minRange: 6,
      rangeShort: 7,
      rangeMedium: 14,
      rangeLong: 21,
      cost: 90000,
      battleValue: 28
    }
  }
};

export const LRT_20: Equipment = {
  id: 'lrt_20',
  name: 'LRT-20',
  category: 'Torpedoes',
  baseType: 'LRT-20',
  description: 'Long Range Torpedo 20 - 20-tube long range torpedo launcher',
  requiresAmmo: true,
  introductionYear: 2380,
  rulesLevel: 'Standard',
  techRating: 'C',
  variants: {
    IS: {
      weight: 10,
      crits: 5,
      damage: 20,
      heat: 6,
      minRange: 6,
      rangeShort: 7,
      rangeMedium: 14,
      rangeLong: 21,
      cost: 120000,
      battleValue: 37
    }
  }
};

export const SRT_2: Equipment = {
  id: 'srt_2',
  name: 'SRT-2',
  category: 'Torpedoes',
  baseType: 'SRT-2',
  description: 'Short Range Torpedo 2 - 2-tube short range torpedo launcher',
  requiresAmmo: true,
  introductionYear: 2350,
  rulesLevel: 'Standard',
  techRating: 'B',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      damage: 2,
      heat: 2,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 10000,
      battleValue: 3
    }
  }
};

export const SRT_4: Equipment = {
  id: 'srt_4',
  name: 'SRT-4',
  category: 'Torpedoes',
  baseType: 'SRT-4',
  description: 'Short Range Torpedo 4 - 4-tube short range torpedo launcher',
  requiresAmmo: true,
  introductionYear: 2350,
  rulesLevel: 'Standard',
  techRating: 'B',
  variants: {
    IS: {
      weight: 2,
      crits: 1,
      damage: 8,
      heat: 3,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 20000,
      battleValue: 12
    }
  }
};

export const SRT_6: Equipment = {
  id: 'srt_6',
  name: 'SRT-6',
  category: 'Torpedoes',
  baseType: 'SRT-6',
  description: 'Short Range Torpedo 6 - 6-tube short range torpedo launcher',
  requiresAmmo: true,
  introductionYear: 2350,
  rulesLevel: 'Standard',
  techRating: 'B',
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
      cost: 30000,
      battleValue: 18
    }
  }
};

export const TORPEDOES: Equipment[] = [
  TORPEDO,
  LONG_RANGE_TORPEDO,
  SHORT_RANGE_TORPEDO,
  K_F_TORPEDO,
  LRT_5,
  LRT_10,
  LRT_15,
  LRT_20,
  SRT_2,
  SRT_4,
  SRT_6
];
