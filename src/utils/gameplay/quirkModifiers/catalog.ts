/**
 * Quirk catalog and ID constants.
 */

import { IQuirkCatalogEntry } from './types';

// =============================================================================
// Quirk ID Constants
// =============================================================================

/** Unit quirk identifiers — match the string values used in MTF/BLK quirk lines */
export const UNIT_QUIRK_IDS = {
  // Targeting quirks
  IMPROVED_TARGETING_SHORT: 'improved_targeting_short',
  IMPROVED_TARGETING_MEDIUM: 'improved_targeting_medium',
  IMPROVED_TARGETING_LONG: 'improved_targeting_long',
  POOR_TARGETING_SHORT: 'poor_targeting_short',
  POOR_TARGETING_MEDIUM: 'poor_targeting_medium',
  POOR_TARGETING_LONG: 'poor_targeting_long',

  // Defensive quirks
  DISTRACTING: 'distracting',
  LOW_PROFILE: 'low_profile',

  // Piloting quirks
  EASY_TO_PILOT: 'easy_to_pilot',
  STABLE: 'stable',
  HARD_TO_PILOT: 'hard_to_pilot',
  UNBALANCED: 'unbalanced',
  CRAMPED_COCKPIT: 'cramped_cockpit',

  // Physical quirks
  BATTLE_FISTS_LA: 'battle_fists_la',
  BATTLE_FISTS_RA: 'battle_fists_ra',
  NO_ARMS: 'no_arms',
  LOW_ARMS: 'low_arms',

  // Initiative quirks
  COMMAND_MECH: 'command_mech',
  BATTLE_COMPUTER: 'battle_computer',

  // Combat quirks
  SENSOR_GHOSTS: 'sensor_ghosts',
  MULTI_TRAC: 'multi_trac',

  // Crit quirks
  RUGGED_1: 'rugged_1',
  RUGGED_2: 'rugged_2',
  PROTECTED_ACTUATORS: 'protected_actuators',
  EXPOSED_ACTUATORS: 'exposed_actuators',
} as const;

/** Weapon quirk identifiers */
export const WEAPON_QUIRK_IDS = {
  ACCURATE: 'accurate',
  INACCURATE: 'inaccurate',
  STABLE_WEAPON: 'stable_weapon',
  IMPROVED_COOLING: 'improved_cooling',
  POOR_COOLING: 'poor_cooling',
  NO_COOLING: 'no_cooling',
} as const;

// =============================================================================
// Quirk Catalog
// =============================================================================

/**
 * Complete quirk catalog — all unit and weapon quirks with combat effects.
 */
export const QUIRK_CATALOG: Record<string, IQuirkCatalogEntry> = {
  // Targeting quirks
  [UNIT_QUIRK_IDS.IMPROVED_TARGETING_SHORT]: {
    id: UNIT_QUIRK_IDS.IMPROVED_TARGETING_SHORT,
    name: 'Improved Targeting (Short)',
    category: 'targeting',
    pipelines: ['to-hit'],
    combatEffect: '-1 to-hit at short range',
    isPositive: true,
  },
  [UNIT_QUIRK_IDS.IMPROVED_TARGETING_MEDIUM]: {
    id: UNIT_QUIRK_IDS.IMPROVED_TARGETING_MEDIUM,
    name: 'Improved Targeting (Medium)',
    category: 'targeting',
    pipelines: ['to-hit'],
    combatEffect: '-1 to-hit at medium range',
    isPositive: true,
  },
  [UNIT_QUIRK_IDS.IMPROVED_TARGETING_LONG]: {
    id: UNIT_QUIRK_IDS.IMPROVED_TARGETING_LONG,
    name: 'Improved Targeting (Long)',
    category: 'targeting',
    pipelines: ['to-hit'],
    combatEffect: '-1 to-hit at long range',
    isPositive: true,
  },
  [UNIT_QUIRK_IDS.POOR_TARGETING_SHORT]: {
    id: UNIT_QUIRK_IDS.POOR_TARGETING_SHORT,
    name: 'Poor Targeting (Short)',
    category: 'targeting',
    pipelines: ['to-hit'],
    combatEffect: '+1 to-hit at short range',
    isPositive: false,
  },
  [UNIT_QUIRK_IDS.POOR_TARGETING_MEDIUM]: {
    id: UNIT_QUIRK_IDS.POOR_TARGETING_MEDIUM,
    name: 'Poor Targeting (Medium)',
    category: 'targeting',
    pipelines: ['to-hit'],
    combatEffect: '+1 to-hit at medium range',
    isPositive: false,
  },
  [UNIT_QUIRK_IDS.POOR_TARGETING_LONG]: {
    id: UNIT_QUIRK_IDS.POOR_TARGETING_LONG,
    name: 'Poor Targeting (Long)',
    category: 'targeting',
    pipelines: ['to-hit'],
    combatEffect: '+1 to-hit at long range',
    isPositive: false,
  },

  // Defensive quirks
  [UNIT_QUIRK_IDS.DISTRACTING]: {
    id: UNIT_QUIRK_IDS.DISTRACTING,
    name: 'Distracting',
    category: 'defensive',
    pipelines: ['to-hit'],
    combatEffect: '+1 enemy to-hit against this unit',
    isPositive: true,
  },
  [UNIT_QUIRK_IDS.LOW_PROFILE]: {
    id: UNIT_QUIRK_IDS.LOW_PROFILE,
    name: 'Low Profile',
    category: 'defensive',
    pipelines: ['to-hit'],
    combatEffect: 'Partial cover effect for hit location',
    isPositive: true,
  },

  // Piloting quirks
  [UNIT_QUIRK_IDS.EASY_TO_PILOT]: {
    id: UNIT_QUIRK_IDS.EASY_TO_PILOT,
    name: 'Easy to Pilot',
    category: 'piloting',
    pipelines: ['psr'],
    combatEffect: '-1 PSR for terrain',
    isPositive: true,
  },
  [UNIT_QUIRK_IDS.STABLE]: {
    id: UNIT_QUIRK_IDS.STABLE,
    name: 'Stable',
    category: 'piloting',
    pipelines: ['psr'],
    combatEffect: '-1 to all PSRs',
    isPositive: true,
  },
  [UNIT_QUIRK_IDS.HARD_TO_PILOT]: {
    id: UNIT_QUIRK_IDS.HARD_TO_PILOT,
    name: 'Hard to Pilot',
    category: 'piloting',
    pipelines: ['psr'],
    combatEffect: '+1 to all PSRs',
    isPositive: false,
  },
  [UNIT_QUIRK_IDS.UNBALANCED]: {
    id: UNIT_QUIRK_IDS.UNBALANCED,
    name: 'Unbalanced',
    category: 'piloting',
    pipelines: ['psr'],
    combatEffect: '+1 PSR for terrain',
    isPositive: false,
  },
  [UNIT_QUIRK_IDS.CRAMPED_COCKPIT]: {
    id: UNIT_QUIRK_IDS.CRAMPED_COCKPIT,
    name: 'Cramped Cockpit',
    category: 'piloting',
    pipelines: ['psr'],
    combatEffect: '+1 to all piloting rolls',
    isPositive: false,
  },

  // Physical quirks
  [UNIT_QUIRK_IDS.BATTLE_FISTS_LA]: {
    id: UNIT_QUIRK_IDS.BATTLE_FISTS_LA,
    name: 'Battle Fists (LA)',
    category: 'physical',
    pipelines: ['physical'],
    combatEffect: '+1 left arm punch damage',
    isPositive: true,
  },
  [UNIT_QUIRK_IDS.BATTLE_FISTS_RA]: {
    id: UNIT_QUIRK_IDS.BATTLE_FISTS_RA,
    name: 'Battle Fists (RA)',
    category: 'physical',
    pipelines: ['physical'],
    combatEffect: '+1 right arm punch damage',
    isPositive: true,
  },
  [UNIT_QUIRK_IDS.NO_ARMS]: {
    id: UNIT_QUIRK_IDS.NO_ARMS,
    name: 'No Arms',
    category: 'physical',
    pipelines: ['physical'],
    combatEffect: 'Cannot perform punch attacks',
    isPositive: false,
  },
  [UNIT_QUIRK_IDS.LOW_ARMS]: {
    id: UNIT_QUIRK_IDS.LOW_ARMS,
    name: 'Low Arms',
    category: 'physical',
    pipelines: ['physical'],
    combatEffect: 'Cannot punch targets at higher elevation',
    isPositive: false,
  },

  // Initiative quirks
  [UNIT_QUIRK_IDS.COMMAND_MECH]: {
    id: UNIT_QUIRK_IDS.COMMAND_MECH,
    name: 'Command Mech',
    category: 'initiative',
    pipelines: ['initiative'],
    combatEffect: '+1 initiative',
    isPositive: true,
  },
  [UNIT_QUIRK_IDS.BATTLE_COMPUTER]: {
    id: UNIT_QUIRK_IDS.BATTLE_COMPUTER,
    name: 'Battle Computer',
    category: 'initiative',
    pipelines: ['initiative'],
    combatEffect: '+2 initiative (not cumulative with Command Mech)',
    isPositive: true,
  },

  // Combat quirks
  [UNIT_QUIRK_IDS.SENSOR_GHOSTS]: {
    id: UNIT_QUIRK_IDS.SENSOR_GHOSTS,
    name: 'Sensor Ghosts',
    category: 'combat',
    pipelines: ['to-hit'],
    combatEffect: '+1 to own attacks (self-penalty)',
    isPositive: false,
  },
  [UNIT_QUIRK_IDS.MULTI_TRAC]: {
    id: UNIT_QUIRK_IDS.MULTI_TRAC,
    name: 'Multi-Trac',
    category: 'combat',
    pipelines: ['to-hit'],
    combatEffect: 'No front-arc secondary target penalty',
    isPositive: true,
  },

  // Crit quirks
  [UNIT_QUIRK_IDS.RUGGED_1]: {
    id: UNIT_QUIRK_IDS.RUGGED_1,
    name: 'Rugged (1)',
    category: 'crit',
    pipelines: ['crit'],
    combatEffect: 'First critical hit per game is negated',
    isPositive: true,
  },
  [UNIT_QUIRK_IDS.RUGGED_2]: {
    id: UNIT_QUIRK_IDS.RUGGED_2,
    name: 'Rugged (2)',
    category: 'crit',
    pipelines: ['crit'],
    combatEffect: 'First two critical hits per game are negated',
    isPositive: true,
  },
  [UNIT_QUIRK_IDS.PROTECTED_ACTUATORS]: {
    id: UNIT_QUIRK_IDS.PROTECTED_ACTUATORS,
    name: 'Protected Actuators',
    category: 'crit',
    pipelines: ['crit'],
    combatEffect: '+1 enemy crit determination roll (harder to crit)',
    isPositive: true,
  },
  [UNIT_QUIRK_IDS.EXPOSED_ACTUATORS]: {
    id: UNIT_QUIRK_IDS.EXPOSED_ACTUATORS,
    name: 'Exposed Actuators',
    category: 'crit',
    pipelines: ['crit'],
    combatEffect: '-1 enemy crit determination roll (easier to crit)',
    isPositive: false,
  },

  // Weapon quirks
  [WEAPON_QUIRK_IDS.ACCURATE]: {
    id: WEAPON_QUIRK_IDS.ACCURATE,
    name: 'Accurate',
    category: 'weapon',
    pipelines: ['to-hit'],
    combatEffect: '-1 to-hit for this weapon',
    isPositive: true,
  },
  [WEAPON_QUIRK_IDS.INACCURATE]: {
    id: WEAPON_QUIRK_IDS.INACCURATE,
    name: 'Inaccurate',
    category: 'weapon',
    pipelines: ['to-hit'],
    combatEffect: '+1 to-hit for this weapon',
    isPositive: false,
  },
  [WEAPON_QUIRK_IDS.STABLE_WEAPON]: {
    id: WEAPON_QUIRK_IDS.STABLE_WEAPON,
    name: 'Stable Weapon',
    category: 'weapon',
    pipelines: ['to-hit'],
    combatEffect: '-1 running penalty for this weapon',
    isPositive: true,
  },
  [WEAPON_QUIRK_IDS.IMPROVED_COOLING]: {
    id: WEAPON_QUIRK_IDS.IMPROVED_COOLING,
    name: 'Improved Cooling',
    category: 'weapon',
    pipelines: ['heat'],
    combatEffect: '-1 heat for this weapon',
    isPositive: true,
  },
  [WEAPON_QUIRK_IDS.POOR_COOLING]: {
    id: WEAPON_QUIRK_IDS.POOR_COOLING,
    name: 'Poor Cooling',
    category: 'weapon',
    pipelines: ['heat'],
    combatEffect: '+1 heat for this weapon',
    isPositive: false,
  },
  [WEAPON_QUIRK_IDS.NO_COOLING]: {
    id: WEAPON_QUIRK_IDS.NO_COOLING,
    name: 'No Cooling',
    category: 'weapon',
    pipelines: ['heat'],
    combatEffect: 'Double heat for this weapon',
    isPositive: false,
  },
};

/**
 * Get the number of quirks in the catalog.
 */
export function getQuirkCatalogSize(): number {
  return Object.keys(QUIRK_CATALOG).length;
}

/**
 * Get all quirks that affect a specific pipeline.
 */
export function getQuirksForPipeline(
  pipeline: import('./types').QuirkPipeline,
): IQuirkCatalogEntry[] {
  return Object.values(QUIRK_CATALOG).filter((q) =>
    q.pipelines.includes(pipeline),
  );
}

/**
 * Get all quirks in a specific category.
 */
export function getQuirksByCategory(
  category: import('./types').QuirkCategory,
): IQuirkCatalogEntry[] {
  return Object.values(QUIRK_CATALOG).filter((q) => q.category === category);
}
