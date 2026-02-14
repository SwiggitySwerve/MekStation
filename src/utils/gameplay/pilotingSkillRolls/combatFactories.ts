/**
 * Combat-Related PSR Factories
 * Factory functions for PSRs triggered by physical attacks.
 */

import type { IPendingPSR } from '@/types/gameplay';

import { PSRTrigger } from './types';

/**
 * Create a pending PSR for being kicked.
 */
export function createKickedPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Kicked',
    additionalModifier: 0,
    triggerSource: PSRTrigger.Kicked,
  };
}

/**
 * Create a pending PSR for being charged (target).
 */
export function createChargedPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Charged',
    additionalModifier: 0,
    triggerSource: PSRTrigger.Charged,
  };
}

/**
 * Create a pending PSR for being hit by DFA (target).
 */
export function createDFATargetPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Hit by DFA',
    additionalModifier: 0,
    triggerSource: PSRTrigger.DFATarget,
  };
}

/**
 * Create a pending PSR for being pushed.
 */
export function createPushedPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Pushed',
    additionalModifier: 0,
    triggerSource: PSRTrigger.Pushed,
  };
}

/**
 * Create a pending PSR for attacker kick miss.
 */
export function createKickMissPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Kick missed',
    additionalModifier: 0,
    triggerSource: PSRTrigger.KickMiss,
  };
}

/**
 * Create a pending PSR for attacker charge miss.
 */
export function createChargeMissPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Charge missed',
    additionalModifier: 0,
    triggerSource: PSRTrigger.ChargeMiss,
  };
}

/**
 * Create a pending PSR for attacker DFA miss (with +4 modifier).
 */
export function createDFAMissPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'DFA missed',
    additionalModifier: 4,
    triggerSource: PSRTrigger.DFAMiss,
  };
}
