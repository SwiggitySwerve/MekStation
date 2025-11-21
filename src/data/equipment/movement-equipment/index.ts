import { Equipment } from './types';

// Standard Jump Jet
export const JUMP_JET: Equipment = {
  id: 'standard_jump_jet',
  name: 'Standard Jump Jet',
  category: 'Movement Equipment',
  baseType: 'Standard Jump Jet',
  description: 'Standard propulsion system for short-range vertical movement. Weight varies by mech tonnage.',
  requiresAmmo: false,
  introductionYear: 2670,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 0, // Calculated dynamically: 0.5t (≤55t), 1t (56-85t), 2t (≥86t)
      crits: 1,
      damage: 0,
      heat: 1, // 1 heat per MP when jumping
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 200000,
      battleValue: 0
    },
    Clan: {
      weight: 0, // Calculated dynamically: 0.5t (≤55t), 1t (56-85t), 2t (≥86t)
      crits: 1,
      damage: 0,
      heat: 1, // 1 heat per MP when jumping
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 200000,
      battleValue: 0
    }
  },
  special: ['Jump MP ≤ Walk MP', 'Variable Weight', 'Standard Technology'],
  allowedLocations: ['Center Torso', 'Left Torso', 'Right Torso', 'Left Leg', 'Right Leg']
};

// Improved Jump Jet
export const IMPROVED_JUMP_JET: Equipment = {
  id: 'improved_jump_jet',
  name: 'Improved Jump Jet',
  category: 'Movement Equipment',
  baseType: 'Improved Jump Jet',
  description: 'Enhanced jump jet with improved efficiency. Same weight as standard but takes 2 critical slots.',
  requiresAmmo: false,
  introductionYear: 3064,
  rulesLevel: 'Advanced',
  variants: {
    IS: {
      weight: 0, // Calculated dynamically: same as standard JJ
      crits: 2,
      damage: 0,
      heat: 1, // 1 heat per MP when jumping
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 500000,
      battleValue: 0
    }
  },
  special: ['Jump MP ≤ Walk MP', 'Variable Weight', 'Improved Efficiency', 'Inner Sphere Only'],
  allowedLocations: ['Center Torso', 'Left Torso', 'Right Torso', 'Left Leg', 'Right Leg']
};

// Extended Jump Jet (Prototype)
export const EXTENDED_JUMP_JET: Equipment = {
  id: 'extended_jump_jet',
  name: 'Extended Jump Jet',
  category: 'Movement Equipment',
  baseType: 'Extended Jump Jet',
  description: 'Prototype jump jet allowing jump movement up to run speed. Predecessor to Improved Jump Jets.',
  requiresAmmo: false,
  introductionYear: 3050,
  rulesLevel: 'Experimental',
  variants: {
    IS: {
      weight: 0, // Calculated dynamically: same as standard JJ
      crits: 1,
      damage: 0,
      heat: 1, // 1 heat per MP when jumping
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 400000,
      battleValue: 0
    }
  },
  special: ['Jump MP ≤ Run MP', 'Variable Weight', 'Prototype Technology', 'Experimental'],
  allowedLocations: ['Center Torso', 'Left Torso', 'Right Torso', 'Left Leg', 'Right Leg']
};

// UMU (Underwater Maneuvering Unit)
export const UMU: Equipment = {
  id: 'umu',
  name: 'UMU',
  category: 'Movement Equipment',
  baseType: 'UMU',
  description: 'Underwater propulsion system for aquatic operations. Functions like jump jets but only underwater.',
  requiresAmmo: false,
  introductionYear: 2300,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 0, // Calculated dynamically: same as standard JJ
      crits: 1,
      damage: 0,
      heat: 1, // 1 heat per MP when using
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 200000,
      battleValue: 0
    },
    Clan: {
      weight: 0, // Calculated dynamically: same as standard JJ
      crits: 1,
      damage: 0,
      heat: 1, // 1 heat per MP when using
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 200000,
      battleValue: 0
    }
  },
  special: ['Jump MP ≤ Walk MP', 'Variable Weight', 'Underwater Only', 'Aquatic Operations'],
  allowedLocations: ['Center Torso', 'Left Torso', 'Right Torso', 'Left Leg', 'Right Leg']
};

// Mechanical Jump Booster
export const MECHANICAL_JUMP_BOOSTER: Equipment = {
  id: 'mechanical_jump_booster',
  name: 'Mechanical Jump Booster',
  category: 'Movement Equipment',
  baseType: 'Mechanical Jump Booster',
  description: 'Heavy mechanical system providing exactly 1 Jump MP. Weighs 10% of mech tonnage.',
  requiresAmmo: false,
  introductionYear: 3057,
  rulesLevel: 'Advanced',
  variants: {
    IS: {
      weight: 0, // Calculated dynamically: mechTonnage * 0.1
      crits: 0, // Variable: 4-8 based on tonnage
      damage: 0,
      heat: 1, // 1 heat when jumping
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 1000000,
      battleValue: 0
    }
  },
  special: ['Maximum 1 Jump MP Total', 'Very Heavy', 'Variable Critical Slots', 'Advanced Technology'],
  allowedLocations: ['Center Torso', 'Left Torso', 'Right Torso', 'Left Leg', 'Right Leg']
};

// Partial Wing
export const PARTIAL_WING: Equipment = {
  id: 'partial_wing',
  name: 'Partial Wing',
  category: 'Movement Equipment',
  baseType: 'Partial Wing',
  description: 'Aerodynamic surfaces that reduce jump jet weight by 50%. Requires other jump jets to function.',
  requiresAmmo: false,
  introductionYear: 3057,
  rulesLevel: 'Advanced',
  variants: {
    IS: {
      weight: 0, // Calculated dynamically: 2-5t based on tonnage
      crits: 6, // 3 per side torso
      damage: 0,
      heat: 0, // No heat generation
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 500000,
      battleValue: 0
    }
  },
  special: ['Reduces Other JJ Weight by 50%', 'Requires Other Jump Jets', 'Multiple Locations', 'Advanced Technology'],
  allowedLocations: ['Left Torso', 'Right Torso']
};

// Jump Booster (Clan)
export const JUMP_BOOSTER: Equipment = {
  id: 'jump_booster',
  name: 'Jump Booster',
  category: 'Movement Equipment',
  baseType: 'Jump Booster',
  description: 'Clan version of improved jump jets with enhanced efficiency and reliability.',
  requiresAmmo: false,
  introductionYear: 3055,
  rulesLevel: 'Advanced',
  variants: {
    Clan: {
      weight: 0, // Calculated dynamically: same as standard JJ
      crits: 2,
      damage: 0,
      heat: 1, // 1 heat per MP when jumping
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 600000,
      battleValue: 0
    }
  },
  special: ['Jump MP ≤ Walk MP', 'Variable Weight', 'Clan Technology', 'Enhanced Reliability'],
  allowedLocations: ['Center Torso', 'Left Torso', 'Right Torso', 'Left Leg', 'Right Leg']
};

// Prototype Jump Jet
export const PROTOTYPE_JUMP_JET: Equipment = {
  id: 'prototype_jump_jet',
  name: 'Prototype Jump Jet',
  category: 'Movement Equipment',
  baseType: 'Prototype Jump Jet',
  description: 'Early experimental jump jet design. Less efficient and generates more heat than modern versions.',
  requiresAmmo: false,
  introductionYear: 2600,
  rulesLevel: 'Experimental',
  variants: {
    IS: {
      weight: 0, // Calculated dynamically: same as standard JJ
      crits: 2,
      damage: 0,
      heat: 2, // 2 heat per MP when jumping - less efficient
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 150000,
      battleValue: 0
    }
  },
  special: ['Jump MP ≤ Walk MP', 'Variable Weight', 'Unreliable', 'High Heat Generation', 'Primitive Technology'],
  allowedLocations: ['Center Torso', 'Left Torso', 'Right Torso', 'Left Leg', 'Right Leg']
};

// Supercharger
export const SUPERCHARGER: Equipment = {
  id: 'supercharger',
  name: 'Supercharger',
  category: 'Movement Equipment',
  baseType: 'Supercharger',
  description: 'Engine enhancement system for increased movement speed. Must be placed in locations with engine slots.',
  requiresAmmo: false,
  introductionYear: 3062,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 0, // Variable based on engine rating
      crits: 1,
      damage: 0,
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 0, // Variable based on engine rating
      battleValue: 0
    },
    Clan: {
      weight: 0, // Variable based on engine rating
      crits: 1,
      damage: 0,
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      rangeExtreme: 0,
      cost: 0, // Variable based on engine rating
      battleValue: 0
    }
  },
  special: ['Movement Enhancement', 'Variable Weight', 'Speed Boost', 'Engine Slots Only'],
  locationRestrictions: {
    type: 'engine_slots'
  }
};

export const MOVEMENT_EQUIPMENT: Equipment[] = [
  JUMP_JET,
  IMPROVED_JUMP_JET,
  EXTENDED_JUMP_JET,
  UMU,
  MECHANICAL_JUMP_BOOSTER,
  PARTIAL_WING,
  JUMP_BOOSTER,
  PROTOTYPE_JUMP_JET,
  SUPERCHARGER
];
