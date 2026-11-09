/**
 * Phase Check Functions
 * Functions for checking PSR triggers and managing phase-related PSR logic.
 */

import type {
  IComponentDamageState,
  IUnitGameState,
  IPendingPSR,
} from '@/types/gameplay';

import { createDamagePSR } from './damageFactories';
import { createStandingUpPSR } from './environmentFactories';

/**
 * MegaMek 48fcb2f64 `TWGameManager.checkForPSRFromDamage`
 * (TWGameManager.java:17851-17854): 20 damage in a phase, or 30 for a dual
 * cockpit Mek with an active dedicated pilot.
 */
export const PHASE_DAMAGE_PSR_THRESHOLD = 20;
export const DUAL_COCKPIT_PHASE_DAMAGE_PSR_THRESHOLD = 30;

/**
 * Check if a unit has accumulated 20+ damage this phase (30+ for a dual
 * cockpit with a dedicated pilot). The threshold only; whether the unit can
 * fall is the caller's gate.
 *
 * `dualCockpitDedicatedPilot` has no unit-state source yet: MekStation has no
 * dual cockpit construction type and no multi-crew model, so no caller sets it.
 *
 * Should be called at the end of each damage-taking phase.
 */
export function checkPhaseDamagePSR(
  unitState: IUnitGameState,
  options: { readonly dualCockpitDedicatedPilot?: boolean } = {},
): IPendingPSR | null {
  const damageThisPhase = unitState.damageThisPhase ?? 0;
  const threshold =
    options.dualCockpitDedicatedPilot === true
      ? DUAL_COCKPIT_PHASE_DAMAGE_PSR_THRESHOLD
      : PHASE_DAMAGE_PSR_THRESHOLD;
  if (damageThisPhase >= threshold) {
    return createDamagePSR(unitState.id);
  }
  return null;
}

/**
 * Attempt to stand up a prone unit.
 * Returns the PSR to resolve and the walking MP cost.
 *
 * @param unitState - Current unit state (must be prone)
 * @param walkingMP - Unit's base walking MP
 * @param stepIndex - Optional 0-based ordinal of the `'standUp'` step in
 *   the unit's `movement_declared.payload.steps` array. Per the PR-C
 *   piloting-skill-rolls delta, when this is provided the resulting
 *   PSR's `triggerSource` becomes `'movement-step:<index>'` so
 *   consumers can correlate the AttemptStand PSR back to the
 *   originating step. Legacy callers that don't yet thread step
 *   context through pass `undefined` and keep the legacy
 *   `PSRTrigger.StandingUp` source.
 * @returns Object describing the stand-up attempt, or null if not prone
 */
export function createStandUpAttempt(
  unitState: IUnitGameState,
  walkingMP: number,
  stepIndex?: number,
): { psr: IPendingPSR; mpCost: number } | null {
  if (!unitState.prone) {
    return null;
  }

  return {
    psr: createStandingUpPSR(unitState.id, stepIndex),
    mpCost: walkingMP,
  };
}

/**
 * Check if a gyro is destroyed (2 hits for standard gyro).
 * A destroyed gyro means automatic fall — no PSR possible.
 */
export function isGyroDestroyed(
  componentDamage: IComponentDamageState,
): boolean {
  return componentDamage.gyroHits >= 2;
}
