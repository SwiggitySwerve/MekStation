/**
 * Battle Armor Vibro-Claw Physical Attack
 *
 * BA with Vibro-Claws can declare a Vibro-Claw Attack in the physical phase:
 *   - Damage per claw = 1 + ceil(0.5 × survivingTroopers).
 *   - Applied per claw (1 or 2 claws per trooper).
 *   - Valid targets: mech, vehicle, or ProtoMech.
 *
 * @spec openspec/changes/add-battlearmor-combat-behavior/specs/combat-resolution/spec.md
 *   (Section 8: Vibro-Claw Physical Attack)
 */

import type {
  IBattleArmorCombatState,
  IBattleArmorVibroClawResult,
} from '@/types/gameplay';

import { getSurvivingTroopers } from './state';

/**
 * Valid target types for a vibro-claw attack (per Section 8.3).
 */
export type VibroClawTargetType = 'mech' | 'vehicle' | 'protomech';

export interface IResolveVibroClawParams {
  readonly state: IBattleArmorCombatState;
  /** Target unit class. */
  readonly targetType: VibroClawTargetType;
  /**
   * Number of claws being used this attack. Defaults to the squad's
   * construction-time `vibroClawCount` (0, 1, or 2) — callers can override
   * for "use one claw only" play.
   */
  readonly clawsOverride?: number;
}

/**
 * Compute the per-claw vibro-claw damage: `1 + ceil(0.5 × survivingTroopers)`.
 */
export function computeVibroClawDamagePerClaw(
  survivingTroopers: number,
): number {
  if (survivingTroopers <= 0) return 0;
  return 1 + Math.ceil(0.5 * survivingTroopers);
}

/**
 * Resolve a BA vibro-claw attack. Returns the per-claw + total damage and
 * surviving-trooper count at the moment of attack.
 *
 * Note: This module reports the damage values only — the caller applies the
 * resulting damage to the target via the appropriate per-unit-type pipeline
 * (mech / vehicle / protomech).
 */
export function resolveVibroClawAttack(
  params: IResolveVibroClawParams,
): IBattleArmorVibroClawResult {
  // Reject if squad cannot attack.
  if (!params.state.hasVibroClaws) {
    return {
      damagePerClaw: 0,
      claws: 0,
      totalDamage: 0,
      survivingTroopers: getSurvivingTroopers(params.state),
    };
  }

  const survivors = getSurvivingTroopers(params.state);
  const claws = Math.max(
    0,
    Math.min(
      params.clawsOverride ?? params.state.vibroClawCount,
      params.state.vibroClawCount,
    ),
  );
  const damagePerClaw = computeVibroClawDamagePerClaw(survivors);
  const totalDamage = damagePerClaw * claws;

  return {
    damagePerClaw,
    claws,
    totalDamage,
    survivingTroopers: survivors,
  };
}
