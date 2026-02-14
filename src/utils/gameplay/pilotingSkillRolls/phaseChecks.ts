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
 * Check if a unit has accumulated 20+ damage this phase.
 * Should be called at end of weapon attack phase.
 */
export function checkPhaseDamagePSR(
  unitState: IUnitGameState,
): IPendingPSR | null {
  const damageThisPhase = unitState.damageThisPhase ?? 0;
  if (damageThisPhase >= 20) {
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
 * @returns Object describing the stand-up attempt, or null if not prone
 */
export function createStandUpAttempt(
  unitState: IUnitGameState,
  walkingMP: number,
): { psr: IPendingPSR; mpCost: number } | null {
  if (!unitState.prone) {
    return null;
  }

  return {
    psr: createStandingUpPSR(unitState.id),
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
