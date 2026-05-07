/**
 * System Failure PSR Factories
 * Factory functions for PSRs triggered by system failures and movement with damage.
 */

import type { IPendingPSR } from '@/types/gameplay';

import { PSRTrigger } from './types';

/**
 * Create a pending PSR for running with a damaged hip (per hex moved).
 */
export function createRunningDamagedHipPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Running with damaged hip',
    reasonCode: PSRTrigger.RunningDamagedHip,
    additionalModifier: 0,
    triggerSource: PSRTrigger.RunningDamagedHip,
  };
}

/**
 * Create a pending PSR for running with a damaged gyro.
 */
export function createRunningDamagedGyroPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Running with damaged gyro',
    reasonCode: PSRTrigger.RunningDamagedGyro,
    additionalModifier: 0,
    triggerSource: PSRTrigger.RunningDamagedGyro,
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
