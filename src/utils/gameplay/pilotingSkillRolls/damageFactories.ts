/**
 * Damage-Related PSR Factories
 * Factory functions for PSRs triggered by damage events.
 */

import type { IPendingPSR } from '@/types/gameplay';

import { PSRTrigger } from './types';

/**
 * Create a pending PSR for 20+ damage in a single phase.
 */
export function createDamagePSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: '20+ damage this phase',
    reasonCode: PSRTrigger.PhaseDamage20Plus,
    additionalModifier: 0,
    triggerSource: PSRTrigger.PhaseDamage20Plus,
  };
}

/**
 * Create a pending PSR for leg damage (armor breached, structure took damage).
 */
export function createLegDamagePSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Leg damage (internal structure exposed)',
    reasonCode: PSRTrigger.LegDamage,
    additionalModifier: 0,
    triggerSource: PSRTrigger.LegDamage,
  };
}

/**
 * Create a pending PSR for hip actuator critical hit.
 */
export function createHipActuatorPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Hip actuator destroyed',
    reasonCode: PSRTrigger.HipActuatorDestroyed,
    additionalModifier: 0,
    triggerSource: PSRTrigger.HipActuatorDestroyed,
  };
}

/**
 * Create a pending PSR for gyro critical hit.
 */
export function createGyroPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Gyro hit',
    reasonCode: PSRTrigger.GyroHit,
    additionalModifier: 0,
    triggerSource: PSRTrigger.GyroHit,
  };
}

/**
 * Create a pending PSR for an engine critical hit.
 *
 * This is a MekStation catalog behavior, not a MegaMek parity claim:
 * MegaMek's engine-critical branch handles hit counters, heat/destruction,
 * and explosion checks without queuing a normal fall PSR. The factory
 * preserves MekStation's current EngineHit trigger while source-truth audits
 * keep that deviation visible.
 *
 * @spec openspec/specs/piloting-skill-rolls/spec.md
 *   Requirement: PSR Trigger Catalog
 */
export function createEngineHitPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Engine hit',
    reasonCode: PSRTrigger.EngineHit,
    additionalModifier: 0,
    triggerSource: PSRTrigger.EngineHit,
  };
}

/**
 * Create a pending PSR for upper leg actuator critical hit.
 */
export function createUpperLegActuatorPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Upper leg actuator hit',
    reasonCode: PSRTrigger.UpperLegActuatorHit,
    additionalModifier: 0,
    triggerSource: PSRTrigger.UpperLegActuatorHit,
  };
}

/**
 * Create a pending PSR for lower leg actuator critical hit.
 */
export function createLowerLegActuatorPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Lower leg actuator hit',
    reasonCode: PSRTrigger.LowerLegActuatorHit,
    additionalModifier: 0,
    triggerSource: PSRTrigger.LowerLegActuatorHit,
  };
}

/**
 * Create a pending PSR for foot actuator critical hit.
 */
export function createFootActuatorPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Foot actuator hit',
    reasonCode: PSRTrigger.FootActuatorHit,
    additionalModifier: 0,
    triggerSource: PSRTrigger.FootActuatorHit,
  };
}
