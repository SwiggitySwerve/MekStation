import { Equipment } from '../types';

export const SWORD: Equipment = {
  id: 'sword',
  name: 'Sword',
  category: 'Physical Weapons',
  baseType: 'Sword',
  description: 'Sword - Melee cutting weapon for close combat',
  requiresAmmo: false,
  introductionYear: 2439,
  rulesLevel: 'Standard',
  techRating: 'A',
  sourceBook: 'TM',
  pageReference: '231',
  variants: {
    IS: {
      weight: 3,
      crits: 3,
      damage: 0,
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      cost: 20000,
      battleValue: 25
    }
  }
};

export const MACE: Equipment = {
  id: 'mace',
  name: 'Mace',
  category: 'Physical Weapons',
  baseType: 'Mace',
  description: 'BattleMech Mace - Heavy blunt melee weapon',
  requiresAmmo: false,
  introductionYear: 2439,
  rulesLevel: 'Standard',
  techRating: 'B',
  sourceBook: 'TM',
  pageReference: '231',
  variants: {
    IS: {
      weight: 0, // Variable weight based on mech tonnage
      crits: 0, // Variable slots based on mech tonnage
      damage: 0, // Variable damage based on mech tonnage
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      cost: 130000,
      battleValue: 140
    }
  }
};

export const HATCHET: Equipment = {
  id: 'hatchet',
  name: 'Hatchet',
  category: 'Physical Weapons',
  baseType: 'Hatchet',
  description: 'BattleMech Hatchet - Axe-like melee weapon',
  requiresAmmo: false,
  introductionYear: 2439,
  rulesLevel: 'Standard',
  techRating: 'B',
  sourceBook: 'TM',
  pageReference: '231',
  variants: {
    IS: {
      weight: 0, // Variable weight based on mech tonnage
      crits: 0, // Variable slots based on mech tonnage
      damage: 0, // Variable damage based on mech tonnage
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      cost: 100000,
      battleValue: 95
    }
  }
};

export const LANCE: Equipment = {
  id: 'lance',
  name: 'Lance',
  category: 'Physical Weapons',
  baseType: 'Lance',
  description: 'BattleMech Lance - Piercing melee weapon',
  requiresAmmo: false,
  introductionYear: 2470,
  rulesLevel: 'Standard',
  techRating: 'B',
  sourceBook: 'TM',
  pageReference: '231',
  variants: {
    IS: {
      weight: 0, // Variable weight based on mech tonnage
      crits: 0, // Variable slots based on mech tonnage
      damage: 0, // Variable damage based on mech tonnage
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      cost: 75000,
      battleValue: 85
    }
  }
};

export const CHAIN_WHIP: Equipment = {
  id: 'chain_whip',
  name: 'Chain Whip',
  category: 'Physical Weapons',
  baseType: 'Chain Whip',
  description: 'Chain Whip - Flexible melee weapon with extended reach',
  requiresAmmo: false,
  introductionYear: 3059,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 3,
      crits: 3,
      damage: 0, // Variable damage based on attack type
      heat: 0,
      minRange: 0,
      rangeShort: 1,
      rangeMedium: 1,
      rangeLong: 1,
      cost: 120000,
      battleValue: 30
    }
  }
};

export const FLAIL: Equipment = {
  id: 'flail',
  name: 'Flail',
  category: 'Physical Weapons',
  baseType: 'Flail',
  description: 'Flail - Ball and chain melee weapon',
  requiresAmmo: false,
  introductionYear: 3059,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 0, // Variable weight based on mech tonnage
      crits: 0, // Variable slots based on mech tonnage
      damage: 0, // Variable damage based on mech tonnage
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      cost: 110000,
      battleValue: 65
    }
  }
};

export const RETRACTABLE_BLADE: Equipment = {
  id: 'retractable_blade',
  name: 'Retractable Blade',
  category: 'Physical Weapons',
  baseType: 'Retractable Blade',
  description: 'Retractable Blade - Concealed melee weapon',
  requiresAmmo: false,
  introductionYear: 3059,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 0, // Variable weight based on mech tonnage
      crits: 0, // Variable slots based on mech tonnage
      damage: 0, // Variable damage based on mech tonnage
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      cost: 90000,
      battleValue: 55
    }
  }
};

export const VIBROBLADE: Equipment = {
  id: 'vibroblade',
  name: 'Vibroblade',
  category: 'Physical Weapons',
  baseType: 'Vibroblade',
  description: 'Vibroblade - High-frequency vibrating blade weapon',
  requiresAmmo: false,
  introductionYear: 3059,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 0, // Variable weight based on mech tonnage
      crits: 0, // Variable slots based on mech tonnage
      damage: 0, // Variable damage based on mech tonnage
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      cost: 150000,
      battleValue: 95
    }
  }
};

export const TALON: Equipment = {
  id: 'talon',
  name: 'Talon',
  category: 'Physical Weapons',
  baseType: 'Talon',
  description: 'Talon - Claw-like melee weapon',
  requiresAmmo: false,
  introductionYear: 3059,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 0, // Variable weight based on mech tonnage
      crits: 0, // Variable slots based on mech tonnage
      damage: 0, // Variable damage based on mech tonnage
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      cost: 85000,
      battleValue: 50
    }
  }
};

export const SPIKES: Equipment = {
  id: 'spikes',
  name: 'Spikes',
  category: 'Physical Weapons',
  baseType: 'Spikes',
  description: 'Spikes - Defensive spikes for ramming attacks',
  requiresAmmo: false,
  introductionYear: 3059,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '231',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      damage: 0, // Damage bonus for ramming/charging
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      cost: 50000,
      battleValue: 5
    }
  }
};

export const CLUB: Equipment = {
  id: 'club',
  name: 'Club',
  category: 'Physical Weapons',
  baseType: 'Club',
  description: 'Club - Simple blunt melee weapon',
  requiresAmmo: false,
  introductionYear: 2439,
  rulesLevel: 'Standard',
  techRating: 'A',
  variants: {
    IS: {
      weight: 0, // Uses found objects or limbs
      crits: 0,
      damage: 0, // Variable damage based on improvised weapon
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      cost: 1000,
      battleValue: 5
    }
  }
};

export const CHAINSAW: Equipment = {
  id: 'chainsaw',
  name: 'Chainsaw',
  category: 'Physical Weapons',
  baseType: 'Chainsaw',
  description: 'Chainsaw - Industrial cutting tool adapted for combat',
  requiresAmmo: false,
  introductionYear: 2300,
  rulesLevel: 'Standard',
  techRating: 'B',
  sourceBook: 'TM',
  pageReference: '231',
  variants: {
    IS: {
      weight: 5,
      crits: 5,
      damage: 0, // Variable damage based on attack
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      cost: 100000,
      battleValue: 7
    }
  }
}; 