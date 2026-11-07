/**
 * Defensive and critical hit quirk modifiers.
 */

import type { CombatLocation } from '@/types/gameplay';

import { isMechUnit } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import type { PhysicalAttackType } from '../physicalAttacks';

import { UNIT_QUIRK_IDS, hasQuirk } from './catalog';

export interface IWeakLegsCriticalContext {
  readonly attackType: PhysicalAttackType;
  readonly role: 'attacker' | 'target';
  readonly hit: boolean;
  readonly hitLocation?: CombatLocation;
  readonly isQuad?: boolean;
  readonly unitType?: string;
}

/** MegaMek48fcb2f64 TWGameManager.java:12869-12872,17207-17217. */
export function getWeakLegsCriticalLocations(
  unitQuirks: readonly string[] | undefined,
  context: IWeakLegsCriticalContext,
): readonly CombatLocation[] {
  if (
    !context.hit ||
    !hasQuirk(unitQuirks ?? [], UNIT_QUIRK_IDS.WEAK_LEGS) ||
    !isMechUnit({ unitType: context.unitType ?? UnitType.BATTLEMECH })
  )
    return [];
  if (context.role === 'target' && context.attackType === 'kick') {
    return context.hitLocation === undefined ? [] : [context.hitLocation];
  }
  if (context.role === 'attacker' && context.attackType === 'dfa') {
    return context.isQuad
      ? ['left_leg', 'right_leg', 'left_arm', 'right_arm']
      : ['left_leg', 'right_leg'];
  }
  return [];
}

/**
 * Prototype: +2 to a BattleMech ranged critical determination roll.
 * MegaMek48fcb2f64 TWGameManager.java:23257-23258,23290-23308.
 * Missing family follows the existing legacy BattleMech contract.
 */
export function getPrototypeCriticalHitModifier(
  unitQuirks: readonly string[] | undefined,
  unitType?: string,
): 0 | 2 {
  return isMechUnit({ unitType: unitType ?? UnitType.BATTLEMECH }) &&
    hasQuirk(unitQuirks ?? [], UNIT_QUIRK_IDS.PROTOTYPE)
    ? 2
    : 0;
}

/**
 * Battle Fist: -1 punch to-hit for equipped arm.
 * @param unitQuirks - Unit's quirk identifiers
 * @param arm - Which arm is punching: 'left' or 'right'
 * @returns To-hit modifier (0 or -1)
 */
export function getBattleFistPunchToHitModifier(
  unitQuirks: readonly string[],
  arm: 'left' | 'right',
): number {
  if (arm === 'left' && hasQuirk(unitQuirks, UNIT_QUIRK_IDS.BATTLE_FISTS_LA)) {
    return -1;
  }
  if (arm === 'right' && hasQuirk(unitQuirks, UNIT_QUIRK_IDS.BATTLE_FISTS_RA)) {
    return -1;
  }
  return 0;
}

/**
 * No Arms: prevents punch attacks.
 */
export function hasNoArms(unitQuirks: readonly string[]): boolean {
  return hasQuirk(unitQuirks, UNIT_QUIRK_IDS.NO_ARMS);
}

/**
 * Low Arms is registered in the pinned MegaMek quirk catalog, but that source
 * snapshot does not route it through combat attack legality. Keep the helper
 * as an explicit no-op so older callers do not invent an unsupported local
 * elevation rule.
 */
export function isLowArmsRestricted(
  unitQuirks: readonly string[],
  elevationDifference: number,
): boolean {
  void unitQuirks;
  void elevationDifference;
  return false;
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
    if (hasQuirk(quirks, UNIT_QUIRK_IDS.BATTLE_COMPUTER)) {
      hasBattleComputer = true;
    }
    if (hasQuirk(quirks, UNIT_QUIRK_IDS.COMMAND_MECH)) {
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
  if (!hasQuirk(attackerQuirks, UNIT_QUIRK_IDS.SENSOR_GHOSTS)) return null;

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
  if (!hasQuirk(attackerQuirks, UNIT_QUIRK_IDS.MULTI_TRAC)) return null;
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
 * Rugged: campaign maintenance-cycle multiplier.
 */
export function getRuggedMaintenanceMultiplier(
  unitQuirks: readonly string[],
): number {
  if (hasQuirk(unitQuirks, UNIT_QUIRK_IDS.RUGGED_2)) return 3;
  if (hasQuirk(unitQuirks, UNIT_QUIRK_IDS.RUGGED_1)) return 2;
  return 1;
}

/**
 * Protected/Exposed Actuators: target-number modifier for anti-Mek Leg/Swarm
 * attacks against this unit.
 */
export function getAntiMekActuatorTargetModifier(
  unitQuirks: readonly string[],
): number {
  if (hasQuirk(unitQuirks, UNIT_QUIRK_IDS.PROTECTED_ACTUATORS)) return 1;
  if (hasQuirk(unitQuirks, UNIT_QUIRK_IDS.EXPOSED_ACTUATORS)) return -1;
  return 0;
}
