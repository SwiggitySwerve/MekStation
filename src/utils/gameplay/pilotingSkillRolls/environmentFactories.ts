/**
 * Environment-Related PSR Factories
 * Factory functions for PSRs triggered by terrain and environmental conditions.
 */

import type { IPendingPSR } from '@/types/gameplay';

import { PSRTrigger } from './types';

/**
 * Per `enrich-movement-declared-with-chain-and-displacement` (piloting-skill-rolls
 * delta — Movement-Step PSR Trigger-Source Stamping): when a PSR fires
 * during the resolution of a specific movement step, callers pass the
 * step's 0-based ordinal so the resulting `triggerSource` is the
 * canonical `'movement-step:<index>'` form. When omitted, the factory
 * falls back to the legacy `PSRTrigger.*` enum value — preserving the
 * existing free-string semantics for non-movement-step PSR callers
 * (recovery, post-phase damage, heat, gyro destroyed, etc.).
 */
function movementStepTriggerSource(
  stepIndex: number | undefined,
): string | null {
  if (stepIndex === undefined) return null;
  return `movement-step:${stepIndex}`;
}

/**
 * Create a pending PSR for reactor shutdown.
 * Note: This PSR uses a fixed TN of 3, not piloting skill.
 */
export function createShutdownPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Reactor shutdown',
    reasonCode: PSRTrigger.Shutdown,
    additionalModifier: 0,
    triggerSource: PSRTrigger.Shutdown,
  };
}

/**
 * Create a pending PSR for standing up.
 *
 * @param entityId - The unit attempting to stand
 * @param stepIndex - Optional movement-step ordinal (per the PR-C
 *   piloting-skill-rolls delta). When provided, overrides
 *   `triggerSource` to `'movement-step:<index>'` so consumers can
 *   correlate the AttemptStand PSR back to the originating step in
 *   `movement_declared.payload.steps`. Existing callers that don't
 *   yet thread step context through pass `undefined` and keep the
 *   legacy `PSRTrigger.StandingUp` source.
 */
export function createStandingUpPSR(
  entityId: string,
  stepIndex?: number,
): IPendingPSR {
  const movementStepSource = movementStepTriggerSource(stepIndex);
  return {
    entityId,
    reason: 'Standing up',
    reasonCode: PSRTrigger.StandingUp,
    additionalModifier: 0,
    triggerSource: movementStepSource ?? PSRTrigger.StandingUp,
  };
}

/**
 * Create a pending PSR for entering rubble terrain.
 *
 * @param stepIndex - Optional movement-step ordinal (per the PR-C
 *   piloting-skill-rolls delta). Same semantics as
 *   `createStandingUpPSR` — when provided, overrides `triggerSource`
 *   to `'movement-step:<index>'`.
 */
export function createRubblePSR(
  entityId: string,
  stepIndex?: number,
): IPendingPSR {
  const movementStepSource = movementStepTriggerSource(stepIndex);
  return {
    entityId,
    reason: 'Entering rubble',
    reasonCode: PSRTrigger.EnteringRubble,
    additionalModifier: 0,
    triggerSource: movementStepSource ?? PSRTrigger.EnteringRubble,
  };
}

/**
 * Create a pending PSR for running through rough terrain.
 */
export function createRunningRoughTerrainPSR(
  entityId: string,
  stepIndex?: number,
): IPendingPSR {
  const movementStepSource = movementStepTriggerSource(stepIndex);
  return {
    entityId,
    reason: 'Running through rough terrain',
    reasonCode: PSRTrigger.RunningRoughTerrain,
    additionalModifier: 0,
    triggerSource: movementStepSource ?? PSRTrigger.RunningRoughTerrain,
  };
}

/**
 * Create a pending PSR for moving on ice.
 */
export function createIcePSR(
  entityId: string,
  stepIndex?: number,
): IPendingPSR {
  const movementStepSource = movementStepTriggerSource(stepIndex);
  return {
    entityId,
    reason: 'Moving on ice',
    reasonCode: PSRTrigger.MovingOnIce,
    additionalModifier: 0,
    triggerSource: movementStepSource ?? PSRTrigger.MovingOnIce,
  };
}

/**
 * Create a pending PSR for entering water.
 */
export function createEnteringWaterPSR(
  entityId: string,
  stepIndex?: number,
): IPendingPSR {
  const movementStepSource = movementStepTriggerSource(stepIndex);
  return {
    entityId,
    reason: 'Entering water',
    reasonCode: PSRTrigger.EnteringWater,
    additionalModifier: 0,
    triggerSource: movementStepSource ?? PSRTrigger.EnteringWater,
  };
}

/**
 * Create a pending PSR for exiting water.
 */
export function createExitingWaterPSR(
  entityId: string,
  stepIndex?: number,
): IPendingPSR {
  const movementStepSource = movementStepTriggerSource(stepIndex);
  return {
    entityId,
    reason: 'Exiting water',
    reasonCode: PSRTrigger.ExitingWater,
    additionalModifier: 0,
    triggerSource: movementStepSource ?? PSRTrigger.ExitingWater,
  };
}

/**
 * Create a pending PSR for skidding on pavement/ice.
 *
 * @param stepIndex - Optional movement-step ordinal (per the PR-C
 *   piloting-skill-rolls delta). Skid PSRs canonically fire DURING
 *   step resolution, so future runner wiring SHOULD pass the step
 *   index. Existing callers that pass `undefined` keep the legacy
 *   `PSRTrigger.Skidding` source.
 */
export function createSkiddingPSR(
  entityId: string,
  stepIndex?: number,
): IPendingPSR {
  const movementStepSource = movementStepTriggerSource(stepIndex);
  return {
    entityId,
    reason: 'Skidding',
    reasonCode: PSRTrigger.Skidding,
    additionalModifier: 0,
    triggerSource: movementStepSource ?? PSRTrigger.Skidding,
  };
}

/**
 * Create a pending PSR for a LAM AirMek landing with gyro or leg damage.
 */
export function createAirMekLandingPSR(
  entityId: string,
  additionalModifier = 0,
): IPendingPSR {
  return {
    entityId,
    reason: 'landing with gyro or leg damage',
    reasonCode: PSRTrigger.AirMekLanding,
    additionalModifier,
    triggerSource: PSRTrigger.AirMekLanding,
  };
}

/**
 * Create a pending PSR for building collapse.
 */
export function createBuildingCollapsePSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Building collapse',
    reasonCode: PSRTrigger.BuildingCollapse,
    additionalModifier: 0,
    triggerSource: PSRTrigger.BuildingCollapse,
  };
}
