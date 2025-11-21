import { Equipment } from '../types';

export const ER_LARGE_LASER: Equipment = {
  id: 'er_large_laser',
  name: 'ER Large Laser',
  category: 'Energy Weapons',
  baseType: 'ER Large Laser',
  description: 'Extended Range Large Laser',
  requiresAmmo: false,
  introductionYear: 2620,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    Clan: {
      weight: 4,
      crits: 1,
      damage: 8,
      heat: 12,
      minRange: 0,
      rangeShort: 8,
      rangeMedium: 15,
      rangeLong: 25,
      cost: 200000,
      battleValue: 163
    },
    IS: {
      weight: 5,
      crits: 2,
      damage: 8,
      heat: 12,
      minRange: 0,
      rangeShort: 7,
      rangeMedium: 14,
      rangeLong: 19,
      cost: 200000,
      battleValue: 163
    }
  }
};

export const ER_LARGE_PULSE_LASER: Equipment = {
  id: 'er_large_pulse_laser',
  name: 'ER Large Pulse Laser',
  category: 'Energy Weapons',
  baseType: 'ER Large Pulse Laser',
  description: 'Extended Range Large Pulse Laser - High-accuracy long-range energy weapon',
  requiresAmmo: false,
  introductionYear: 3068,
  rulesLevel: 'Standard',
  techRating: 'F',
  sourceBook: 'TM',
  pageReference: '226',
  variants: {
    Clan: {
      weight: 6,
      crits: 1,
      damage: 10,
      heat: 10,
      minRange: 0,
      rangeShort: 7,
      rangeMedium: 15,
      rangeLong: 23,
      cost: 400000,
      battleValue: 272
    },
    IS: {
      weight: 7,
      crits: 2,
      damage: 9,
      heat: 10,
      minRange: 0,
      rangeShort: 7,
      rangeMedium: 15,
      rangeLong: 23,
      cost: 400000,
      battleValue: 251
    }
  }
};

export const ER_MEDIUM_LASER: Equipment = {
  id: 'er_medium_laser',
  name: 'ER Medium Laser',
  category: 'Energy Weapons',
  baseType: 'ER Medium Laser',
  description: 'Extended Range Medium Laser',
  requiresAmmo: false,
  introductionYear: 2824,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    Clan: {
      weight: 1,
      crits: 1,
      damage: 7,
      heat: 5,
      minRange: 0,
      rangeShort: 5,
      rangeMedium: 10,
      rangeLong: 15,
      cost: 80000,
      battleValue: 108
    },
    IS: {
      weight: 1,
      crits: 1,
      damage: 5,
      heat: 5,
      minRange: 0,
      rangeShort: 4,
      rangeMedium: 8,
      rangeLong: 12,
      cost: 80000,
      battleValue: 62
    }
  }
};

export const ER_MEDIUM_PULSE_LASER: Equipment = {
  id: 'er_medium_pulse_laser',
  name: 'ER Medium Pulse Laser',
  category: 'Energy Weapons',
  baseType: 'ER Medium Pulse Laser',
  description: 'Extended Range Medium Pulse Laser - Enhanced accuracy with extended range',
  requiresAmmo: false,
  introductionYear: 3063,
  rulesLevel: 'Standard',
  techRating: 'F',
  sourceBook: 'TM',
  pageReference: '226',
  variants: {
    IS: {
      weight: 2,
      crits: 1,
      damage: 6,
      heat: 4,
      minRange: 0,
      rangeShort: 4,
      rangeMedium: 8,
      rangeLong: 12,
      cost: 150000,
      battleValue: 117
    }
  }
};

export const ER_SMALL_LASER: Equipment = {
  id: 'er_small_laser',
  name: 'ER Small Laser',
  category: 'Energy Weapons',
  baseType: 'ER Small Laser',
  description: 'Extended Range Small Laser - Enhanced range energy weapon',
  requiresAmmo: false,
  introductionYear: 2825,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '226',
  variants: {
    Clan: {
      weight: 0.5,
      crits: 1,
      damage: 5,
      heat: 2,
      minRange: 0,
      rangeShort: 2,
      rangeMedium: 4,
      rangeLong: 6,
      cost: 11250,
      battleValue: 31
    },
    IS: {
      weight: 0.5,
      crits: 1,
      damage: 3,
      heat: 2,
      minRange: 0,
      rangeShort: 2,
      rangeMedium: 4,
      rangeLong: 6,
      cost: 11250,
      battleValue: 17
    }
  }
};

export const ER_SMALL_PULSE_LASER: Equipment = {
  id: 'er_small_pulse_laser',
  name: 'ER Small Pulse Laser',
  category: 'Energy Weapons',
  baseType: 'ER Small Pulse Laser',
  description: 'Extended Range Small Pulse Laser - Enhanced accuracy with extended range',
  requiresAmmo: false,
  introductionYear: 3068,
  rulesLevel: 'Standard',
  techRating: 'F',
  sourceBook: 'TM',
  pageReference: '226',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      damage: 3,
      heat: 2,
      minRange: 0,
      rangeShort: 2,
      rangeMedium: 4,
      rangeLong: 6,
      cost: 30000,
      battleValue: 21
    }
  }
};

export const HEAVY_LARGE_LASER: Equipment = {
  id: 'heavy_large_laser',
  name: 'Heavy Large Laser',
  category: 'Energy Weapons',
  baseType: 'Heavy Large Laser',
  description: 'Heavy Large Laser - Reduced heat long-range energy weapon',
  requiresAmmo: false,
  introductionYear: 3059,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '226',
  variants: {
    IS: {
      weight: 5,
      crits: 2,
      damage: 8,
      heat: 8,
      minRange: 0,
      rangeShort: 5,
      rangeMedium: 10,
      rangeLong: 15,
      cost: 90000,
      battleValue: 123
    }
  }
};

export const HEAVY_MEDIUM_LASER: Equipment = {
  id: 'heavy_medium_laser',
  name: 'Heavy Medium Laser',
  category: 'Energy Weapons',
  baseType: 'Heavy Medium Laser',
  description: 'Heavy Medium Laser - Reduced heat medium-range energy weapon',
  requiresAmmo: false,
  introductionYear: 3059,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '226',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      damage: 5,
      heat: 3,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 20000,
      battleValue: 46
    }
  }
};

export const HEAVY_SMALL_LASER: Equipment = {
  id: 'heavy_small_laser',
  name: 'Heavy Small Laser',
  category: 'Energy Weapons',
  baseType: 'Heavy Small Laser',
  description: 'Heavy Small Laser - Reduced heat short-range energy weapon',
  requiresAmmo: false,
  introductionYear: 3059,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '226',
  variants: {
    Clan: {
      weight: 0.5,
      crits: 1,
      damage: 3,
      heat: 1,
      minRange: 0,
      rangeShort: 1,
      rangeMedium: 2,
      rangeLong: 3,
      cost: 6000,
      battleValue: 20
    }
  }
};

export const LARGE_PULSE_LASER: Equipment = {
  id: 'large_pulse_laser',
  name: 'Large Pulse Laser',
  category: 'Energy Weapons',
  baseType: 'Large Pulse Laser',
  description: 'Large Pulse Laser - Enhanced accuracy long-range energy weapon',
  requiresAmmo: false,
  introductionYear: 2660,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '226',
  variants: {
    IS: {
      weight: 7,
      crits: 2,
      damage: 9,
      heat: 10,
      minRange: 0,
      rangeShort: 6,
      rangeMedium: 14,
      rangeLong: 20,
      cost: 175000,
      battleValue: 119
    }
  }
};

export const MEDIUM_LASER: Equipment = {
  id: 'medium_laser',
  name: 'Medium Laser',
  category: 'Energy Weapons',
  baseType: 'Medium Laser',
  description: 'Medium Laser - Standard medium-range energy weapon',
  requiresAmmo: false,
  introductionYear: 2442,
  rulesLevel: 'Standard',
  techRating: 'C',
  sourceBook: 'TM',
  pageReference: '226',
  variants: {
    Clan: {
      weight: 1,
      crits: 1,
      damage: 5,
      heat: 3,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 40000,
      battleValue: 46
    },
    IS: {
      weight: 1,
      crits: 1,
      damage: 5,
      heat: 3,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 40000,
      battleValue: 46
    }
  }
};

export const MEDIUM_PULSE_LASER: Equipment = {
  id: 'medium_pulse_laser',
  name: 'Medium Pulse Laser',
  category: 'Energy Weapons',
  baseType: 'Medium Pulse Laser',
  description: 'Medium Pulse Laser - Enhanced accuracy medium-range energy weapon',
  requiresAmmo: false,
  introductionYear: 2609,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '226',
  variants: {
    IS: {
      weight: 2,
      crits: 1,
      damage: 6,
      heat: 4,
      minRange: 0,
      rangeShort: 4,
      rangeMedium: 8,
      rangeLong: 12,
      cost: 60000,
      battleValue: 48
    }
  }
};

export const SMALL_LASER: Equipment = {
  id: 'small_laser',
  name: 'Small Laser',
  category: 'Energy Weapons',
  baseType: 'Small Laser',
  description: 'Small Laser - Standard short-range energy weapon',
  requiresAmmo: false,
  introductionYear: 2445,
  rulesLevel: 'Standard',
  techRating: 'C',
  sourceBook: 'TM',
  pageReference: '226',
  variants: {
    Clan: {
      weight: 0.5,
      crits: 1,
      damage: 3,
      heat: 1,
      minRange: 0,
      rangeShort: 1,
      rangeMedium: 2,
      rangeLong: 3,
      cost: 11250,
      battleValue: 20
    },
    IS: {
      weight: 0.5,
      crits: 1,
      damage: 3,
      heat: 1,
      minRange: 0,
      rangeShort: 1,
      rangeMedium: 2,
      rangeLong: 3,
      cost: 11250,
      battleValue: 20
    }
  }
};

export const SMALL_PULSE_LASER: Equipment = {
  id: 'small_pulse_laser',
  name: 'Small Pulse Laser',
  category: 'Energy Weapons',
  baseType: 'Small Pulse Laser',
  description: 'Small Pulse Laser - Enhanced accuracy short-range energy weapon',
  requiresAmmo: false,
  introductionYear: 2610,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '226',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      damage: 3,
      heat: 2,
      minRange: 0,
      rangeShort: 2,
      rangeMedium: 4,
      rangeLong: 6,
      cost: 16000,
      battleValue: 24
    }
  }
};

export const LARGE_LASER: Equipment = {
  id: 'large_laser',
  name: 'Large Laser',
  category: 'Energy Weapons',
  baseType: 'Large Laser',
  description: 'Large Laser - Standard long-range energy weapon',
  requiresAmmo: false,
  introductionYear: 2316,
  rulesLevel: 'Standard',
  techRating: 'C',
  sourceBook: 'TM',
  pageReference: '227',
  variants: {
    Clan: {
      weight: 5,
      crits: 1,
      damage: 8,
      heat: 8,
      minRange: 0,
      rangeShort: 5,
      rangeMedium: 10,
      rangeLong: 15,
      cost: 100000,
      battleValue: 123
    },
    IS: {
      weight: 5,
      crits: 2,
      damage: 8,
      heat: 8,
      minRange: 0,
      rangeShort: 5,
      rangeMedium: 10,
      rangeLong: 15,
      cost: 100000,
      battleValue: 123
    }
  }
};

export const BASIC_LASERS: Equipment[] = [
  ER_LARGE_LASER,
  ER_LARGE_PULSE_LASER,
  ER_MEDIUM_LASER,
  ER_MEDIUM_PULSE_LASER,
  ER_SMALL_LASER,
  ER_SMALL_PULSE_LASER,
  HEAVY_LARGE_LASER,
  HEAVY_MEDIUM_LASER,
  HEAVY_SMALL_LASER,
  LARGE_PULSE_LASER,
  MEDIUM_LASER,
  MEDIUM_PULSE_LASER,
  SMALL_LASER,
  SMALL_PULSE_LASER,
  LARGE_LASER
]; 