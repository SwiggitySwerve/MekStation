import { Equipment } from '../types';

// Machine Gun Ammunition
export const MACHINE_GUN_AMMO: Equipment = {
  id: 'machine_gun_ammo',
  name: 'Machine Gun Ammo',
  category: 'Ammunition',
  baseType: 'Machine Gun Ammo',
  description: 'Ammunition for Machine Guns',
  requiresAmmo: false,
  introductionYear: 2590,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      ammoPerTon: 200
    },
    Clan: {
      weight: 1,
      crits: 1,
      ammoPerTon: 200
    }
  }
};

export const MACHINE_GUN_AMMO_HALF: Equipment = {
  id: 'machine_gun_ammo_half',
  name: 'Machine Gun Ammo (Half)',
  category: 'Ammunition',
  baseType: 'Machine Gun Ammo',
  description: 'Half-load ammunition for Machine Guns',
  requiresAmmo: false,
  introductionYear: 2590,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 0.5,
      crits: 1,
      ammoPerTon: 100
    },
    Clan: {
      weight: 0.5,
      crits: 1,
      ammoPerTon: 100
    }
  }
}; 