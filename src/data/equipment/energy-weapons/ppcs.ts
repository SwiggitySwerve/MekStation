import { Equipment } from '../types';

export const CLAN_ERPPC: Equipment = {
  id: 'clan_erppc',
  name: 'ER PPC',
  category: 'Energy Weapons',
  baseType: 'Clan ER PPC',
  description: 'Clan Extended Range Particle Projection Cannon',
  requiresAmmo: false,
  introductionYear: 2830,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    Clan: {
      weight: 6,
      crits: 2,
      damage: 15,
      heat: 15,
      minRange: 0,
      rangeShort: 7,
      rangeMedium: 14,
      rangeLong: 23,
      rangeExtreme: 28,
      cost: 300000,
      battleValue: 412
    }
  }
};

export const IS_ER_PPC: Equipment = {
  id: 'is_er_ppc',
  name: 'ER PPC',
  category: 'Energy Weapons',
  baseType: 'IS ER PPC',
  description: 'Inner Sphere Extended Range PPC',
  requiresAmmo: false,
  introductionYear: 2760,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 7,
      crits: 3,
      damage: 10,
      heat: 15,
      minRange: 0,
      rangeShort: 7,
      rangeMedium: 14,
      rangeLong: 23,
      rangeExtreme: 28,
      cost: 300000,
      battleValue: 229
    }
  }
};

export const ENHANCED_PPC: Equipment = {
  id: 'enhanced_ppc',
  name: 'Enhanced PPC',
  category: 'Energy Weapons',
  baseType: 'Enhanced PPC',
  description: 'Enhanced Particle Projection Cannon - Improved heat efficiency',
  requiresAmmo: false,
  introductionYear: 2823,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '227',
  variants: {
    IS: {
      weight: 7,
      crits: 3,
      damage: 10,
      heat: 10,
      minRange: 0,
      rangeShort: 6,
      rangeMedium: 12,
      rangeLong: 18,
      cost: 300000,
      battleValue: 229
    }
  }
};

export const HEAVY_PPC: Equipment = {
  id: 'heavy_ppc',
  name: 'Heavy PPC',
  category: 'Energy Weapons',
  baseType: 'Heavy PPC',
  description: 'Heavy PPC - Reduced heat particle projection cannon',
  requiresAmmo: false,
  introductionYear: 3067,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '227',
  variants: {
    Clan: {
      weight: 6,
      crits: 2,
      damage: 10,
      heat: 10,
      minRange: 0,
      rangeShort: 6,
      rangeMedium: 12,
      rangeLong: 18,
      cost: 150000,
      battleValue: 176
    },
    IS: {
      weight: 7,
      crits: 3,
      damage: 10,
      heat: 10,
      minRange: 0,
      rangeShort: 6,
      rangeMedium: 12,
      rangeLong: 18,
      cost: 150000,
      battleValue: 176
    }
  }
};

export const LIGHT_PPC: Equipment = {
  id: 'light_ppc',
  name: 'Light PPC',
  category: 'Energy Weapons',
  baseType: 'Light PPC',
  description: 'Light PPC - Lightweight particle projection cannon',
  requiresAmmo: false,
  introductionYear: 3060,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '227',
  variants: {
    Clan: {
      weight: 3,
      crits: 2,
      damage: 5,
      heat: 5,
      minRange: 0,
      rangeShort: 5,
      rangeMedium: 10,
      rangeLong: 15,
      cost: 150000,
      battleValue: 88
    },
    IS: {
      weight: 3,
      crits: 2,
      damage: 5,
      heat: 5,
      minRange: 0,
      rangeShort: 5,
      rangeMedium: 10,
      rangeLong: 15,
      cost: 150000,
      battleValue: 88
    }
  }
};

export const PPC: Equipment = {
  id: 'ppc',
  name: 'PPC',
  category: 'Energy Weapons',
  baseType: 'PPC',
  description: 'Particle Projection Cannon',
  requiresAmmo: false,
  introductionYear: 2594,
  rulesLevel: 'Standard',
  techRating: 'D',
  sourceBook: 'TM',
  pageReference: '273',
  variants: {
    IS: {
      weight: 7,
      crits: 3,
      damage: 10,
      heat: 10,
      minRange: 3,
      rangeShort: 6,
      rangeMedium: 12,
      rangeLong: 18,
      cost: 200000,
      battleValue: 176
    }
  }
};

export const SNUB_NOSE_PPC: Equipment = {
  id: 'snub_nose_ppc',
  name: 'Snub-Nose PPC',
  category: 'Energy Weapons',
  baseType: 'Snub-Nose PPC',
  description: 'Snub-Nose PPC - No minimum range particle projection cannon',
  requiresAmmo: false,
  introductionYear: 2695,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '227',
  variants: {
    IS: {
      weight: 6,
      crits: 2,
      damage: 10,
      heat: 10,
      minRange: 0,
      rangeShort: 9,
      rangeMedium: 15,
      rangeLong: 21,
      cost: 300000,
      battleValue: 237
    }
  }
};

export const PPC_WEAPONS: Equipment[] = [
  CLAN_ERPPC,
  IS_ER_PPC,
  ENHANCED_PPC,
  HEAVY_PPC,
  LIGHT_PPC,
  PPC,
  SNUB_NOSE_PPC
]; 