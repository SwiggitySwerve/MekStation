import {
  CombatLocation,
  ICriticalHitResult,
  IPilotDamageResult,
} from '@/types/gameplay';

import type { D6Roller } from '../diceTypes';

import { isHeadHit } from '../hitLocation';
import { checkCriticalHitTrigger } from './critical';
import { checkUnitDestruction } from './destruction';
import { applyDamageWithTransfer } from './location';
import { applyPilotDamage } from './pilot';
import { IResolveDamageResult, IUnitDamageState } from './types';

/**
 * Per Total Warfare p. 41 ("Head Damage"): any single hit that lands on
 * the head is capped at 3 points applied; overflow is discarded, NOT
 * transferred. Because cluster weapons (LRM, SRM, AC/LB-X, etc.) invoke
 * `resolveDamage` once per cluster group, applying the cap here also
 * satisfies the per-cluster-group independent cap (spec § Head Damage
 * Cap / Scenario: Cluster hits cap per group).
 *
 * Canonical OpenSpec change: integrate-damage-pipeline / tasks 5.1–5.3.
 */
export const HEAD_DAMAGE_CAP_PER_HIT = 3;

/**
 * Resolve a damage application.
 *
 * The optional `roller` parameter threads a deterministic `D6Roller`
 * (typically a `SeededD6Roller` adapter via `.asD6Roller()`) through
 * the dice path so unit / scenario / Monte Carlo tests can reproduce
 * exact crit sequences. When omitted, the function falls back to
 * `defaultD6Roller` (= `Math.random`) so existing production callsites
 * keep their current behaviour.
 *
 * @spec openspec/changes/add-combat-fidelity-suite/specs/simulation-system/spec.md
 *       (Requirement: Deterministic D6 Roller Adapter for Test Pyramid)
 */
export function resolveDamage(
  state: IUnitDamageState,
  location: CombatLocation,
  damage: number,
  roller?: D6Roller,
): IResolveDamageResult {
  let currentState = state;

  // Apply head-damage cap BEFORE dispatching to the transfer chain.
  // This must not raise the damage, so `Math.min` is safe even if a
  // caller passes a degenerate negative value (which is clamped to 0
  // downstream anyway).
  const effectiveDamage =
    isHeadHit(location) && damage > HEAD_DAMAGE_CAP_PER_HIT
      ? HEAD_DAMAGE_CAP_PER_HIT
      : damage;

  const { state: stateAfterDamage, results: locationDamages } =
    applyDamageWithTransfer(currentState, location, effectiveDamage);
  currentState = stateAfterDamage;

  const criticalHits: ICriticalHitResult[] = [];
  let pilotDamage: IPilotDamageResult | undefined;

  if (isHeadHit(location) && damage > 0) {
    const { state: stateAfterPilot, result } = applyPilotDamage(
      currentState,
      1,
      'head_hit',
    );
    currentState = stateAfterPilot;
    pilotDamage = result;
  }

  for (const locDamage of locationDamages) {
    if (locDamage.structureDamage > 0 && !locDamage.destroyed) {
      checkCriticalHitTrigger(locDamage.structureDamage, roller);
    }
  }

  const {
    state: stateAfterDestruction,
    destroyed,
    cause,
  } = checkUnitDestruction(currentState);
  currentState = stateAfterDestruction;

  return {
    state: currentState,
    result: {
      locationDamages,
      criticalHits,
      pilotDamage,
      unitDestroyed: destroyed,
      destructionCause: cause,
    },
  };
}
