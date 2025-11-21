import { Equipment } from '../types';

export const AP_GAUSS_RIFLE: Equipment = {
  id: 'ap_gauss_rifle',
  name: 'AP Gauss Rifle',
  category: 'Ballistic Weapons',
  baseType: 'AP Gauss Rifle',
  description: 'Anti-Personnel Gauss Rifle - Electromagnetic weapon designed for infantry suppression',
  requiresAmmo: true,
  introductionYear: 3068,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 0.5,
      crits: 1,
      damage: 3,
      heat: 1,
      minRange: 0,
      rangeShort: 1,
      rangeMedium: 2,
      rangeLong: 3,
      cost: 10000,
      battleValue: 21
    }
  }
};

export const GAUSS_RIFLE: Equipment = {
  id: 'gauss_rifle',
  name: 'Gauss Rifle',
  category: 'Ballistic Weapons',
  baseType: 'Gauss Rifle',
  description: 'Gauss Rifle - Electromagnetic projectile weapon',
  requiresAmmo: true,
  introductionYear: 2592,
  rulesLevel: 'Standard',
  sourceBook: 'TM',
  pageReference: '219',
  variants: {
    Clan: {
      weight: 12,
      crits: 6,
      damage: 15,
      heat: 1,
      minRange: 2,
      rangeShort: 7,
      rangeMedium: 15,
      rangeLong: 22,
      cost: 300000,
      battleValue: 320
    },
    IS: {
      weight: 15,
      crits: 7,
      damage: 15,
      heat: 1,
      minRange: 2,
      rangeShort: 7,
      rangeMedium: 15,
      rangeLong: 22,
      cost: 300000,
      battleValue: 320
    }
  }
};

export const HEAVY_GAUSS_RIFLE: Equipment = {
  id: 'heavy_gauss_rifle',
  name: 'Heavy Gauss Rifle',
  category: 'Ballistic Weapons',
  baseType: 'Heavy Gauss Rifle',
  description: 'Heavy Gauss Rifle - High-damage electromagnetic weapon with minimum range',
  requiresAmmo: true,
  introductionYear: 3061,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 18,
      crits: 11,
      damage: 25,
      heat: 2,
      minRange: 4,
      rangeShort: 6,
      rangeMedium: 13,
      rangeLong: 20,
      cost: 500000,
      battleValue: 346
    }
  }
};

export const HYPER_ASSAULT_GAUSS_RIFLE_40_AMMO_OMNIPOD: Equipment = {
  id: 'hyper_assault_gauss_rifle_40_ammo_omnipod',
  name: 'Hyper-Assault Gauss Rifle/40 Ammo (OMNIPOD)',
  category: 'Ballistic Weapons',
  baseType: 'Hyper-Assault Gauss Rifle/40 Ammo',
  description: 'Base template for Hyper-Assault Gauss Rifle/40 Ammo equipment variants',
  requiresAmmo: false,
  introductionYear: 3070,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 15,
      crits: 7,
      damage: 15,
      heat: 1,
      minRange: 2,
      rangeShort: 4,
      rangeMedium: 8,
      rangeLong: 12,
      cost: 400000,
      battleValue: 320
    }
  }
};

export const IMPROVED_GAUSS_RIFLE: Equipment = {
  id: 'improved_gauss_rifle',
  name: 'Improved Gauss Rifle',
  category: 'Ballistic Weapons',
  baseType: 'Improved Gauss Rifle',
  description: 'Improved Gauss Rifle - Enhanced magnetic accelerator weapon',
  requiresAmmo: true,
  introductionYear: 2573,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '207',
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
      cost: 350000,
      battleValue: 332
    }
  }
};

export const IMPROVED_HEAVY_GAUSS_RIFLE: Equipment = {
  id: 'improved_heavy_gauss_rifle',
  name: 'Improved Heavy Gauss Rifle',
  category: 'Ballistic Weapons',
  baseType: 'Improved Heavy Gauss Rifle',
  description: 'Improved Heavy Gauss Rifle - Enhanced heavy electromagnetic weapon',
  requiresAmmo: true,
  introductionYear: 3075,
  rulesLevel: 'Standard',
  techRating: 'F',
  sourceBook: 'TM',
  pageReference: '207',
  variants: {
    IS: {
      weight: 18,
      crits: 11,
      damage: 25,
      heat: 2,
      minRange: 4,
      rangeShort: 6,
      rangeMedium: 13,
      rangeLong: 20,
      cost: 600000,
      battleValue: 346
    }
  }
};

export const LIGHT_GAUSS_RIFLE: Equipment = {
  id: 'light_gauss_rifle',
  name: 'Light Gauss Rifle',
  category: 'Ballistic Weapons',
  baseType: 'Light Gauss Rifle',
  description: 'Light Gauss Rifle - Lightweight electromagnetic weapon with extended range',
  requiresAmmo: true,
  introductionYear: 3068,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 12,
      crits: 5,
      damage: 8,
      heat: 1,
      minRange: 2,
      rangeShort: 8,
      rangeMedium: 17,
      rangeLong: 25,
      cost: 275000,
      battleValue: 159
    }
  }
};

export const SILVER_BULLET_GAUSS_RIFLE: Equipment = {
  id: 'silver_bullet_gauss_rifle',
  name: 'Silver Bullet Gauss Rifle',
  category: 'Ballistic Weapons',
  baseType: 'Silver Bullet Gauss Rifle',
  description: 'Silver Bullet Gauss Rifle - Cluster munition electromagnetic weapon',
  requiresAmmo: true,
  introductionYear: 3070,
  rulesLevel: 'Standard',
  techRating: 'E',
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
      cost: 325000,
      battleValue: 320
    }
  }
}; 