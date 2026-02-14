/**
 * Defensive and critical hit quirk modifiers.
 */

import { UNIT_QUIRK_IDS } from './catalog';

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

/**
 * Sensor Ghosts: +1 to own attacks (penalty to attacker accuracy).
 */
export function calculateSensorGhostsModifier(
  attackerQuirks: readonly string[],
): import('@/types/gameplay').IToHitModifierDetail | null {
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
): import('@/types/gameplay').IToHitModifierDetail | null {
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
