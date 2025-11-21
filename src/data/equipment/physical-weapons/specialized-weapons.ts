import { Equipment } from '../types';

export const PROTOMECH_QUAD_MELEE: Equipment = {
  id: 'protomech_quad_melee',
  name: 'ProtoMech Quad Melee Weapon System',
  category: 'Physical Weapons',
  baseType: 'ProtoMech Quad Melee Weapon System',
  description: 'ProtoMech Quad Melee Weapon System - Specialized ProtoMech melee weapon',
  requiresAmmo: false,
  introductionYear: 3110,
  rulesLevel: 'Standard',
  techRating: 'F',
  variants: {
    Clan: {
      weight: 0, // Variable weight based on ProtoMech tonnage
      crits: 0, // Variable slots based on ProtoMech tonnage
      damage: 0, // Variable damage based on ProtoMech tonnage
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      cost: 300000,
      battleValue: 25
    }
  }
};

export const CLAWS: Equipment = {
  id: 'claws',
  name: 'Claws',
  category: 'Physical Weapons',
  baseType: 'Claws',
  description: 'Claws - Natural-style melee weapons',
  requiresAmmo: false,
  introductionYear: 2470,
  rulesLevel: 'Standard',
  techRating: 'B',
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
      cost: 200000,
      battleValue: 15
    },
    Clan: {
      weight: 0, // Variable weight based on mech tonnage
      crits: 0, // Variable slots based on mech tonnage
      damage: 0, // Variable damage based on mech tonnage
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      cost: 200000,
      battleValue: 15
    }
  }
};

export const COMBINE_HARVESTER: Equipment = {
  id: 'combine_harvester',
  name: 'Combine',
  category: 'Physical Weapons',
  baseType: 'Combine',
  description: 'Combine Harvester - Agricultural equipment used as improvised weapon',
  requiresAmmo: false,
  introductionYear: 2300,
  rulesLevel: 'Standard',
  techRating: 'A',
  variants: {
    IS: {
      weight: 15,
      crits: 7,
      damage: 0, // Variable damage based on attack
      heat: 0,
      minRange: 0,
      rangeShort: 0,
      rangeMedium: 0,
      rangeLong: 0,
      cost: 75000,
      battleValue: 15
    }
  }
}; 