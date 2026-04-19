/**
 * Battle Armor Anti-Mech Swarm Attack
 *
 * BA with Magnetic Clamps may declare a Swarm attack in base contact with a
 * mech:
 *   - Attach roll: 2d6 vs target mech piloting + 4 (TW).
 *   - Attached: per-turn damage = 1d6 + surviving troopers, random location.
 *   - Attached mech may dismount: Piloting skill roll vs TN 8; success
 *     ejects the squad and deals 2d6 damage to it.
 *   - Attached mech may also shoot its own attacker-location at -1 penalty
 *     (caller-handled).
 *
 * @spec openspec/changes/add-battlearmor-combat-behavior/specs/combat-resolution/spec.md
 *   (Section 6: Anti-Mech Swarm Attack)
 */

import type {
  IBattleArmorCombatState,
  IBattleArmorResolveDamageResult,
  IBattleArmorSwarmAttachResult,
  IBattleArmorSwarmDamageResult,
  IBattleArmorSwarmDismountResult,
} from '@/types/gameplay';

import { D6Roller, defaultD6Roller, roll2d6 } from '../diceTypes';
import { battleArmorResolveDamage } from './damage';
import { getSurvivingTroopers, setSwarmTarget } from './state';

/**
 * Fixed modifier added to the mech's piloting skill when computing the
 * swarm-attach target number (TW p.228 — "+4", same as leg attack).
 */
export const SWARM_ATTACH_TARGET_PILOTING_BONUS = 4;

/**
 * Piloting-skill TN for the attached mech's dismount roll (TW p.228).
 */
export const SWARM_DISMOUNT_TARGET_NUMBER = 8;

// =============================================================================
// Attach
// =============================================================================

export interface ISwarmAttachParams {
  readonly state: IBattleArmorCombatState;
  /** Whether the target is a mech (swarm only works vs mechs). */
  readonly targetIsMech: boolean;
  /** Whether BA is in base contact with the target mech. */
  readonly targetAdjacent: boolean;
  readonly attackerAntiMechSkill: number;
  readonly targetPilotingSkill: number;
  readonly targetMechId: string;
  readonly diceRoller?: D6Roller;
}

/**
 * Attempt a swarm attach. Returns the roll result AND (on success) the new
 * combat state with `swarmingUnitId` set.
 */
export function resolveSwarmAttach(params: ISwarmAttachParams): {
  readonly result: IBattleArmorSwarmAttachResult;
  readonly state: IBattleArmorCombatState;
} {
  // Eligibility: requires mag clamps, target must be a mech, must be adjacent.
  if (!params.state.hasMagneticClamp) {
    return {
      result: {
        attackerDice: [0, 0],
        attackerRoll: 0,
        targetNumber: 0,
        success: false,
        eligible: false,
        reason: 'no_magnetic_clamp',
      },
      state: params.state,
    };
  }
  if (!params.targetIsMech) {
    return {
      result: {
        attackerDice: [0, 0],
        attackerRoll: 0,
        targetNumber: 0,
        success: false,
        eligible: false,
        reason: 'target_not_mech',
      },
      state: params.state,
    };
  }
  if (!params.targetAdjacent) {
    return {
      result: {
        attackerDice: [0, 0],
        attackerRoll: 0,
        targetNumber: 0,
        success: false,
        eligible: false,
        reason: 'target_not_adjacent',
      },
      state: params.state,
    };
  }

  const diceRoller = params.diceRoller ?? defaultD6Roller;
  const { dice, total } = roll2d6(diceRoller);
  const targetNumber =
    params.targetPilotingSkill +
    SWARM_ATTACH_TARGET_PILOTING_BONUS +
    params.attackerAntiMechSkill;
  const success = total >= targetNumber;

  const newState = success
    ? setSwarmTarget(params.state, params.targetMechId)
    : params.state;

  return {
    result: {
      attackerDice: [dice[0], dice[1]],
      attackerRoll: total,
      targetNumber,
      success,
      eligible: true,
    },
    state: newState,
  };
}

// =============================================================================
// Per-turn swarm damage tick
// =============================================================================

export interface ISwarmDamageTickParams {
  readonly state: IBattleArmorCombatState;
  /**
   * Caller-supplied label for the random mech location hit this tick (the
   * BA module does not know the target's hit-location tables — GameEngine
   * picks the location and feeds the label in for the event payload).
   */
  readonly locationLabel: string;
  readonly diceRoller?: D6Roller;
}

/**
 * Roll and resolve per-turn swarm damage. Does NOT apply damage to the
 * target mech directly — returns the damage total so the caller can invoke
 * the mech damage pipeline for the chosen location.
 *
 * Damage formula: 1d6 + surviving troopers.
 */
export function resolveSwarmDamageTick(
  params: ISwarmDamageTickParams,
): IBattleArmorSwarmDamageResult {
  const diceRoller = params.diceRoller ?? defaultD6Roller;
  const survivors = getSurvivingTroopers(params.state);
  const rollD6 = diceRoller();
  const damage = rollD6 + survivors;
  return {
    rollD6,
    survivingTroopers: survivors,
    damage,
    locationLabel: params.locationLabel,
  };
}

// =============================================================================
// Dismount attempt (by the attached mech)
// =============================================================================

export interface ISwarmDismountParams {
  readonly state: IBattleArmorCombatState;
  /** Target mech pilot skill — rolled against TN 8 (TW). */
  readonly mechPilotingSkill: number;
  readonly diceRoller?: D6Roller;
  /**
   * Override the 2d6 dismount-damage roll applied to the squad on success
   * (for deterministic tests).
   */
  readonly forcedDismountDamage?: number;
}

/**
 * Resolve a dismount attempt by the attached mech. On success the swarm
 * ends and the BA squad takes 2d6 damage distributed across troopers.
 * Returns both the roll and (on success) the squad-state-after-damage.
 */
export function resolveSwarmDismount(params: ISwarmDismountParams): {
  readonly result: IBattleArmorSwarmDismountResult;
  /**
   * Squad state after this attempt. On success, `swarmingUnitId` is cleared
   * and 2d6 dismount damage has been applied. On failure, state is unchanged.
   */
  readonly state: IBattleArmorCombatState;
  /**
   * Damage-distribution result (from `battleArmorResolveDamage`) when the
   * dismount succeeds; `undefined` on failure.
   */
  readonly damageResult?: IBattleArmorResolveDamageResult;
} {
  const diceRoller = params.diceRoller ?? defaultD6Roller;
  const { dice, total } = roll2d6(diceRoller);
  const targetNumber = SWARM_DISMOUNT_TARGET_NUMBER;
  const success = total >= targetNumber;

  if (!success) {
    return {
      result: {
        pilotingDice: [dice[0], dice[1]],
        pilotingRoll: total,
        targetNumber,
        success: false,
        dismountDamage: 0,
      },
      state: params.state,
    };
  }

  // 2d6 dismount damage applied to the squad.
  const dismountDamage =
    params.forcedDismountDamage ?? roll2d6(diceRoller).total;
  const perHit: number[] = [];
  for (let i = 0; i < dismountDamage; i++) {
    perHit.push(1);
  }
  const damageResult = battleArmorResolveDamage(params.state, perHit, {
    diceRoller,
  });
  const detached = setSwarmTarget(damageResult.state, undefined);

  return {
    result: {
      pilotingDice: [dice[0], dice[1]],
      pilotingRoll: total,
      targetNumber,
      success: true,
      dismountDamage,
    },
    state: detached,
    damageResult,
  };
}

// =============================================================================
// Detach (non-dismount) — squad destroyed or target destroyed
// =============================================================================

/**
 * Force-detach without a roll — used when the squad is destroyed, the target
 * is destroyed, or the squad voluntarily disengages. Simply clears the
 * `swarmingUnitId` field.
 */
export function detachSwarm(
  state: IBattleArmorCombatState,
): IBattleArmorCombatState {
  return setSwarmTarget(state, undefined);
}
