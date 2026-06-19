import { CombatLocation } from '@/types/gameplay';

import type { D6Roller } from '../diceTypes';

import { isHeadHit } from '../hitLocation';
import { finalizeDamageResolution } from './finalize';
import {
  applyDamageWithTransfer,
  applyInternalDamageWithTransfer,
} from './location';
import { IResolveDamageResult, IUnitDamageState } from './types';

/**
 * Per Total Warfare p. 41 ("Head Damage"): any single hit that lands on
 * the head is capped at 3 points applied; overflow is discarded, NOT
 * transferred. Because cluster weapons (LRM, SRM, AC/LB-X, etc.) invoke
 * `resolveDamage` once per cluster group, applying the cap here also
 * satisfies the per-cluster-group independent cap.
 */
export const HEAD_DAMAGE_CAP_PER_HIT = 3;

/**
 * Resolve a damage application.
 *
 * The optional `roller` parameter threads a deterministic `D6Roller`
 * through the dice path so unit/scenario tests can reproduce exact crit
 * sequences. When omitted, the function falls back to production random
 * behavior inside the lower-level roll helpers.
 */
export function resolveDamage(
  state: IUnitDamageState,
  location: CombatLocation,
  damage: number,
  roller?: D6Roller,
  options: { readonly rollCriticalHits?: boolean } = {},
): IResolveDamageResult {
  const effectiveDamage =
    isHeadHit(location) && damage > HEAD_DAMAGE_CAP_PER_HIT
      ? HEAD_DAMAGE_CAP_PER_HIT
      : damage;

  const { state: stateAfterDamage, results: locationDamages } =
    applyDamageWithTransfer(state, location, effectiveDamage);

  return finalizeDamageResolution({
    initialState: state,
    stateAfterDamage,
    location,
    originalDamage: damage,
    locationDamages,
    roller,
    applyHeadPilotDamage: true,
    rollCriticalHits: options.rollCriticalHits ?? true,
  });
}

/**
 * Resolve damage that bypasses armor and starts at internal structure.
 * Ammo explosions use this path: MegaMek marks ammo-explosion damage as
 * direct-to-IS and handles armor blowout separately from the structure
 * cascade.
 */
export function resolveInternalDamage(
  state: IUnitDamageState,
  location: CombatLocation,
  damage: number,
  roller?: D6Roller,
  options: {
    readonly applyHeadPilotDamage?: boolean;
    readonly rollCriticalHits?: boolean;
  } = {},
): IResolveDamageResult {
  const { state: stateAfterDamage, results: locationDamages } =
    applyInternalDamageWithTransfer(state, location, damage);

  return finalizeDamageResolution({
    initialState: state,
    stateAfterDamage,
    location,
    originalDamage: damage,
    locationDamages,
    roller,
    applyHeadPilotDamage: options.applyHeadPilotDamage ?? true,
    rollCriticalHits: options.rollCriticalHits ?? true,
  });
}
