/**
 * Battle Armor Anti-Mech Leg Attack
 *
 * BA in base contact with a mech may declare a Leg Attack during the
 * physical-attack phase:
 *   - Roll 2d6 + BA piloting vs Mech piloting + 4 (TW).
 *   - Success: damage to target leg = 4 × surviving troopers.
 *   - Failure: BA squad takes 1d6 damage distributed across troopers.
 *
 * @spec openspec/changes/add-battlearmor-combat-behavior/specs/combat-resolution/spec.md
 *   (Section 5: Anti-Mech Leg Attack)
 */

import type {
  IBattleArmorCombatState,
  IBattleArmorLegAttackResult,
  IBattleArmorResolveDamageResult,
} from '@/types/gameplay';

import { D6Roller, defaultD6Roller, roll2d6 } from '../diceTypes';
import { battleArmorResolveDamage } from './damage';
import { getSurvivingTroopers } from './state';

/**
 * Damage dealt to the target leg per surviving trooper (TW p.228).
 */
export const LEG_ATTACK_DAMAGE_PER_TROOPER = 4;

/**
 * Fixed modifier added to the mech's piloting skill when computing the
 * leg-attack target number (TW p.228 — "+4").
 */
export const LEG_ATTACK_TARGET_PILOTING_BONUS = 4;

/**
 * Parameters for `resolveLegAttack`.
 */
export interface IResolveLegAttackParams {
  readonly state: IBattleArmorCombatState;
  /** Attacker's (BA) anti-mech skill — rolled as 2d6 vs TN. */
  readonly attackerAntiMechSkill: number;
  /** Target mech piloting skill (TN = pilotingSkill + 4). */
  readonly targetPilotingSkill: number;
  readonly diceRoller?: D6Roller;
  /**
   * Override the 1d6 self-damage roll on failure (test determinism). If
   * provided, no dice are rolled for self damage.
   */
  readonly forcedSelfDamage?: number;
}

/**
 * Resolve a BA anti-mech leg attack. Returns the roll outcome and (when the
 * attack fails) the post-self-damage squad state.
 */
export function resolveLegAttack(params: IResolveLegAttackParams): {
  readonly attack: IBattleArmorLegAttackResult;
  /**
   * When the attack fails, the squad takes 1d6 damage distributed across
   * troopers. `selfDamageResult.state` reflects the new squad state; when
   * the attack succeeds this is `undefined`.
   */
  readonly selfDamageResult?: IBattleArmorResolveDamageResult;
} {
  const diceRoller = params.diceRoller ?? defaultD6Roller;
  const survivors = getSurvivingTroopers(params.state);
  const { dice, total } = roll2d6(diceRoller);

  // TN: mech piloting + 4. Spec text: "2d6 + BA piloting vs Mech piloting + 4".
  // The "+ BA piloting" here is implemented as rolling 2d6 vs TN where TN
  // incorporates attacker skill. We use the common BattleTech convention
  // (attacker makes modified roll vs fixed TN) — TN = target piloting + 4 +
  // attacker's anti-mech skill.
  const targetNumber =
    params.targetPilotingSkill +
    LEG_ATTACK_TARGET_PILOTING_BONUS +
    params.attackerAntiMechSkill;

  const success = total >= targetNumber;
  const damageToLeg = success ? LEG_ATTACK_DAMAGE_PER_TROOPER * survivors : 0;

  let selfDamage = 0;
  let selfDamageResult: IBattleArmorResolveDamageResult | undefined;
  if (!success) {
    // 1d6 self-damage (TW), distributed across troopers via the standard
    // squad damage pipeline — each "hit" is 1 damage.
    selfDamage = params.forcedSelfDamage ?? diceRoller();
    const perHit: number[] = [];
    for (let i = 0; i < selfDamage; i++) {
      perHit.push(1);
    }
    selfDamageResult = battleArmorResolveDamage(params.state, perHit, {
      diceRoller,
    });
  }

  return {
    attack: {
      attackerDice: [dice[0], dice[1]],
      attackerRoll: total,
      targetNumber,
      success,
      damageToLeg,
      selfDamage,
      survivingTroopers: survivors,
    },
    selfDamageResult,
  };
}
