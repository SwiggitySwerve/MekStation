/**
 * Environment-Related PSR Factories
 * Factory functions for PSRs triggered by terrain and environmental conditions.
 */

import type { IPendingPSR } from '@/types/gameplay';

import { PSRTrigger } from './types';

/**
 * Create a pending PSR for reactor shutdown.
 * Note: This PSR uses a fixed TN of 3, not piloting skill.
 */
export function createShutdownPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Reactor shutdown',
    additionalModifier: 0,
    triggerSource: PSRTrigger.Shutdown,
  };
}

/**
 * Create a pending PSR for standing up.
 */
export function createStandingUpPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Standing up',
    additionalModifier: 0,
    triggerSource: PSRTrigger.StandingUp,
  };
}

/**
 * Create a pending PSR for entering rubble terrain.
 */
export function createRubblePSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Entering rubble',
    additionalModifier: 0,
    triggerSource: PSRTrigger.EnteringRubble,
  };
}

/**
 * Create a pending PSR for running through rough terrain.
 */
export function createRunningRoughTerrainPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Running through rough terrain',
    additionalModifier: 0,
    triggerSource: PSRTrigger.RunningRoughTerrain,
  };
}

/**
 * Create a pending PSR for moving on ice.
 */
export function createIcePSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Moving on ice',
    additionalModifier: 0,
    triggerSource: PSRTrigger.MovingOnIce,
  };
}

/**
 * Create a pending PSR for entering water.
 */
export function createEnteringWaterPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Entering water',
    additionalModifier: 0,
    triggerSource: PSRTrigger.EnteringWater,
  };
}

/**
 * Create a pending PSR for exiting water.
 */
export function createExitingWaterPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Exiting water',
    additionalModifier: 0,
    triggerSource: PSRTrigger.ExitingWater,
  };
}

/**
 * Create a pending PSR for skidding on pavement/ice.
 */
export function createSkiddingPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Skidding',
    additionalModifier: 0,
    triggerSource: PSRTrigger.Skidding,
  };
}

/**
 * Create a pending PSR for building collapse.
 */
export function createBuildingCollapsePSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Building collapse',
    additionalModifier: 0,
    triggerSource: PSRTrigger.BuildingCollapse,
  };
}
