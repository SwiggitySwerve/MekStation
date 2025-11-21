import { Equipment } from '../types';

export const PROTOTYPE_STREAK_SRM_4: Equipment = {
  id: 'prototype_streak_srm_4',
  name: 'Prototype Streak SRM 4',
  category: 'Missile Weapons',
  baseType: 'Prototype Streak SRM 4',
  description: 'Prototype Streak SRM 4 - Early self-guided short-range missile system',
  requiresAmmo: true,
  introductionYear: 2823,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TRO 3058',
  pageReference: '45',
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
      cost: 80000,
      battleValue: 54
    }
  }
};

export const PROTOTYPE_STREAK_SRM_6: Equipment = {
  id: 'prototype_streak_srm_6',
  name: 'Prototype Streak SRM 6',
  category: 'Missile Weapons',
  baseType: 'Prototype Streak SRM 6',
  description: 'Prototype Streak SRM 6 - Early self-guided heavy short-range missile system',
  requiresAmmo: true,
  introductionYear: 2801,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TRO 3058',
  pageReference: '45',
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
      cost: 110000,
      battleValue: 81
    }
  }
};

export const STREAK_LRM_10: Equipment = {
  id: 'streak_lrm_10',
  name: 'Streak LRM 10',
  category: 'Missile Weapons',
  baseType: 'Streak LRM 10',
  description: 'Streak LRM 10 - Self-guided long-range missile system',
  requiresAmmo: true,
  introductionYear: 3074,
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
      cost: 120000,
      battleValue: 135
    }
  }
};

export const STREAK_LRM_15: Equipment = {
  id: 'streak_lrm_15',
  name: 'Streak LRM 15',
  category: 'Missile Weapons',
  baseType: 'Streak LRM 15',
  description: 'Streak LRM 15 - Self-guided long-range missile system',
  requiresAmmo: true,
  introductionYear: 3085,
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
      cost: 200000,
      battleValue: 203
    }
  }
};

export const STREAK_LRM_15_AMMO_OMNIPOD: Equipment = {
  id: 'streak_lrm_15_ammo_omnipod',
  name: 'Streak LRM 15 Ammo (omnipod)',
  category: 'Missile Weapons',
  baseType: 'Streak LRM 15 Ammo',
  description: 'Streak LRM 15 Ammo (omnipod) - OmniPod ammunition system for Streak LRM 15',
  requiresAmmo: false,
  introductionYear: 3127,
  rulesLevel: 'Standard',
  techRating: 'F',
  sourceBook: 'TRO 3151',
  pageReference: '45',
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
      cost: 30000,
      battleValue: 203
    }
  }
};

export const STREAK_LRM_20: Equipment = {
  id: 'streak_lrm_20',
  name: 'Streak LRM 20',
  category: 'Missile Weapons',
  baseType: 'Streak LRM 20',
  description: 'Streak LRM 20 - Self-guided heavy long-range missile system',
  requiresAmmo: true,
  introductionYear: 3110,
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
      cost: 300000,
      battleValue: 271
    }
  }
};

export const STREAK_LRM_20_AMMO_OMNIPOD: Equipment = {
  id: 'streak_lrm_20_ammo_omnipod',
  name: 'Streak LRM 20 Ammo (omnipod)',
  category: 'Missile Weapons',
  baseType: 'Streak LRM 20 Ammo',
  description: 'Streak LRM 20 Ammo (omnipod) - OmniPod ammunition system for Streak LRM 20',
  requiresAmmo: false,
  introductionYear: 3132,
  rulesLevel: 'Standard',
  techRating: 'F',
  sourceBook: 'TRO 3151',
  pageReference: '45',
  variants: {
    IS: {
      weight: 5,
      crits: 4,
      damage: 20,
      heat: 6,
      minRange: 6,
      rangeShort: 7,
      rangeMedium: 14,
      rangeLong: 21,
      cost: 50000,
      battleValue: 271
    }
  }
};

export const STREAK_LRM_5: Equipment = {
  id: 'streak_lrm_5',
  name: 'Streak LRM 5',
  category: 'Missile Weapons',
  baseType: 'Streak LRM 5',
  description: 'Streak LRM 5 - Self-guided long-range missile system',
  requiresAmmo: true,
  introductionYear: 3093,
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
      cost: 45000,
      battleValue: 67
    }
  }
};

export const STREAK_SRM_2: Equipment = {
  id: 'streak_srm_2',
  name: 'Streak SRM 2',
  category: 'Missile Weapons',
  baseType: 'Streak SRM 2',
  description: 'Streak SRM 2 - Self-guided short-range missile system',
  requiresAmmo: true,
  introductionYear: 2649,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '229',
  variants: {
    Clan: {
      weight: 0.5,
      crits: 1,
      damage: 4,
      heat: 2,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 15000,
      battleValue: 30
    },
    IS: {
      weight: 1,
      crits: 1,
      damage: 4,
      heat: 2,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 15000,
      battleValue: 30
    }
  }
};

export const STREAK_SRM_4_I_OS: Equipment = {
  id: 'streak_srm_4_i_os',
  name: 'Streak SRM 4 (I-OS)',
  category: 'Missile Weapons',
  baseType: 'Streak SRM 4',
  description: 'Streak SRM 4 (I-OS) - Improved One-Shot self-guided short-range missile system',
  requiresAmmo: false,
  introductionYear: 3142,
  rulesLevel: 'Standard',
  techRating: 'F',
  sourceBook: 'TRO 3151',
  pageReference: '45',
  variants: {
    Clan: {
      weight: 1,
      crits: 1,
      damage: 8,
      heat: 3,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 45000,
      battleValue: 29
    },
    IS: {
      weight: 2,
      crits: 1,
      damage: 8,
      heat: 3,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 45000,
      battleValue: 29
    }
  }
};

export const STREAK_SRM_4_AMMO: Equipment = {
  id: 'streak_srm_4_ammo',
  name: 'Streak SRM 4 Ammo',
  category: 'Missile Weapons',
  baseType: 'Streak SRM 4 Ammo',
  description: 'Streak SRM 4 Ammo - Ammunition for Streak SRM 4 systems',
  requiresAmmo: false,
  introductionYear: 3078,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '229',
  variants: {
    Clan: {
      weight: 1,
      crits: 1,
      damage: 8,
      heat: 3,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 27000,
      battleValue: 59
    },
    IS: {
      weight: 2,
      crits: 1,
      damage: 8,
      heat: 3,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 27000,
      battleValue: 59
    }
  }
};

export const STREAK_SRM_4: Equipment = {
  id: 'streak_srm_4',
  name: 'Streak SRM 4',
  category: 'Missile Weapons',
  baseType: 'Streak SRM 4',
  description: 'Streak SRM 4 - Self-guided short-range missile system',
  requiresAmmo: true,
  introductionYear: 2647,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '229',
  variants: {
    Clan: {
      weight: 1,
      crits: 1,
      damage: 8,
      heat: 3,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 90000,
      battleValue: 59
    },
    IS: {
      weight: 2,
      crits: 1,
      damage: 8,
      heat: 3,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 90000,
      battleValue: 59
    }
  }
};

export const STREAK_SRM_6: Equipment = {
  id: 'streak_srm_6',
  name: 'Streak SRM 6',
  category: 'Missile Weapons',
  baseType: 'Streak SRM 6',
  description: 'Streak SRM 6 - Self-guided heavy short-range missile system',
  requiresAmmo: true,
  introductionYear: 2825,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '229',
  variants: {
    Clan: {
      weight: 1.5,
      crits: 1,
      damage: 12,
      heat: 4,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 120000,
      battleValue: 89
    },
    IS: {
      weight: 3,
      crits: 2,
      damage: 12,
      heat: 4,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 120000,
      battleValue: 89
    }
  }
};

export const STREAK_SRM_6_AMMO: Equipment = {
  id: 'streak_srm_6_ammo',
  name: 'Streak SRM 6 Ammo',
  category: 'Missile Weapons',
  baseType: 'Streak SRM 6 Ammo',
  description: 'Streak SRM 6 Ammo - Ammunition for Streak SRM 6 systems',
  requiresAmmo: false,
  introductionYear: 2865,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '229',
  variants: {
    Clan: {
      weight: 1.5,
      crits: 1,
      damage: 12,
      heat: 4,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 40000,
      battleValue: 89
    },
    IS: {
      weight: 3,
      crits: 2,
      damage: 12,
      heat: 4,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 40000,
      battleValue: 89
    }
  }
}; 