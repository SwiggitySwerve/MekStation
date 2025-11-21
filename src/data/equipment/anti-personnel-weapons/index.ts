import { Equipment } from './types';

export const ANTI_PERSONNEL_GAUSS_RIFLE: Equipment = {
  id: 'anti_personnel_gauss_rifle',
  name: 'Anti-Personnel Gauss Rifle',
  category: 'Anti-Personnel Weapons',
  baseType: 'Anti-Personnel Gauss Rifle',
  description: 'Anti-Personnel Gauss Rifle - Electromagnetic weapon designed for infantry suppression',
  requiresAmmo: true,
  introductionYear: 3068,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '230',
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

export const ANTI_PERSONNEL_POD: Equipment = {
  id: 'anti_personnel_pod',
  name: 'Anti-Personnel Pod',
  category: 'Anti-Personnel Weapons',
  baseType: 'Anti-Personnel Pod',
  description: 'Anti-Personnel Pod - Area denial weapon system against infantry',
  requiresAmmo: false,
  introductionYear: 3050,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '230',
  variants: {
    IS: {
      weight: 0.5,
      crits: 1,
      damage: 2,
      heat: 1,
      minRange: 0,
      rangeShort: 1,
      rangeMedium: 1,
      rangeLong: 1,
      cost: 1500,
      battleValue: 2
    },
    Clan: {
      weight: 0.5,
      crits: 1,
      damage: 2,
      heat: 1,
      minRange: 0,
      rangeShort: 1,
      rangeMedium: 1,
      rangeLong: 1,
      cost: 1500,
      battleValue: 2
    }
  }
};

export const ANTI_BATTLE_ARMOR_POD: Equipment = {
  id: 'anti_battle_armor_pod',
  name: 'Anti-Battle Armor Pod',
  category: 'Anti-Personnel Weapons',
  baseType: 'Anti-Battle Armor Pod',
  description: 'Anti-Battle Armor Pod - Specialized weapon for eliminating battle armor',
  requiresAmmo: false,
  introductionYear: 3050,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '230',
  variants: {
    IS: {
      weight: 0.5,
      crits: 1,
      damage: 2,
      heat: 1,
      minRange: 0,
      rangeShort: 1,
      rangeMedium: 1,
      rangeLong: 1,
      cost: 2000,
      battleValue: 3
    },
    Clan: {
      weight: 0.5,
      crits: 1,
      damage: 2,
      heat: 1,
      minRange: 0,
      rangeShort: 1,
      rangeMedium: 1,
      rangeLong: 1,
      cost: 2000,
      battleValue: 3
    }
  }
};

export const M_POD: Equipment = {
  id: 'm_pod',
  name: 'M-Pod',
  category: 'Anti-Personnel Weapons',
  baseType: 'M-Pod',
  description: 'M-Pod - Multi-purpose anti-personnel defensive system',
  requiresAmmo: false,
  introductionYear: 3059,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '230',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      damage: 2,
      heat: 0,
      minRange: 0,
      rangeShort: 1,
      rangeMedium: 1,
      rangeLong: 1,
      cost: 6000,
      battleValue: 5
    }
  }
};

export const VEHICULAR_GRENADE_LAUNCHER: Equipment = {
  id: 'vehicular_grenade_launcher',
  name: 'Vehicular Grenade Launcher',
  category: 'Anti-Personnel Weapons',
  baseType: 'Vehicular Grenade Launcher',
  description: 'Vehicular Grenade Launcher - Vehicle-mounted grenade system',
  requiresAmmo: true,
  introductionYear: 2100,
  rulesLevel: 'Standard',
  techRating: 'B',
  sourceBook: 'TM',
  pageReference: '230',
  variants: {
    IS: {
      weight: 0.5,
      crits: 1,
      damage: 1,
      heat: 0,
      minRange: 0,
      rangeShort: 1,
      rangeMedium: 2,
      rangeLong: 3,
      cost: 3500,
      battleValue: 1
    }
  }
};

export const FLUID_GUN: Equipment = {
  id: 'fluid_gun',
  name: 'Fluid Gun',
  category: 'Anti-Personnel Weapons',
  baseType: 'Fluid Gun',
  description: 'Fluid Gun - Chemical sprayer for crowd control and area denial',
  requiresAmmo: true,
  introductionYear: 2100,
  rulesLevel: 'Standard',
  techRating: 'B',
  variants: {
    IS: {
      weight: 2,
      crits: 2,
      damage: 0, // Special damage rules
      heat: 0,
      minRange: 0,
      rangeShort: 1,
      rangeMedium: 2,
      rangeLong: 3,
      cost: 35000,
      battleValue: 2
    }
  }
};

export const TEAR_GAS: Equipment = {
  id: 'tear_gas',
  name: 'Tear Gas',
  category: 'Anti-Personnel Weapons',
  baseType: 'Tear Gas',
  description: 'Tear Gas - Non-lethal chemical weapon for crowd control',
  requiresAmmo: true,
  introductionYear: 2000,
  rulesLevel: 'Standard',
  techRating: 'A',
  variants: {
    IS: {
      weight: 0.5,
      crits: 1,
      damage: 0, // Special rules - causes temporary incapacitation
      heat: 0,
      minRange: 0,
      rangeShort: 1,
      rangeMedium: 2,
      rangeLong: 3,
      cost: 1000,
      battleValue: 1
    }
  }
};

export const BOLA_POD: Equipment = {
  id: 'bola_pod',
  name: 'Bola Pod',
  category: 'Anti-Personnel Weapons',
  baseType: 'Bola Pod',
  description: 'Bola Pod - Entanglement weapon for immobilizing targets',
  requiresAmmo: false,
  introductionYear: 3059,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      damage: 0, // Special entanglement rules
      heat: 0,
      minRange: 0,
      rangeShort: 1,
      rangeMedium: 2,
      rangeLong: 3,
      cost: 30000,
      battleValue: 1
    }
  }
};

export const ANTI_PERSONNEL_WEAPONS: Equipment[] = [
  ANTI_PERSONNEL_GAUSS_RIFLE,
  ANTI_PERSONNEL_POD,
  ANTI_BATTLE_ARMOR_POD,
  M_POD,
  VEHICULAR_GRENADE_LAUNCHER,
  FLUID_GUN,
  TEAR_GAS,
  BOLA_POD
];
