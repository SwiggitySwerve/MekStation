/**
 * System Failure PSR Factories
 * Factory functions for PSRs triggered by system failures and movement with damage.
 */

import type { IPendingPSR } from '@/types/gameplay';

import { PSRTrigger } from './types';

export const MASC_SUPERCHARGER_FAILURE_TARGET_NUMBERS = [
  3, 5, 7, 11, 13, 13, 13,
] as const;
const ALTERNATE_MASC_SUPERCHARGER_FAILURE_TARGET_NUMBERS = [
  0, 3, 5, 7, 11, 13, 13, 13,
] as const;
const ALTERNATE_ENHANCED_MASC_SUPERCHARGER_FAILURE_TARGET_NUMBERS = [
  0, 3, 3, 5, 7, 11, 13, 13, 13,
] as const;

type MascSuperchargerFailureTargetNumbers =
  | typeof MASC_SUPERCHARGER_FAILURE_TARGET_NUMBERS
  | typeof ALTERNATE_MASC_SUPERCHARGER_FAILURE_TARGET_NUMBERS
  | typeof ALTERNATE_ENHANCED_MASC_SUPERCHARGER_FAILURE_TARGET_NUMBERS;

function normalizedOptionalRule(rule: string): string {
  return rule
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function hasOptionalRule(
  optionalRules: readonly string[] | undefined,
  expected: string,
): boolean {
  return (optionalRules ?? []).some(
    (rule) => normalizedOptionalRule(rule) === expected,
  );
}

function selectMASCOrSuperchargerFailureTargetNumbers(
  optionalRules: readonly string[] | undefined,
): MascSuperchargerFailureTargetNumbers {
  if (hasOptionalRule(optionalRules, 'alternate_masc_enhanced')) {
    return ALTERNATE_ENHANCED_MASC_SUPERCHARGER_FAILURE_TARGET_NUMBERS;
  }
  if (hasOptionalRule(optionalRules, 'alternate_masc')) {
    return ALTERNATE_MASC_SUPERCHARGER_FAILURE_TARGET_NUMBERS;
  }
  return MASC_SUPERCHARGER_FAILURE_TARGET_NUMBERS;
}

function movementStepTriggerSource(
  stepIndex: number | undefined,
): string | null {
  if (stepIndex === undefined) return null;
  return `movement-step:${stepIndex}`;
}

export function getMASCOrSuperchargerFailureTargetNumber(
  previousTurnsUsed: number | undefined,
  optionalRules?: readonly string[],
): number {
  const targetNumbers =
    selectMASCOrSuperchargerFailureTargetNumbers(optionalRules);
  const sanitizedTurns =
    Number.isFinite(previousTurnsUsed) && previousTurnsUsed !== undefined
      ? Math.max(0, Math.trunc(previousTurnsUsed))
      : 0;
  const index = Math.min(sanitizedTurns, targetNumbers.length - 1);
  return targetNumbers[index];
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
 * Create a pending PSR/control roll for a represented out-of-control state.
 */
export function createOutOfControlPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Out of control',
    reasonCode: PSRTrigger.OutOfControl,
    additionalModifier: 0,
    triggerSource: PSRTrigger.OutOfControl,
  };
}

/**
 * Create a pending PSR for a controlled sideslip movement check.
 */
export function createControlledSideslipPSR(
  entityId: string,
  stepIndex?: number,
): IPendingPSR {
  const movementStepSource = movementStepTriggerSource(stepIndex);
  return {
    entityId,
    reason: 'Controlled sideslip',
    reasonCode: PSRTrigger.ControlledSideslip,
    additionalModifier: -1,
    triggerSource: movementStepSource ?? PSRTrigger.ControlledSideslip,
  };
}

/**
 * Create a pending PSR for flanking and turning during run/sprint movement.
 */
export function createFlankingAndTurningPSR(
  entityId: string,
  stepIndex?: number,
): IPendingPSR {
  const movementStepSource = movementStepTriggerSource(stepIndex);
  return {
    entityId,
    reason: 'Flanking and turning',
    reasonCode: PSRTrigger.FlankingAndTurning,
    additionalModifier: 0,
    triggerSource: movementStepSource ?? PSRTrigger.FlankingAndTurning,
  };
}

/**
 * Create a pending PSR for MASC failure.
 */
export function createMASCFailurePSR(
  entityId: string,
  previousTurnsUsed?: number,
  optionalRules?: readonly string[],
  stepIndex?: number,
): IPendingPSR {
  const movementStepSource = movementStepTriggerSource(stepIndex);
  return {
    entityId,
    reason: 'MASC failure',
    fixedTargetNumber: getMASCOrSuperchargerFailureTargetNumber(
      previousTurnsUsed,
      optionalRules,
    ),
    reasonCode: PSRTrigger.MASCFailure,
    additionalModifier: 0,
    triggerSource: movementStepSource ?? PSRTrigger.MASCFailure,
  };
}

/**
 * Create a pending PSR for supercharger failure.
 */
export function createSuperchargerFailurePSR(
  entityId: string,
  previousTurnsUsed?: number,
  optionalRules?: readonly string[],
  stepIndex?: number,
): IPendingPSR {
  const movementStepSource = movementStepTriggerSource(stepIndex);
  return {
    entityId,
    reason: 'Supercharger failure',
    fixedTargetNumber: getMASCOrSuperchargerFailureTargetNumber(
      previousTurnsUsed,
      optionalRules,
    ),
    reasonCode: PSRTrigger.SuperchargerFailure,
    additionalModifier: 0,
    triggerSource: movementStepSource ?? PSRTrigger.SuperchargerFailure,
  };
}
