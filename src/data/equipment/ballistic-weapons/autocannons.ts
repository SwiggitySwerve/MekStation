import { Equipment } from '../types';

// Standard AC weapons
export const AC_2: Equipment = {
  id: 'ac_2',
  name: 'AC/2',
  category: 'Ballistic Weapons',
  baseType: 'AC/2',
  description: 'Autocannon/2 - Long-range ballistic weapon',
  requiresAmmo: true,
  introductionYear: 2250,
  rulesLevel: 'Standard',
  sourceBook: 'TM',
  pageReference: '207',
  variants: {
    IS: {
      weight: 6,
      crits: 1,
      damage: 2,
      heat: 1,
      minRange: 0,
      rangeShort: 2,
      rangeMedium: 9,
      rangeLong: 18,
      cost: 75000,
      battleValue: 37
    }
  }
};

export const AC_5: Equipment = {
  id: 'ac_5',
  name: 'AC/5',
  category: 'Ballistic Weapons',
  baseType: 'AC/5',
  description: 'Autocannon/5 - Medium-range ballistic weapon',
  requiresAmmo: true,
  introductionYear: 2240,
  rulesLevel: 'Standard',
  sourceBook: 'TM',
  pageReference: '208',
  variants: {
    IS: {
      weight: 8,
      crits: 4,
      damage: 5,
      heat: 1,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 125000,
      battleValue: 70
    }
  }
};

export const AC_10: Equipment = {
  id: 'ac_10',
  name: 'AC/10',
  category: 'Ballistic Weapons',
  baseType: 'AC/10',
  description: 'Autocannon/10 - Medium-range ballistic weapon',
  requiresAmmo: true,
  introductionYear: 2180,
  rulesLevel: 'Standard',
  sourceBook: 'TM',
  pageReference: '208',
  variants: {
    IS: {
      weight: 12,
      crits: 7,
      damage: 10,
      heat: 3,
      minRange: 0,
      rangeShort: 5,
      rangeMedium: 10,
      rangeLong: 15,
      cost: 200000,
      battleValue: 123
    }
  }
};

export const AC_20: Equipment = {
  id: 'ac_20',
  name: 'AC/20',
  category: 'Ballistic Weapons',
  baseType: 'AC/20',
  description: 'Autocannon/20 - Heavy short-range ballistic weapon',
  requiresAmmo: true,
  introductionYear: 2165,
  rulesLevel: 'Standard',
  sourceBook: 'TM',
  pageReference: '208',
  variants: {
    IS: {
      weight: 14,
      crits: 10,
      damage: 20,
      heat: 7,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 300000,
      battleValue: 178
    }
  }
};

// Light AC variants
export const LAC_2: Equipment = {
  id: 'lac_2',
  name: 'LAC/2',
  category: 'Ballistic Weapons',
  baseType: 'LAC/2',
  description: 'Light Autocannon/2',
  requiresAmmo: true,
  introductionYear: 3080,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 4,
      crits: 1,
      damage: 2,
      heat: 1,
      minRange: 0,
      rangeShort: 2,
      rangeMedium: 10,
      rangeLong: 20,
      cost: 100000,
      battleValue: 30
    }
  }
};

export const LAC_5: Equipment = {
  id: 'lac_5',
  name: 'LAC/5',
  category: 'Ballistic Weapons',
  baseType: 'LAC/5',
  description: 'Light Autocannon/5',
  requiresAmmo: true,
  introductionYear: 3069,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 5,
      crits: 2,
      damage: 5,
      heat: 1,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 7,
      rangeLong: 14,
      cost: 150000,
      battleValue: 62
    }
  }
};

export const LIGHT_AC_2: Equipment = {
  id: 'light_ac_2',
  name: 'Light AC/2',
  category: 'Ballistic Weapons',
  baseType: 'Light AC/2',
  description: 'Light Autocannon/2 variant',
  requiresAmmo: true,
  introductionYear: 3107,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 4,
      crits: 1,
      damage: 2,
      heat: 1,
      minRange: 0,
      rangeShort: 2,
      rangeMedium: 10,
      rangeLong: 20,
      cost: 100000,
      battleValue: 30
    }
  }
};

export const LIGHT_AC_5: Equipment = {
  id: 'light_ac_5',
  name: 'Light AC/5',
  category: 'Ballistic Weapons',
  baseType: 'Light AC/5',
  description: 'Light Autocannon/5 variant',
  requiresAmmo: true,
  introductionYear: 3068,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 5,
      crits: 2,
      damage: 5,
      heat: 1,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 7,
      rangeLong: 14,
      cost: 150000,
      battleValue: 62
    }
  }
};

export const ROTARY_AC_2: Equipment = {
  id: 'rotary_ac_2',
  name: 'Rotary AC/2',
  category: 'Ballistic Weapons',
  baseType: 'Rotary AC/2',
  description: 'Rotary Autocannon/2 - Multi-barrel ballistic weapon',
  requiresAmmo: true,
  introductionYear: 3068,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 8,
      crits: 3,
      damage: 2,
      heat: 1,
      minRange: 0,
      rangeShort: 2,
      rangeMedium: 9,
      rangeLong: 18,
      cost: 150000,
      battleValue: 37
    }
  }
};

export const ROTARY_AC_5: Equipment = {
  id: 'rotary_ac_5',
  name: 'Rotary AC/5',
  category: 'Ballistic Weapons',
  baseType: 'Rotary AC/5',
  description: 'Rotary Autocannon/5 - Multi-barrel ballistic weapon',
  requiresAmmo: true,
  introductionYear: 3068,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 10,
      crits: 6,
      damage: 5,
      heat: 1,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 200000,
      battleValue: 70
    }
  }
};

export const HVAC_10: Equipment = {
  id: 'hvac_10',
  name: 'HVAC/10',
  category: 'Ballistic Weapons',
  baseType: 'HVAC/10',
  description: 'Hypervelocity Autocannon/10 - High-velocity ballistic weapon',
  requiresAmmo: true,
  introductionYear: 3070,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 12,
      crits: 7,
      damage: 10,
      heat: 3,
      minRange: 0,
      rangeShort: 5,
      rangeMedium: 10,
      rangeLong: 15,
      cost: 250000,
      battleValue: 123
    }
  }
};

export const PROTOMECH_AC_2: Equipment = {
  id: 'protomech_ac_2',
  name: 'ProtoMech AC/2',
  category: 'Ballistic Weapons',
  baseType: 'ProtoMech AC/2',
  description: 'ProtoMech Autocannon/2 - Lightweight ballistic weapon for ProtoMechs',
  requiresAmmo: true,
  introductionYear: 3060,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 1.5,
      crits: 1,
      damage: 2,
      heat: 1,
      minRange: 0,
      rangeShort: 2,
      rangeMedium: 9,
      rangeLong: 18,
      cost: 50000,
      battleValue: 37
    }
  }
}; 