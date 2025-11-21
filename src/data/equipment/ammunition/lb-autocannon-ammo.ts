import { Equipment } from '../types';

// LB-X AC Ammunition
export const LB_10_X_AC_AMMO: Equipment = {
  id: 'lb_10_x_ac_ammo',
  name: 'LB 10-X AC Ammo',
  category: 'Ammunition',
  baseType: 'LB 10-X AC Ammo',
  description: 'Ammunition for LB 10-X AC autocannons',
  requiresAmmo: false,
  introductionYear: 2595,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      ammoPerTon: 10
    },
    Clan: {
      weight: 1,
      crits: 1,
      ammoPerTon: 10
    }
  }
};

export const LB_10_X_AC_AMMO_HALF: Equipment = {
  id: 'lb_10_x_ac_ammo_half',
  name: 'LB 10-X AC Ammo (Half)',
  category: 'Ammunition',
  baseType: 'LB 10-X AC Ammo',
  description: 'Half-load ammunition for LB 10-X AC autocannons',
  requiresAmmo: false,
  introductionYear: 2595,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 0.5,
      crits: 1,
      ammoPerTon: 5
    },
    Clan: {
      weight: 0.5,
      crits: 1,
      ammoPerTon: 5
    }
  }
}; 