/**
 * System Failure PSR Factories
 * Factory functions for PSRs triggered by system failures and movement with damage.
 */

import type { IPendingPSR } from '@/types/gameplay';

import { PSRTrigger } from './types';

export const MASC_SUPERCHARGER_FAILURE_TARGET_NUMBERS = [
  // Standard MegaMek table; alternate MASC option tables remain explicit gaps.
  3, 5, 7, 11, 13, 13, 13,
] as const;

function movementStepTriggerSource(
  stepIndex: number | undefined,
): string | null {
  if (stepIndex === undefined) return null;
  return `movement-step:${stepIndex}`;
}

export function getMASCOrSuperchargerFailureTargetNumber(
  previousTurnsUsed: number | undefined,
): number {
  const sanitizedTurns =
    Number.isFinite(previousTurnsUsed) && previousTurnsUsed !== undefined
      ? Math.max(0, Math.trunc(previousTurnsUsed))
      : 0;
  const index = Math.min(
    sanitizedTurns,
    MASC_SUPERCHARGER_FAILURE_TARGET_NUMBERS.length - 1,
  );
  return MASC_SUPERCHARGER_FAILURE_TARGET_NUMBERS[index];
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
export function createMASCFailurePSR(
  entityId: string,
  previousTurnsUsed?: number,
): IPendingPSR {
  return {
    entityId,
    reason: 'MASC failure',
    fixedTargetNumber:
      getMASCOrSuperchargerFailureTargetNumber(previousTurnsUsed),
    reasonCode: PSRTrigger.MASCFailure,
    additionalModifier: 0,
    triggerSource: PSRTrigger.MASCFailure,
  };
}

/**
 * Create a pending PSR for supercharger failure.
 */
export function createSuperchargerFailurePSR(
  entityId: string,
  previousTurnsUsed?: number,
): IPendingPSR {
  return {
    entityId,
    reason: 'Supercharger failure',
    fixedTargetNumber:
      getMASCOrSuperchargerFailureTargetNumber(previousTurnsUsed),
    reasonCode: PSRTrigger.SuperchargerFailure,
    additionalModifier: 0,
    triggerSource: PSRTrigger.SuperchargerFailure,
  };
}
