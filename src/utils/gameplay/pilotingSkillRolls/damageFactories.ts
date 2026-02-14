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
    additionalModifier: 0,
    triggerSource: PSRTrigger.GyroHit,
  };
}

/**
 * Create a pending PSR for upper leg actuator critical hit.
 */
export function createUpperLegActuatorPSR(entityId: string): IPendingPSR {
  return {
    entityId,
    reason: 'Upper leg actuator hit',
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
    additionalModifier: 0,
    triggerSource: PSRTrigger.FootActuatorHit,
  };
}
