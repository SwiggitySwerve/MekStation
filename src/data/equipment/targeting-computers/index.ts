import { Equipment } from './types';

// Inner Sphere Targeting Computer - 1 Ton
export const IS_TARGETING_COMPUTER_1: Equipment = {
  id: 'is_targeting_computer_1',
  name: 'Targeting Computer (1 Ton)',
  category: 'Electronic Warfare',
  baseType: 'Targeting Computer',
  description: 'Inner Sphere Targeting Computer - Provides +1 to-hit bonus for direct-fire weapons',
  requiresAmmo: false,
  introductionYear: 3062,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      heat: 0,
      minRange: 0,
      cost: 10000,
      battleValue: 12
    }
  },
  special: ['Direct Fire Weapons Only', '+1 To-Hit Bonus', 'Energy/Ballistic Compatible']
};

// Inner Sphere Targeting Computer - 2 Ton
export const IS_TARGETING_COMPUTER_2: Equipment = {
  id: 'is_targeting_computer_2',
  name: 'Targeting Computer (2 Ton)',
  category: 'Electronic Warfare',
  baseType: 'Targeting Computer',
  description: 'Inner Sphere Targeting Computer - Provides +2 to-hit bonus for direct-fire weapons',
  requiresAmmo: false,
  introductionYear: 3062,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 2,
      crits: 2,
      heat: 0,
      minRange: 0,
      cost: 20000,
      battleValue: 24
    }
  },
  special: ['Direct Fire Weapons Only', '+2 To-Hit Bonus', 'Energy/Ballistic Compatible']
};

// Inner Sphere Targeting Computer - 3 Ton
export const IS_TARGETING_COMPUTER_3: Equipment = {
  id: 'is_targeting_computer_3',
  name: 'Targeting Computer (3 Ton)',
  category: 'Electronic Warfare',
  baseType: 'Targeting Computer',
  description: 'Inner Sphere Targeting Computer - Provides +3 to-hit bonus for direct-fire weapons',
  requiresAmmo: false,
  introductionYear: 3062,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 3,
      crits: 3,
      heat: 0,
      minRange: 0,
      cost: 30000,
      battleValue: 36
    }
  },
  special: ['Direct Fire Weapons Only', '+3 To-Hit Bonus', 'Energy/Ballistic Compatible']
};

// Inner Sphere Targeting Computer - 4 Ton
export const IS_TARGETING_COMPUTER_4: Equipment = {
  id: 'is_targeting_computer_4',
  name: 'Targeting Computer (4 Ton)',
  category: 'Electronic Warfare',
  baseType: 'Targeting Computer',
  description: 'Inner Sphere Targeting Computer - Provides +3 to-hit bonus (maximum benefit)',
  requiresAmmo: false,
  introductionYear: 3062,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 4,
      crits: 4,
      heat: 0,
      minRange: 0,
      cost: 40000,
      battleValue: 36
    }
  },
  special: ['Direct Fire Weapons Only', '+3 To-Hit Bonus (Max)', 'Energy/Ballistic Compatible']
};

// Inner Sphere Targeting Computer - 5 Ton
export const IS_TARGETING_COMPUTER_5: Equipment = {
  id: 'is_targeting_computer_5',
  name: 'Targeting Computer (5 Ton)',
  category: 'Electronic Warfare',
  baseType: 'Targeting Computer',
  description: 'Inner Sphere Targeting Computer - Provides +3 to-hit bonus (maximum benefit)',
  requiresAmmo: false,
  introductionYear: 3062,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 5,
      crits: 5,
      heat: 0,
      minRange: 0,
      cost: 50000,
      battleValue: 36
    }
  },
  special: ['Direct Fire Weapons Only', '+3 To-Hit Bonus (Max)', 'Energy/Ballistic Compatible']
};

// Inner Sphere Targeting Computer - 6 Ton
export const IS_TARGETING_COMPUTER_6: Equipment = {
  id: 'is_targeting_computer_6',
  name: 'Targeting Computer (6 Ton)',
  category: 'Electronic Warfare',
  baseType: 'Targeting Computer',
  description: 'Inner Sphere Targeting Computer - Provides +3 to-hit bonus (maximum benefit)',
  requiresAmmo: false,
  introductionYear: 3062,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 6,
      crits: 6,
      heat: 0,
      minRange: 0,
      cost: 60000,
      battleValue: 36
    }
  },
  special: ['Direct Fire Weapons Only', '+3 To-Hit Bonus (Max)', 'Energy/Ballistic Compatible']
};

// Clan Targeting Computer - 1 Ton
export const CLAN_TARGETING_COMPUTER_1: Equipment = {
  id: 'clan_targeting_computer_1',
  name: 'Targeting Computer (1 Ton)',
  category: 'Electronic Warfare',
  baseType: 'Targeting Computer',
  description: 'Clan Targeting Computer - Provides +1 to-hit bonus for direct-fire weapons',
  requiresAmmo: false,
  introductionYear: 3062,
  rulesLevel: 'Standard',
  variants: {
    Clan: {
      weight: 1,
      crits: 1,
      heat: 0,
      minRange: 0,
      cost: 10000,
      battleValue: 12
    }
  },
  special: ['Direct Fire Weapons Only', '+1 To-Hit Bonus', 'Energy/Ballistic Compatible']
};

// Clan Targeting Computer - 2 Ton
export const CLAN_TARGETING_COMPUTER_2: Equipment = {
  id: 'clan_targeting_computer_2',
  name: 'Targeting Computer (2 Ton)',
  category: 'Electronic Warfare',
  baseType: 'Targeting Computer',
  description: 'Clan Targeting Computer - Provides +2 to-hit bonus for direct-fire weapons',
  requiresAmmo: false,
  introductionYear: 3062,
  rulesLevel: 'Standard',
  variants: {
    Clan: {
      weight: 2,
      crits: 2,
      heat: 0,
      minRange: 0,
      cost: 20000,
      battleValue: 24
    }
  },
  special: ['Direct Fire Weapons Only', '+2 To-Hit Bonus', 'Energy/Ballistic Compatible']
};

// Clan Targeting Computer - 3 Ton
export const CLAN_TARGETING_COMPUTER_3: Equipment = {
  id: 'clan_targeting_computer_3',
  name: 'Targeting Computer (3 Ton)',
  category: 'Electronic Warfare',
  baseType: 'Targeting Computer',
  description: 'Clan Targeting Computer - Provides +3 to-hit bonus for direct-fire weapons',
  requiresAmmo: false,
  introductionYear: 3062,
  rulesLevel: 'Standard',
  variants: {
    Clan: {
      weight: 3,
      crits: 3,
      heat: 0,
      minRange: 0,
      cost: 30000,
      battleValue: 36
    }
  },
  special: ['Direct Fire Weapons Only', '+3 To-Hit Bonus', 'Energy/Ballistic Compatible']
};

// Clan Targeting Computer - 4 Ton
export const CLAN_TARGETING_COMPUTER_4: Equipment = {
  id: 'clan_targeting_computer_4',
  name: 'Targeting Computer (4 Ton)',
  category: 'Electronic Warfare',
  baseType: 'Targeting Computer',
  description: 'Clan Targeting Computer - Provides +3 to-hit bonus (maximum benefit)',
  requiresAmmo: false,
  introductionYear: 3062,
  rulesLevel: 'Standard',
  variants: {
    Clan: {
      weight: 4,
      crits: 4,
      heat: 0,
      minRange: 0,
      cost: 40000,
      battleValue: 36
    }
  },
  special: ['Direct Fire Weapons Only', '+3 To-Hit Bonus (Max)', 'Energy/Ballistic Compatible']
};

// Clan Targeting Computer - 5 Ton
export const CLAN_TARGETING_COMPUTER_5: Equipment = {
  id: 'clan_targeting_computer_5',
  name: 'Targeting Computer (5 Ton)',
  category: 'Electronic Warfare',
  baseType: 'Targeting Computer',
  description: 'Clan Targeting Computer - Provides +3 to-hit bonus (maximum benefit)',
  requiresAmmo: false,
  introductionYear: 3062,
  rulesLevel: 'Standard',
  variants: {
    Clan: {
      weight: 5,
      crits: 5,
      heat: 0,
      minRange: 0,
      cost: 50000,
      battleValue: 36
    }
  },
  special: ['Direct Fire Weapons Only', '+3 To-Hit Bonus (Max)', 'Energy/Ballistic Compatible']
};

// Clan Targeting Computer - 6 Ton
export const CLAN_TARGETING_COMPUTER_6: Equipment = {
  id: 'clan_targeting_computer_6',
  name: 'Targeting Computer (6 Ton)',
  category: 'Electronic Warfare',
  baseType: 'Targeting Computer',
  description: 'Clan Targeting Computer - Provides +3 to-hit bonus (maximum benefit)',
  requiresAmmo: false,
  introductionYear: 3062,
  rulesLevel: 'Standard',
  variants: {
    Clan: {
      weight: 6,
      crits: 6,
      heat: 0,
      minRange: 0,
      cost: 60000,
      battleValue: 36
    }
  },
  special: ['Direct Fire Weapons Only', '+3 To-Hit Bonus (Max)', 'Energy/Ballistic Compatible']
};

// Export all targeting computers
export const TARGETING_COMPUTERS: Equipment[] = [
  IS_TARGETING_COMPUTER_1,
  IS_TARGETING_COMPUTER_2,
  IS_TARGETING_COMPUTER_3,
  IS_TARGETING_COMPUTER_4,
  IS_TARGETING_COMPUTER_5,
  IS_TARGETING_COMPUTER_6,
  CLAN_TARGETING_COMPUTER_1,
  CLAN_TARGETING_COMPUTER_2,
  CLAN_TARGETING_COMPUTER_3,
  CLAN_TARGETING_COMPUTER_4,
  CLAN_TARGETING_COMPUTER_5,
  CLAN_TARGETING_COMPUTER_6
];
