import { Equipment } from '../types';

export const ENHANCED_LRM_10: Equipment = {
  id: 'enhanced_lrm_10',
  name: 'Enhanced LRM 10',
  category: 'Missile Weapons',
  baseType: 'Enhanced LRM 10',
  description: 'Enhanced LRM 10 - Improved long-range missile system with advanced targeting',
  requiresAmmo: true,
  introductionYear: 3093,
  rulesLevel: 'Standard',
  techRating: 'F',
  sourceBook: 'TRO 3145',
  pageReference: '58',
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
      cost: 100000,
      battleValue: 110
    }
  }
};

export const ENHANCED_LRM_5: Equipment = {
  id: 'enhanced_lrm_5',
  name: 'Enhanced LRM 5',
  category: 'Missile Weapons',
  baseType: 'Enhanced LRM 5',
  description: 'Enhanced LRM 5 - Improved long-range missile system with advanced targeting',
  requiresAmmo: true,
  introductionYear: 3073,
  rulesLevel: 'Standard',
  techRating: 'F',
  sourceBook: 'TRO 3145',
  pageReference: '58',
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
      cost: 40000,
      battleValue: 55
    }
  }
};

export const EXTENDED_LRM_10: Equipment = {
  id: 'extended_lrm_10',
  name: 'Extended LRM 10',
  category: 'Missile Weapons',
  baseType: 'Extended LRM 10',
  description: 'Extended LRM 10 - Long-range missile system with extended effective range',
  requiresAmmo: true,
  introductionYear: 3075,
  rulesLevel: 'Standard',
  techRating: 'F',
  sourceBook: 'TRO 3145',
  pageReference: '58',
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
      rangeExtreme: 28,
      cost: 125000,
      battleValue: 115
    }
  }
};

export const EXTENDED_LRM_15: Equipment = {
  id: 'extended_lrm_15',
  name: 'Extended LRM 15',
  category: 'Missile Weapons',
  baseType: 'Extended LRM 15',
  description: 'Extended LRM 15 - Long-range missile system with extended effective range',
  requiresAmmo: true,
  introductionYear: 3083,
  rulesLevel: 'Standard',
  techRating: 'F',
  sourceBook: 'TRO 3145',
  pageReference: '58',
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
      rangeExtreme: 28,
      cost: 230000,
      battleValue: 172
    }
  }
};

export const EXTENDED_LRM_20: Equipment = {
  id: 'extended_lrm_20',
  name: 'Extended LRM 20',
  category: 'Missile Weapons',
  baseType: 'Extended LRM 20',
  description: 'Extended LRM 20 - Long-range missile system with extended effective range',
  requiresAmmo: true,
  introductionYear: 3072,
  rulesLevel: 'Standard',
  techRating: 'F',
  sourceBook: 'TRO 3145',
  pageReference: '58',
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
      rangeExtreme: 28,
      cost: 350000,
      battleValue: 229
    }
  }
};

export const IMPROVED_LRM_15: Equipment = {
  id: 'improved_lrm_15',
  name: 'Improved LRM 15',
  category: 'Missile Weapons',
  baseType: 'Improved LRM 15',
  description: 'Improved LRM 15 - Star League era enhanced long-range missile system',
  requiresAmmo: true,
  introductionYear: 2824,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TRO 3058',
  pageReference: '45',
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
      cost: 185000,
      battleValue: 164
    }
  }
};

export const IMPROVED_LRM_20: Equipment = {
  id: 'improved_lrm_20',
  name: 'Improved LRM 20',
  category: 'Missile Weapons',
  baseType: 'Improved LRM 20',
  description: 'Improved LRM 20 - Star League era enhanced heavy long-range missile system',
  requiresAmmo: true,
  introductionYear: 2825,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TRO 3058',
  pageReference: '45',
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
      cost: 280000,
      battleValue: 218
    }
  }
};

export const LRM_10: Equipment = {
  id: 'lrm_10',
  name: 'LRM 10',
  category: 'Missile Weapons',
  baseType: 'LRM 10',
  description: 'Long Range Missile 10-pack - Standard indirect fire support weapon',
  requiresAmmo: true,
  introductionYear: 2473,
  rulesLevel: 'Standard',
  techRating: 'C',
  sourceBook: 'TM',
  pageReference: '229',
  variants: {
    Clan: {
      weight: 2.5,
      crits: 1,
      damage: 10,
      heat: 4,
      minRange: 6,
      rangeShort: 7,
      rangeMedium: 14,
      rangeLong: 21,
      cost: 100000,
      battleValue: 90
    },
    IS: {
      weight: 5,
      crits: 2,
      damage: 10,
      heat: 4,
      minRange: 6,
      rangeShort: 7,
      rangeMedium: 14,
      rangeLong: 21,
      cost: 100000,
      battleValue: 90
    }
  }
};

export const LRM_15: Equipment = {
  id: 'lrm_15',
  name: 'LRM 15',
  category: 'Missile Weapons',
  baseType: 'LRM 15',
  description: 'Long Range Missile 15-pack - Heavy indirect fire support weapon',
  requiresAmmo: true,
  introductionYear: 2491,
  rulesLevel: 'Standard',
  techRating: 'C',
  sourceBook: 'TM',
  pageReference: '229',
  variants: {
    Clan: {
      weight: 3.5,
      crits: 2,
      damage: 15,
      heat: 5,
      minRange: 6,
      rangeShort: 7,
      rangeMedium: 14,
      rangeLong: 21,
      cost: 175000,
      battleValue: 136
    },
    IS: {
      weight: 7,
      crits: 3,
      damage: 15,
      heat: 5,
      minRange: 6,
      rangeShort: 7,
      rangeMedium: 14,
      rangeLong: 21,
      cost: 175000,
      battleValue: 136
    }
  }
};

export const LRM_20: Equipment = {
  id: 'lrm_20',
  name: 'LRM 20',
  category: 'Missile Weapons',
  baseType: 'LRM 20',
  description: 'Long Range Missile 20-pack - Heavy indirect fire support weapon',
  requiresAmmo: true,
  introductionYear: 2458,
  rulesLevel: 'Standard',
  techRating: 'C',
  sourceBook: 'TM',
  pageReference: '229',
  variants: {
    Clan: {
      weight: 5,
      crits: 2,
      damage: 20,
      heat: 6,
      minRange: 6,
      rangeShort: 7,
      rangeMedium: 14,
      rangeLong: 21,
      cost: 250000,
      battleValue: 181
    },
    IS: {
      weight: 10,
      crits: 5,
      damage: 20,
      heat: 6,
      minRange: 6,
      rangeShort: 7,
      rangeMedium: 14,
      rangeLong: 21,
      cost: 250000,
      battleValue: 181
    }
  }
};

export const LRM_5: Equipment = {
  id: 'lrm_5',
  name: 'LRM 5',
  category: 'Missile Weapons',
  baseType: 'LRM 5',
  description: 'Long Range Missile 5-pack - Standard indirect fire support weapon',
  requiresAmmo: true,
  introductionYear: 2456,
  rulesLevel: 'Standard',
  techRating: 'C',
  sourceBook: 'TM',
  pageReference: '229',
  variants: {
    Clan: {
      weight: 1,
      crits: 1,
      damage: 5,
      heat: 2,
      minRange: 6,
      rangeShort: 7,
      rangeMedium: 14,
      rangeLong: 21,
      cost: 30000,
      battleValue: 45
    },
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
      battleValue: 45
    }
  }
}; 