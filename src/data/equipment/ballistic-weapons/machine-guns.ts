import { Equipment } from '../types';

// Machine Gun weapons
export const MACHINE_GUN: Equipment = {
  id: 'machine_gun',
  name: 'Machine Gun',
  category: 'Ballistic Weapons',
  baseType: 'Machine Gun',
  description: 'Standard Machine Gun - Anti-infantry ballistic weapon',
  requiresAmmo: true,
  introductionYear: 1950,
  rulesLevel: 'Standard',
  variants: {
    Clan: {
      weight: 0.25,
      crits: 1,
      damage: 2,
      heat: 0,
      minRange: 0,
      rangeShort: 1,
      rangeMedium: 2,
      rangeLong: 3,
      cost: 5000,
      battleValue: 5
    },
    IS: {
      weight: 0.5,
      crits: 1,
      damage: 2,
      heat: 0,
      minRange: 0,
      rangeShort: 1,
      rangeMedium: 2,
      rangeLong: 3,
      cost: 5000,
      battleValue: 5
    }
  }
};

export const LIGHT_MACHINE_GUN: Equipment = {
  id: 'light_machine_gun',
  name: 'Light Machine Gun',
  category: 'Ballistic Weapons',
  baseType: 'Light Machine Gun',
  description: 'Light Machine Gun - Lightweight anti-infantry weapon',
  requiresAmmo: true,
  introductionYear: 3068,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 0.25,
      crits: 1,
      damage: 1,
      heat: 0,
      minRange: 0,
      rangeShort: 1,
      rangeMedium: 2,
      rangeLong: 3,
      cost: 5000,
      battleValue: 5
    }
  }
};

export const HEAVY_MACHINE_GUN: Equipment = {
  id: 'heavy_machine_gun',
  name: 'Heavy Machine Gun',
  category: 'Ballistic Weapons',
  baseType: 'Heavy Machine Gun',
  description: 'Heavy Machine Gun - Enhanced anti-infantry weapon',
  requiresAmmo: true,
  introductionYear: 3068,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      damage: 3,
      heat: 0,
      minRange: 0,
      rangeShort: 1,
      rangeMedium: 2,
      rangeLong: 3,
      cost: 7500,
      battleValue: 7
    }
  }
};

// Defensive Systems
export const ANTI_MISSILE_SYSTEM: Equipment = {
  id: 'anti_missile_system',
  name: 'Anti-Missile System',
  category: 'Ballistic Weapons',
  baseType: 'Anti-Missile System',
  description: 'Anti-Missile System for intercepting incoming missiles',
  requiresAmmo: true,
  introductionYear: 2617,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 0.5,
      crits: 1,
      damage: 2,
      heat: 1,
      minRange: 0,
      rangeShort: 1,
      rangeMedium: 2,
      rangeLong: 3,
      cost: 100000,
      battleValue: 32
    },
    Clan: {
      weight: 0.5,
      crits: 1,
      damage: 2,
      heat: 1,
      minRange: 0,
      rangeShort: 1,
      rangeMedium: 2,
      rangeLong: 3,
      cost: 100000,
      battleValue: 32
    }
  }
}; 