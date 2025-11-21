import { Equipment } from '../types';

// Gauss Rifle Ammunition
export const GAUSS_AMMO: Equipment = {
  id: 'gauss_ammo',
  name: 'Gauss Ammo',
  category: 'Ammunition',
  baseType: 'Gauss Ammo',
  description: 'Ammunition for Gauss rifles',
  requiresAmmo: false,
  introductionYear: 2587,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      ammoPerTon: 8
    },
    Clan: {
      weight: 1,
      crits: 1,
      ammoPerTon: 8
    }
  }
};

export const GAUSS_AMMO_HALF: Equipment = {
  id: 'gauss_ammo_half',
  name: 'Gauss Ammo (Half)',
  category: 'Ammunition',
  baseType: 'Gauss Ammo',
  description: 'Half-load ammunition for Gauss rifles',
  requiresAmmo: false,
  introductionYear: 2587,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 0.5,
      crits: 1,
      ammoPerTon: 4
    },
    Clan: {
      weight: 0.5,
      crits: 1,
      ammoPerTon: 4
    }
  }
}; 