/**
 * System Failure PSR Factories
 * Factory functions for PSRs triggered by system failures and movement with damage.
 */

import type { IPendingPSR } from '@/types/gameplay';

import { PSRTrigger } from './types';

function movementStepTriggerSource(
  stepIndex: number | undefined,
): string | null {
  if (stepIndex === undefined) return null;
  return `movement-step:${stepIndex}`;
}

/**
 * Create a pending PSR for running with a damaged hip (per hex moved).
 */
export function createRunningDamagedHipPSR(
  entityId: string,
  stepIndex?: number,
): IPendingPSR {
  const movementStepSource = movementStepTriggerSource(stepIndex);
  return {
    entityId,
    reason: 'Running with damaged hip',
    reasonCode: PSRTrigger.RunningDamagedHip,
    additionalModifier: 0,
    triggerSource: movementStepSource ?? PSRTrigger.RunningDamagedHip,
  };
}

/**
 * Create a pending PSR for running with a damaged gyro.
 */
export function createRunningDamagedGyroPSR(
  entityId: string,
  stepIndex?: number,
): IPendingPSR {
  const movementStepSource = movementStepTriggerSource(stepIndex);
  return {
    entityId,
    reason: 'Running with damaged gyro',
    reasonCode: PSRTrigger.RunningDamagedGyro,
    additionalModifier: 0,
    triggerSource: movementStepSource ?? PSRTrigger.RunningDamagedGyro,
  };
}

/**
 * Create a pending PSR for MASC failure.
 */
export function createMASCFailurePSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'MASC failure',
    reasonCode: PSRTrigger.MASCFailure,
    additionalModifier: 0,
    triggerSource: PSRTrigger.MASCFailure,
  };
}

/**
 * Create a pending PSR for supercharger failure.
 */
export function createSuperchargerFailurePSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Supercharger failure',
    reasonCode: PSRTrigger.SuperchargerFailure,
    additionalModifier: 0,
    triggerSource: PSRTrigger.SuperchargerFailure,
  };
}
