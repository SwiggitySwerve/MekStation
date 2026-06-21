import { CombatLocation } from '@/types/gameplay';

import type { D6Roller } from '../diceTypes';

import { finalizeDamageResolution } from './finalize';
import {
  applyDamageWithTransfer,
  applyInternalDamageWithTransfer,
} from './location';
import { IResolveDamageResult, IUnitDamageState } from './types';

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
  const { state: stateAfterDamage, results: locationDamages } =
    applyDamageWithTransfer(state, location, damage);

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
