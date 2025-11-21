import { Equipment } from './types';

// Prototype Double Heat Sink
export const PROTOTYPE_DOUBLE_HEAT_SINK: Equipment = {
  id: 'prototype_double_heat_sink',
  name: 'Prototype Double Heat Sink',
  category: 'Prototype Equipment',
  baseType: 'Prototype Double Heat Sink',
  description: 'Early experimental double heat sink technology',
  requiresAmmo: false,
  introductionYear: 2557,
  rulesLevel: 'Experimental',
  variants: {
    IS: {
      weight: 1,
      crits: 2,
      damage: 0,
      heat: -2, // Heat dissipation
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 6000,
      battleValue: 0
    }
  },
  special: ['Heat Sink', 'Prototype', 'Cannot Be Engine-Mounted']
};

// Prototype Pulse Laser
export const PROTOTYPE_PULSE_LASER: Equipment = {
  id: 'prototype_pulse_laser',
  name: 'Prototype Pulse Laser',
  category: 'Prototype Equipment',
  baseType: 'Prototype Pulse Laser',
  description: 'Experimental pulse laser with improved accuracy',
  requiresAmmo: false,
  introductionYear: 3057,
  rulesLevel: 'Experimental',
  variants: {
    IS: {
      weight: 2,
      crits: 1,
      damage: 6,
      heat: 4,
      minRange: 0,
      rangeShort: 2,
      rangeMedium: 5,
      rangeLong: 7,
      rangeExtreme: 10,
      cost: 100000,
      battleValue: 88
    }
  },
  special: ['Energy Weapon', 'Pulse', 'Prototype', 'Accuracy Bonus']
};

// Prototype Gauss Rifle
export const PROTOTYPE_GAUSS_RIFLE: Equipment = {
  id: 'prototype_gauss_rifle',
  name: 'Prototype Gauss Rifle',
  category: 'Prototype Equipment',
  baseType: 'Prototype Gauss Rifle',
  description: 'Early experimental electromagnetic projectile weapon',
  requiresAmmo: true,
  introductionYear: 2587,
  rulesLevel: 'Experimental',
  variants: {
    IS: {
      weight: 15,
      crits: 7,
      damage: 15,
      heat: 1,
      minRange: 2,
      rangeShort: 7,
      rangeMedium: 15,
      rangeLong: 22,
      rangeExtreme: 30,
      cost: 300000,
      battleValue: 320
    }
  },
  special: ['Ballistic Weapon', 'Prototype', 'Electromagnetic', 'Explodes on Critical Hit']
};

// Prototype Ferro-Fibrous Armor
export const PROTOTYPE_FERRO_FIBROUS: Equipment = {
  id: 'prototype_ferro_fibrous',
  name: 'Prototype Ferro-Fibrous Armor',
  category: 'Prototype Equipment',
  baseType: 'Prototype Ferro-Fibrous',
  description: 'Experimental lightweight armor with improved protection',
  requiresAmmo: false,
  introductionYear: 2557,
  rulesLevel: 'Experimental',
  variants: {
    IS: {
      weight: 0, // Variable based on armor points
      crits: 16, // Spread across locations
      damage: 0,
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 0, // Cost per armor point
      battleValue: 0
    }
  },
  special: ['Armor', 'Prototype', 'Weight Reduction', 'Spreadable']
};

// Prototype Endo Steel
export const PROTOTYPE_ENDO_STEEL: Equipment = {
  id: 'prototype_endo_steel',
  name: 'Prototype Endo Steel',
  category: 'Prototype Equipment',
  baseType: 'Prototype Endo Steel',
  description: 'Experimental internal structure with reduced weight',
  requiresAmmo: false,
  introductionYear: 2557,
  rulesLevel: 'Experimental',
  variants: {
    IS: {
      weight: 0, // Weight reduction for structure
      crits: 16, // Spread across locations
      damage: 0,
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 0,
      battleValue: 0
    }
  },
  special: ['Structure', 'Prototype', 'Weight Reduction', 'Spreadable']
};

// Prototype Jump Jet
export const PROTOTYPE_JUMP_JET: Equipment = {
  id: 'prototype_jump_jet',
  name: 'Prototype Jump Jet',
  category: 'Prototype Equipment',
  baseType: 'Prototype Jump Jet',
  description: 'Early experimental jump jet technology',
  requiresAmmo: false,
  introductionYear: 2670,
  rulesLevel: 'Experimental',
  variants: {
    IS: {
      weight: 0, // Variable based on Mek tonnage
      crits: 1,
      damage: 0,
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 300000,
      battleValue: 0
    }
  },
  special: ['Jump Jets', 'Prototype', 'Variable Weight', 'Unreliable']
};

// Prototype Artemis IV
export const PROTOTYPE_ARTEMIS_IV: Equipment = {
  id: 'prototype_artemis_iv',
  name: 'Prototype Artemis IV',
  category: 'Prototype Equipment',
  baseType: 'Prototype Artemis IV',
  description: 'Early fire control system for missile weapons',
  requiresAmmo: false,
  introductionYear: 2592,
  rulesLevel: 'Experimental',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      damage: 0,
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 100000,
      battleValue: 0
    }
  },
  special: ['Fire Control', 'Prototype', 'Links to Missiles', 'Accuracy Bonus']
};

// Prototype C3 Computer
export const PROTOTYPE_C3_COMPUTER: Equipment = {
  id: 'prototype_c3_computer',
  name: 'Prototype C3 Computer',
  category: 'Prototype Equipment',
  baseType: 'Prototype C3 Computer',
  description: 'Experimental command and control system',
  requiresAmmo: false,
  introductionYear: 2597,
  rulesLevel: 'Experimental',
  variants: {
    IS: {
      weight: 5,
      crits: 5,
      damage: 0,
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 750000,
      battleValue: 0
    }
  },
  special: ['C3 Network', 'Prototype', 'Master Unit', 'Target Sharing']
};

// Prototype Stealth Armor
export const PROTOTYPE_STEALTH_ARMOR: Equipment = {
  id: 'prototype_stealth_armor',
  name: 'Prototype Stealth Armor',
  category: 'Prototype Equipment',
  baseType: 'Prototype Stealth Armor',
  description: 'Experimental radar-absorbing armor system',
  requiresAmmo: false,
  introductionYear: 3063,
  rulesLevel: 'Experimental',
  variants: {
    IS: {
      weight: 0, // Variable based on armor
      crits: 12, // Spread across locations
      damage: 0,
      heat: 10, // Heat penalty
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 0,
      battleValue: 0
    }
  },
  special: ['Armor', 'Prototype', 'Stealth', 'Heat Generation', 'Spreadable']
};

// Prototype ER Laser
export const PROTOTYPE_ER_LASER: Equipment = {
  id: 'prototype_er_laser',
  name: 'Prototype ER Large Laser',
  category: 'Prototype Equipment',
  baseType: 'Prototype ER Large Laser',
  description: 'Experimental extended range laser technology',
  requiresAmmo: false,
  introductionYear: 2594,
  rulesLevel: 'Experimental',
  variants: {
    IS: {
      weight: 5,
      crits: 2,
      damage: 8,
      heat: 12,
      minRange: 0,
      rangeShort: 7,
      rangeMedium: 14,
      rangeLong: 19,
      rangeExtreme: 28,
      cost: 200000,
      battleValue: 163
    }
  },
  special: ['Energy Weapon', 'Prototype', 'Extended Range', 'High Heat']
};

export const PROTOTYPE_EQUIPMENT: Equipment[] = [
  PROTOTYPE_DOUBLE_HEAT_SINK,
  PROTOTYPE_PULSE_LASER,
  PROTOTYPE_GAUSS_RIFLE,
  PROTOTYPE_FERRO_FIBROUS,
  PROTOTYPE_ENDO_STEEL,
  PROTOTYPE_JUMP_JET,
  PROTOTYPE_ARTEMIS_IV,
  PROTOTYPE_C3_COMPUTER,
  PROTOTYPE_STEALTH_ARMOR,
  PROTOTYPE_ER_LASER
];
