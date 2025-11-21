import { Equipment } from './types';

export const ONE_SHOT: Equipment = {
  id: 'one_shot',
  name: 'One-Shot',
  category: 'One-Shot Weapons',
  baseType: 'One-Shot',
  description: 'One-Shot - Single-use missile launcher system',
  requiresAmmo: false,
  introductionYear: 3055,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '230',
  variants: {
    IS: {
      weight: 3,
      crits: 2,
      damage: 12,
      heat: 4,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 75000,
      battleValue: 54
    }
  }
};

export const IMPROVED_ONE_SHOT: Equipment = {
  id: 'improved_one_shot',
  name: 'Improved One Shot',
  category: 'One-Shot Weapons',
  baseType: 'Improved One Shot',
  description: 'Improved One Shot - Enhanced single-use missile launcher',
  requiresAmmo: false,
  introductionYear: 3058,
  rulesLevel: 'Standard',
  techRating: 'E',
  sourceBook: 'TM',
  pageReference: '230',
  variants: {
    IS: {
      weight: 3,
      crits: 2,
      damage: 12,
      heat: 4,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 80000,
      battleValue: 59
    }
  }
};

export const ROCKET_LAUNCHER: Equipment = {
  id: 'rocket_launcher',
  name: 'Rocket Launcher',
  category: 'One-Shot Weapons',
  baseType: 'Rocket Launcher',
  description: 'Rocket Launcher - Generic rocket propelled munition launcher',
  requiresAmmo: false,
  introductionYear: 3050,
  rulesLevel: 'Standard',
  techRating: 'B',
  variants: {
    IS: {
      weight: 0.5,
      crits: 1,
      damage: 1,
      heat: 1,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 7,
      rangeLong: 12,
      cost: 1500,
      battleValue: 2
    },
    Clan: {
      weight: 0.5,
      crits: 1,
      damage: 1,
      heat: 1,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 7,
      rangeLong: 12,
      cost: 1500,
      battleValue: 2
    }
  }
};

export const ROCKET_LAUNCHER_10: Equipment = {
  id: 'rocket_launcher_10',
  name: 'Rocket Launcher 10',
  category: 'One-Shot Weapons',
  baseType: 'Rocket Launcher 10',
  description: 'Rocket Launcher 10 - 10-tube rocket launcher system',
  requiresAmmo: false,
  introductionYear: 3050,
  rulesLevel: 'Standard',
  techRating: 'B',
  sourceBook: 'TM',
  pageReference: '230',
  variants: {
    IS: {
      weight: 0.5,
      crits: 1,
      damage: 10,
      heat: 3,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 7,
      rangeLong: 12,
      cost: 15000,
      battleValue: 18
    },
    Clan: {
      weight: 0.5,
      crits: 1,
      damage: 10,
      heat: 3,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 7,
      rangeLong: 12,
      cost: 15000,
      battleValue: 18
    }
  }
};

export const ROCKET_LAUNCHER_15: Equipment = {
  id: 'rocket_launcher_15',
  name: 'Rocket Launcher 15',
  category: 'One-Shot Weapons',
  baseType: 'Rocket Launcher 15',
  description: 'Rocket Launcher 15 - 15-tube rocket launcher system',
  requiresAmmo: false,
  introductionYear: 3050,
  rulesLevel: 'Standard',
  techRating: 'B',
  sourceBook: 'TM',
  pageReference: '230',
  variants: {
    IS: {
      weight: 1,
      crits: 2,
      damage: 15,
      heat: 5,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 7,
      rangeLong: 12,
      cost: 22500,
      battleValue: 26
    },
    Clan: {
      weight: 1,
      crits: 2,
      damage: 15,
      heat: 5,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 7,
      rangeLong: 12,
      cost: 22500,
      battleValue: 26
    }
  }
};

export const ROCKET_LAUNCHER_20: Equipment = {
  id: 'rocket_launcher_20',
  name: 'Rocket Launcher 20',
  category: 'One-Shot Weapons',
  baseType: 'Rocket Launcher 20',
  description: 'Rocket Launcher 20 - 20-tube rocket launcher system',
  requiresAmmo: false,
  introductionYear: 3050,
  rulesLevel: 'Standard',
  techRating: 'B',
  sourceBook: 'TM',
  pageReference: '230',
  variants: {
    IS: {
      weight: 1.5,
      crits: 3,
      damage: 20,
      heat: 6,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 7,
      rangeLong: 12,
      cost: 30000,
      battleValue: 35
    },
    Clan: {
      weight: 1.5,
      crits: 3,
      damage: 20,
      heat: 6,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 7,
      rangeLong: 12,
      cost: 30000,
      battleValue: 35
    }
  }
};

export const FUSILLADE: Equipment = {
  id: 'fusillade',
  name: 'Fusillade',
  category: 'One-Shot Weapons',
  baseType: 'Fusillade',
  description: 'Fusillade - Multiple rocket launcher system',
  requiresAmmo: false,
  introductionYear: 3071,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 7,
      crits: 3,
      damage: 40,
      heat: 6,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 7,
      rangeLong: 12,
      cost: 120000,
      battleValue: 71
    }
  }
};

export const CENTURION_WEAPON_SYSTEM: Equipment = {
  id: 'centurion_weapon_system',
  name: 'Centurion Weapon System',
  category: 'One-Shot Weapons',
  baseType: 'Centurion Weapon System',
  description: 'Centurion Weapon System - Advanced one-shot missile platform',
  requiresAmmo: false,
  introductionYear: 3071,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    IS: {
      weight: 5,
      crits: 4,
      damage: 30,
      heat: 8,
      minRange: 0,
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
      cost: 90000,
      battleValue: 54
    }
  }
};

export const ONE_SHOT_WEAPONS: Equipment[] = [
  ONE_SHOT,
  IMPROVED_ONE_SHOT,
  ROCKET_LAUNCHER,
  ROCKET_LAUNCHER_10,
  ROCKET_LAUNCHER_15,
  ROCKET_LAUNCHER_20,
  FUSILLADE,
  CENTURION_WEAPON_SYSTEM
];
