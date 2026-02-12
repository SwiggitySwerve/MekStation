/**
 * Mech Quirk Combat Modifiers
 * Implements BattleTech unit and weapon quirks for combat resolution.
 *
 * @spec openspec/changes/full-combat-parity/specs/quirk-combat-integration/spec.md
 */

import { RangeBracket, MovementType } from '@/types/gameplay';
import {
  IToHitModifierDetail,
  IAttackerState,
  ITargetState,
} from '@/types/gameplay';

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
// Targeting Quirk Modifiers (Tasks 12.3)
// =============================================================================

/**
 * Improved Targeting: -1 at specified range bracket.
 * Poor Targeting: +1 at specified range bracket.
 */
export function calculateTargetingQuirkModifier(
  unitQuirks: readonly string[],
  rangeBracket: RangeBracket,
): IToHitModifierDetail | null {
  let modifier = 0;

  // Improved Targeting
  if (
    rangeBracket === RangeBracket.Short &&
    unitQuirks.includes(UNIT_QUIRK_IDS.IMPROVED_TARGETING_SHORT)
  ) {
    modifier -= 1;
  }
  if (
    rangeBracket === RangeBracket.Medium &&
    unitQuirks.includes(UNIT_QUIRK_IDS.IMPROVED_TARGETING_MEDIUM)
  ) {
    modifier -= 1;
  }
  if (
    rangeBracket === RangeBracket.Long &&
    unitQuirks.includes(UNIT_QUIRK_IDS.IMPROVED_TARGETING_LONG)
  ) {
    modifier -= 1;
  }

  // Poor Targeting
  if (
    rangeBracket === RangeBracket.Short &&
    unitQuirks.includes(UNIT_QUIRK_IDS.POOR_TARGETING_SHORT)
  ) {
    modifier += 1;
  }
  if (
    rangeBracket === RangeBracket.Medium &&
    unitQuirks.includes(UNIT_QUIRK_IDS.POOR_TARGETING_MEDIUM)
  ) {
    modifier += 1;
  }
  if (
    rangeBracket === RangeBracket.Long &&
    unitQuirks.includes(UNIT_QUIRK_IDS.POOR_TARGETING_LONG)
  ) {
    modifier += 1;
  }

  if (modifier === 0) return null;

  const sign = modifier > 0 ? '+' : '';
  return {
    name: modifier < 0 ? 'Improved Targeting' : 'Poor Targeting',
    value: modifier,
    source: 'quirk',
    description: `${modifier < 0 ? 'Improved' : 'Poor'} Targeting (${rangeBracket}): ${sign}${modifier}`,
  };
}

// =============================================================================
// Defensive Quirk Modifiers (Task 12.4)
// =============================================================================

/**
 * Distracting: +1 to-hit for enemies attacking this unit.
 */
export function calculateDistractingModifier(
  targetQuirks: readonly string[],
): IToHitModifierDetail | null {
  if (!targetQuirks.includes(UNIT_QUIRK_IDS.DISTRACTING)) return null;

  return {
    name: 'Distracting',
    value: 1,
    source: 'quirk',
    description: 'Target has Distracting quirk: +1',
  };
}

/**
 * Low Profile: partial cover effect.
 * Returns true if the unit has Low Profile quirk — caller handles as partial cover.
 */
export function hasLowProfile(unitQuirks: readonly string[]): boolean {
  return unitQuirks.includes(UNIT_QUIRK_IDS.LOW_PROFILE);
}

/**
 * Low Profile to-hit modifier: +1 (same as partial cover).
 * Only applies if target doesn't already have partial cover.
 */
export function calculateLowProfileModifier(
  targetQuirks: readonly string[],
  alreadyHasPartialCover: boolean,
): IToHitModifierDetail | null {
  if (!targetQuirks.includes(UNIT_QUIRK_IDS.LOW_PROFILE)) return null;
  if (alreadyHasPartialCover) return null; // Already counted via partial cover

  return {
    name: 'Low Profile',
    value: 1,
    source: 'quirk',
    description: 'Target has Low Profile quirk (partial cover effect): +1',
  };
}

// =============================================================================
// Piloting Quirk Modifiers (Task 12.5)
// =============================================================================

/**
 * PSR modifier from piloting quirks.
 * @param unitQuirks - Unit's quirk identifiers
 * @param isTerrainPSR - Whether this PSR was triggered by terrain
 * @returns Modifier to add to PSR target number
 */
export function calculatePilotingQuirkPSRModifier(
  unitQuirks: readonly string[],
  isTerrainPSR: boolean,
): number {
  let modifier = 0;

  // Stable: -1 to all PSRs
  if (unitQuirks.includes(UNIT_QUIRK_IDS.STABLE)) {
    modifier -= 1;
  }

  // Hard to Pilot: +1 to all PSRs
  if (unitQuirks.includes(UNIT_QUIRK_IDS.HARD_TO_PILOT)) {
    modifier += 1;
  }

  // Cramped Cockpit: +1 to all piloting rolls
  if (unitQuirks.includes(UNIT_QUIRK_IDS.CRAMPED_COCKPIT)) {
    modifier += 1;
  }

  // Easy to Pilot: -1 to terrain PSRs only
  if (isTerrainPSR && unitQuirks.includes(UNIT_QUIRK_IDS.EASY_TO_PILOT)) {
    modifier -= 1;
  }

  // Unbalanced: +1 to terrain PSRs only
  if (isTerrainPSR && unitQuirks.includes(UNIT_QUIRK_IDS.UNBALANCED)) {
    modifier += 1;
  }

  return modifier;
}

// =============================================================================
// Physical Quirk Modifiers (Task 12.6)
// =============================================================================

/**
 * Battle Fist: +1 punch damage for equipped arm.
 * @param unitQuirks - Unit's quirk identifiers
 * @param arm - Which arm is punching: 'left' or 'right'
 * @returns Damage bonus (0 or 1)
 */
export function getBattleFistDamageBonus(
  unitQuirks: readonly string[],
  arm: 'left' | 'right',
): number {
  if (arm === 'left' && unitQuirks.includes(UNIT_QUIRK_IDS.BATTLE_FISTS_LA)) {
    return 1;
  }
  if (arm === 'right' && unitQuirks.includes(UNIT_QUIRK_IDS.BATTLE_FISTS_RA)) {
    return 1;
  }
  return 0;
}

/**
 * No Arms: prevents punch attacks.
 */
export function hasNoArms(unitQuirks: readonly string[]): boolean {
  return unitQuirks.includes(UNIT_QUIRK_IDS.NO_ARMS);
}

/**
 * Low Arms: restricts physical attacks based on elevation.
 * Returns true if punching is restricted for the given elevation difference.
 */
export function isLowArmsRestricted(
  unitQuirks: readonly string[],
  elevationDifference: number,
): boolean {
  if (!unitQuirks.includes(UNIT_QUIRK_IDS.LOW_ARMS)) return false;
  // Low Arms prevents punching targets at higher elevation
  return elevationDifference > 0;
}

// =============================================================================
// Initiative Quirk Modifiers (Task 12.7)
// =============================================================================

/**
 * Calculate initiative modifier from quirks across a force.
 * Battle Computer (+2) does not stack with Command Mech (+1).
 * @param allUnitQuirks - Array of quirk arrays for all units in the force
 * @returns Initiative modifier
 */
export function calculateInitiativeQuirkModifier(
  allUnitQuirks: readonly (readonly string[])[],
): number {
  let hasBattleComputer = false;
  let hasCommandMech = false;

  for (const quirks of allUnitQuirks) {
    if (quirks.includes(UNIT_QUIRK_IDS.BATTLE_COMPUTER)) {
      hasBattleComputer = true;
    }
    if (quirks.includes(UNIT_QUIRK_IDS.COMMAND_MECH)) {
      hasCommandMech = true;
    }
  }

  // Battle Computer (+2) takes priority, not cumulative with Command Mech
  if (hasBattleComputer) return 2;
  if (hasCommandMech) return 1;
  return 0;
}

// =============================================================================
// Combat Quirk Modifiers (Task 12.8)
// =============================================================================

/**
 * Sensor Ghosts: +1 to own attacks (penalty to attacker accuracy).
 */
export function calculateSensorGhostsModifier(
  attackerQuirks: readonly string[],
): IToHitModifierDetail | null {
  if (!attackerQuirks.includes(UNIT_QUIRK_IDS.SENSOR_GHOSTS)) return null;

  return {
    name: 'Sensor Ghosts',
    value: 1,
    source: 'quirk',
    description: 'Sensor Ghosts quirk: +1 to own attacks',
  };
}

/**
 * Multi-Trac: eliminates front-arc secondary target penalty.
 * Returns a modifier to negate the secondary target penalty if in front arc.
 */
export function calculateMultiTracModifier(
  attackerQuirks: readonly string[],
  isSecondaryTarget: boolean,
  inFrontArc: boolean,
): IToHitModifierDetail | null {
  if (!attackerQuirks.includes(UNIT_QUIRK_IDS.MULTI_TRAC)) return null;
  if (!isSecondaryTarget) return null;
  if (!inFrontArc) return null;

  return {
    name: 'Multi-Trac',
    value: -1,
    source: 'quirk',
    description: 'Multi-Trac: eliminates front-arc secondary penalty',
  };
}

// =============================================================================
// Crit Quirk Modifiers (Task 12.9)
// =============================================================================

/**
 * Rugged: provides critical hit resistance.
 * Returns the number of crits that can be negated this game.
 * @param unitQuirks - Unit's quirk identifiers
 * @returns Max crit negations (0, 1, or 2)
 */
export function getRuggedCritNegations(unitQuirks: readonly string[]): number {
  if (unitQuirks.includes(UNIT_QUIRK_IDS.RUGGED_2)) return 2;
  if (unitQuirks.includes(UNIT_QUIRK_IDS.RUGGED_1)) return 1;
  return 0;
}

/**
 * Protected/Exposed Actuators: modifier to enemy crit determination roll.
 * @returns Modifier to add to crit roll (+1 Protected = harder to crit, -1 Exposed = easier)
 */
export function getActuatorCritModifier(unitQuirks: readonly string[]): number {
  if (unitQuirks.includes(UNIT_QUIRK_IDS.PROTECTED_ACTUATORS)) return 1;
  if (unitQuirks.includes(UNIT_QUIRK_IDS.EXPOSED_ACTUATORS)) return -1;
  return 0;
}

// =============================================================================
// Weapon Quirk Modifiers (Task 12.10)
// =============================================================================

/**
 * Accurate weapon: -1 to-hit.
 */
export function calculateAccurateWeaponModifier(
  weaponQuirks: readonly string[],
): IToHitModifierDetail | null {
  if (!weaponQuirks.includes(WEAPON_QUIRK_IDS.ACCURATE)) return null;

  return {
    name: 'Accurate Weapon',
    value: -1,
    source: 'quirk',
    description: 'Weapon has Accurate quirk: -1',
  };
}

/**
 * Inaccurate weapon: +1 to-hit.
 */
export function calculateInaccurateWeaponModifier(
  weaponQuirks: readonly string[],
): IToHitModifierDetail | null {
  if (!weaponQuirks.includes(WEAPON_QUIRK_IDS.INACCURATE)) return null;

  return {
    name: 'Inaccurate Weapon',
    value: 1,
    source: 'quirk',
    description: 'Weapon has Inaccurate quirk: +1',
  };
}

/**
 * Stable Weapon: -1 to running movement penalty.
 * Only applies when attacker is running.
 */
export function calculateStableWeaponModifier(
  weaponQuirks: readonly string[],
  attackerMovementType: MovementType,
): IToHitModifierDetail | null {
  if (!weaponQuirks.includes(WEAPON_QUIRK_IDS.STABLE_WEAPON)) return null;
  if (attackerMovementType !== MovementType.Run) return null;

  return {
    name: 'Stable Weapon',
    value: -1,
    source: 'quirk',
    description: 'Stable Weapon: -1 running penalty',
  };
}

/**
 * Weapon cooling quirk heat modifier.
 * @returns Heat modifier: -1 for Improved, +1 for Poor, or baseHeat for No Cooling (doubling)
 */
export function getWeaponCoolingHeatModifier(
  weaponQuirks: readonly string[],
  baseHeat: number,
): number {
  if (weaponQuirks.includes(WEAPON_QUIRK_IDS.IMPROVED_COOLING)) return -1;
  if (weaponQuirks.includes(WEAPON_QUIRK_IDS.POOR_COOLING)) return 1;
  if (weaponQuirks.includes(WEAPON_QUIRK_IDS.NO_COOLING)) return baseHeat; // Double heat
  return 0;
}

/**
 * Get weapon quirks for a specific weapon by its ID.
 */
export function getWeaponQuirks(
  weaponQuirks: Readonly<Record<string, readonly string[]>> | undefined,
  weaponId: string,
): readonly string[] {
  if (!weaponQuirks) return [];
  return weaponQuirks[weaponId] ?? [];
}

// =============================================================================
// Weapon Quirk Parsing (Task 12.11)
// =============================================================================

/**
 * Parse weapon quirk lines from MTF format.
 * MegaMek format: `weapon_quirk:quirk_name:weapon_name:location`
 * @param lines - All lines from the MTF file
 * @returns Record mapping weapon name to array of quirk IDs
 */
export function parseWeaponQuirksFromMTF(
  lines: readonly string[],
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const line of lines) {
    if (!line.startsWith('weapon_quirk:')) continue;

    const parts = line.substring('weapon_quirk:'.length).split(':');
    if (parts.length < 2) continue;

    const quirkName = parts[0].trim();
    const weaponName = parts[1].trim();

    if (!quirkName || !weaponName) continue;

    if (!result[weaponName]) {
      result[weaponName] = [];
    }
    result[weaponName].push(quirkName);
  }

  return result;
}

/**
 * Parse weapon quirk tags from BLK format.
 * BLK format uses XML-like tags: `<weapon_quirks>` containing `quirk_name:weapon_name` lines.
 * @param rawQuirkEntries - Array of weapon quirk entries from BLK parser
 * @returns Record mapping weapon name to array of quirk IDs
 */
export function parseWeaponQuirksFromBLK(
  rawQuirkEntries: readonly string[],
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const entry of rawQuirkEntries) {
    const colonIdx = entry.indexOf(':');
    if (colonIdx < 0) continue;

    const quirkName = entry.substring(0, colonIdx).trim();
    const weaponName = entry.substring(colonIdx + 1).trim();

    if (!quirkName || !weaponName) continue;

    if (!result[weaponName]) {
      result[weaponName] = [];
    }
    result[weaponName].push(quirkName);
  }

  return result;
}

// =============================================================================
// Quirk Catalog
// =============================================================================

/**
 * Quirk category for catalog organization.
 */
export type QuirkCategory =
  | 'targeting'
  | 'defensive'
  | 'piloting'
  | 'physical'
  | 'initiative'
  | 'combat'
  | 'crit'
  | 'weapon';

/**
 * Combat pipeline a quirk affects.
 */
export type QuirkPipeline =
  | 'to-hit'
  | 'psr'
  | 'initiative'
  | 'physical'
  | 'damage'
  | 'heat'
  | 'crit';

/**
 * Quirk catalog entry.
 */
export interface IQuirkCatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly category: QuirkCategory;
  readonly pipelines: readonly QuirkPipeline[];
  readonly combatEffect: string;
  /** Whether this is a positive (+) or negative (-) quirk */
  readonly isPositive: boolean;
}

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

// =============================================================================
// Aggregation Functions
// =============================================================================

/**
 * Calculate all quirk-based to-hit modifiers for an attacker/target pair.
 * This is the main entry point wired into calculateToHit().
 */
export function calculateAttackerQuirkModifiers(
  attacker: IAttackerState,
  target: ITargetState,
  rangeBracket: RangeBracket,
  weaponId?: string,
): readonly IToHitModifierDetail[] {
  const attackerQuirks = attacker.unitQuirks ?? [];
  const targetQuirks = target.unitQuirks ?? [];

  if (attackerQuirks.length === 0 && targetQuirks.length === 0 && !weaponId) {
    return [];
  }

  const modifiers: IToHitModifierDetail[] = [];

  // Targeting quirks (attacker)
  const targetingMod = calculateTargetingQuirkModifier(
    attackerQuirks,
    rangeBracket,
  );
  if (targetingMod) modifiers.push(targetingMod);

  // Sensor Ghosts (attacker penalty)
  const sensorMod = calculateSensorGhostsModifier(attackerQuirks);
  if (sensorMod) modifiers.push(sensorMod);

  // Multi-Trac (attacker)
  if (attacker.secondaryTarget?.isSecondary) {
    const multiTracMod = calculateMultiTracModifier(
      attackerQuirks,
      true,
      attacker.secondaryTarget.inFrontArc,
    );
    if (multiTracMod) modifiers.push(multiTracMod);
  }

  // Distracting (target)
  const distractMod = calculateDistractingModifier(targetQuirks);
  if (distractMod) modifiers.push(distractMod);

  // Low Profile (target — only if not already covered by partial cover)
  const lowProfMod = calculateLowProfileModifier(
    targetQuirks,
    target.partialCover,
  );
  if (lowProfMod) modifiers.push(lowProfMod);

  // Weapon quirks (if weapon ID provided)
  if (weaponId) {
    const wpnQuirks = getWeaponQuirks(attacker.weaponQuirks, weaponId);
    if (wpnQuirks.length > 0) {
      const accurateMod = calculateAccurateWeaponModifier(wpnQuirks);
      if (accurateMod) modifiers.push(accurateMod);

      const inaccurateMod = calculateInaccurateWeaponModifier(wpnQuirks);
      if (inaccurateMod) modifiers.push(inaccurateMod);

      const stableMod = calculateStableWeaponModifier(
        wpnQuirks,
        attacker.movementType,
      );
      if (stableMod) modifiers.push(stableMod);
    }
  }

  return modifiers;
}

// =============================================================================
// Utility Functions
// =============================================================================

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
  pipeline: QuirkPipeline,
): IQuirkCatalogEntry[] {
  return Object.values(QUIRK_CATALOG).filter((q) =>
    q.pipelines.includes(pipeline),
  );
}

/**
 * Get all quirks in a specific category.
 */
export function getQuirksByCategory(
  category: QuirkCategory,
): IQuirkCatalogEntry[] {
  return Object.values(QUIRK_CATALOG).filter((q) => q.category === category);
}

/**
 * Check if a unit has a specific quirk.
 */
export function hasQuirk(
  unitQuirks: readonly string[],
  quirkId: string,
): boolean {
  return unitQuirks.includes(quirkId);
}
