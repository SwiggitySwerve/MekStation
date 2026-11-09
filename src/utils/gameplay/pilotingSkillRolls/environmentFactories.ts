/**
 * Environment-Related PSR Factories
 * Factory functions for PSRs triggered by terrain and environmental conditions.
 */

import type { IPendingPSR } from '@/types/gameplay';

import { PSRTrigger } from './types';

interface IEnteringWaterPSROptions {
  readonly waterDepth?: number;
}

interface IRubblePSROptions {
  /** Rubble terrain level; above 5 is ultra-rubble (+1). */
  readonly rubbleLevel?: number;
}

interface ISwampBogDownPSROptions {
  readonly swampDepth?: number;
}

/**
 * MegaMek 48fcb2f64 Entity.checkRubbleMove (Entity.java:9556-9559): rubble
 * above level 5 (a destroyed Castle Brian or fortress) is +1 "ultra-rubble".
 */
const ULTRA_RUBBLE_MINIMUM_LEVEL = 6;
const ULTRA_RUBBLE_PILOTING_MODIFIER = 1;

interface ISwampUnstuckPSROptions {
  readonly swampDepth?: number;
}

/** MegaMek Terrain.applyPilotingModifier: swamp is +1 for biped and quad Meks. */
const SWAMP_TERRAIN_PILOTING_MODIFIER = 1;
/** MegaMek Terrain.getUnstuckModifier: quicksand (swamp level > 1) is +3 at ground elevation. */
const QUICKSAND_UNSTUCK_MODIFIER = 3;

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

function normalizeTerrainLevel(level: number | undefined): number | undefined {
  if (level === undefined) return undefined;
  if (!Number.isFinite(level)) return undefined;
  return Math.max(0, Math.trunc(level));
}

function calculateEnteringWaterModifier(
  waterDepth: number | undefined,
): number {
  if (waterDepth === undefined || waterDepth <= 0) return 0;
  if (waterDepth === 1) return -1;
  if (waterDepth === 2) return 0;
  return 1;
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
  options: IRubblePSROptions = {},
): IPendingPSR {
  const movementStepSource = movementStepTriggerSource(stepIndex);
  const isUltraRubble =
    options.rubbleLevel !== undefined &&
    options.rubbleLevel >= ULTRA_RUBBLE_MINIMUM_LEVEL;
  return {
    entityId,
    reason: 'Entering rubble',
    reasonCode: PSRTrigger.EnteringRubble,
    additionalModifier: isUltraRubble ? ULTRA_RUBBLE_PILOTING_MODIFIER : 0,
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
  options: IEnteringWaterPSROptions = {},
): IPendingPSR {
  const movementStepSource = movementStepTriggerSource(stepIndex);
  const waterDepth = normalizeTerrainLevel(options.waterDepth);
  return {
    entityId,
    reason: 'Entering water',
    reasonCode: PSRTrigger.EnteringWater,
    additionalModifier: calculateEnteringWaterModifier(waterDepth),
    ...(waterDepth !== undefined ? { terrainLevel: waterDepth } : {}),
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
  movementBeforeSkidModifier = 0,
): IPendingPSR {
  const movementStepSource = movementStepTriggerSource(stepIndex);
  return {
    entityId,
    reason: 'Skidding',
    reasonCode: PSRTrigger.Skidding,
    additionalModifier: movementBeforeSkidModifier,
    triggerSource: movementStepSource ?? PSRTrigger.Skidding,
  };
}

/**
 * Create a pending PSR for avoiding swamp bog-down.
 */
export function createSwampBogDownPSR(
  entityId: string,
  stepIndex?: number,
  options: ISwampBogDownPSROptions = {},
): IPendingPSR {
  const movementStepSource = movementStepTriggerSource(stepIndex);
  const swampDepth = normalizeTerrainLevel(options.swampDepth);
  return {
    entityId,
    reason: 'Avoid bogging down',
    reasonCode: PSRTrigger.SwampBogDown,
    additionalModifier: 0,
    ...(swampDepth !== undefined ? { terrainLevel: swampDepth } : {}),
    ...(swampDepth !== undefined && swampDepth > 1
      ? { fixedTargetNumber: Number.POSITIVE_INFINITY }
      : {}),
    triggerSource: movementStepSource ?? PSRTrigger.SwampBogDown,
  };
}

/**
 * Create the movement-start roll a stuck unit makes to break free of a swamp
 * (MegaMek 48fcb2f64 TWGameManager.doTryUnstuck, L31368-L31419): base
 * piloting, plus the swamp terrain modifier, plus the unstuck modifier (0 for
 * swamp, +3 for quicksand). MekStation represents only biped and quad leg
 * profiles, so the swamp terrain modifier is always +1. No Swamp Beast or
 * difficult-terrain adjustment applies.
 */
export function createSwampUnstuckPSR(
  entityId: string,
  options: ISwampUnstuckPSROptions = {},
): IPendingPSR {
  const swampDepth = normalizeTerrainLevel(options.swampDepth);
  const inSwamp = swampDepth !== undefined && swampDepth > 0;
  const inQuicksand = swampDepth !== undefined && swampDepth > 1;
  return {
    entityId,
    reason: 'Break free of swamp',
    reasonCode: PSRTrigger.SwampUnstuck,
    additionalModifier:
      (inSwamp ? SWAMP_TERRAIN_PILOTING_MODIFIER : 0) +
      (inQuicksand ? QUICKSAND_UNSTUCK_MODIFIER : 0),
    ...(swampDepth !== undefined ? { terrainLevel: swampDepth } : {}),
    triggerSource: PSRTrigger.SwampUnstuck,
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
export function createBuildingCollapsePSR(
  entityId: string,
  stepIndex?: number,
): IPendingPSR {
  const movementStepSource = movementStepTriggerSource(stepIndex);
  return {
    entityId,
    reason: 'Building collapse',
    reasonCode: PSRTrigger.BuildingCollapse,
    additionalModifier: 0,
    triggerSource: movementStepSource ?? PSRTrigger.BuildingCollapse,
  };
}
