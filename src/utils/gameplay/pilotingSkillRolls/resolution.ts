/**
 * PSR Resolution Core
 * Implements PSR resolution logic, modifier calculation, and batch processing.
 */

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { IComponentDamageState, IPendingPSR } from '@/types/gameplay';

import { defaultD6Roller } from '../diceTypes';
import { D6Roller, roll2d6 } from '../hitLocation';
import { IPSRResult, IPSRBatchResult, IPSRModifier, PSRTrigger } from './types';

/**
 * Resolve a single PSR.
 * Formula: 2d6 >= (pilotingSkill + allModifiers) = success
 *
 * @param pilotingSkill - Base piloting skill (typically 4-6)
 * @param psr - The pending PSR to resolve
 * @param componentDamage - Current component damage state for modifier calculation
 * @param pilotWounds - Current pilot wound count
 * @param diceRoller - Injectable dice roller for deterministic testing
 * @returns PSR result with roll details and pass/fail
 */
export function resolvePSR(
  pilotingSkill: number,
  psr: IPendingPSR,
  componentDamage: IComponentDamageState,
  pilotWounds: number,
  diceRoller: D6Roller = defaultD6Roller,
): IPSRResult {
  const modifiers = calculatePSRModifiers(psr, componentDamage, pilotWounds);

  const totalModifier = modifiers.reduce((sum, m) => sum + m.value, 0);

  // Special case: Shutdown PSR has fixed TN 3 (piloting skill not used)
  const isShutdownPSR = psr.triggerSource === PSRTrigger.Shutdown;
  const targetNumber = isShutdownPSR ? 3 : pilotingSkill + totalModifier;

  const roll = roll2d6(diceRoller);

  return {
    psr,
    targetNumber,
    roll: roll.total,
    dice: roll.dice,
    passed: roll.total >= targetNumber,
    modifiers,
  };
}

/**
 * Resolve all pending PSRs for a unit.
 * Implements the first-failure-clears-remaining rule:
 * - PSRs are resolved in order
 * - First failure causes fall and clears all remaining PSRs
 *
 * @param pilotingSkill - Base piloting skill
 * @param pendingPSRs - All pending PSRs for this unit
 * @param componentDamage - Current component damage
 * @param pilotWounds - Current pilot wounds
 * @param diceRoller - Injectable dice roller
 * @returns Batch result with all rolled PSRs and any cleared ones
 */
export function resolveAllPSRs(
  pilotingSkill: number,
  pendingPSRs: readonly IPendingPSR[],
  componentDamage: IComponentDamageState,
  pilotWounds: number,
  diceRoller: D6Roller = defaultD6Roller,
): IPSRBatchResult {
  if (pendingPSRs.length === 0) {
    return {
      results: [],
      unitFell: false,
      clearedPSRs: [],
    };
  }

  const results: IPSRResult[] = [];
  const clearedPSRs: IPendingPSR[] = [];

  for (let i = 0; i < pendingPSRs.length; i++) {
    const psr = pendingPSRs[i];
    const result = resolvePSR(
      pilotingSkill,
      psr,
      componentDamage,
      pilotWounds,
      diceRoller,
    );
    results.push(result);

    if (!result.passed) {
      // First failure: clear all remaining PSRs
      for (let j = i + 1; j < pendingPSRs.length; j++) {
        clearedPSRs.push(pendingPSRs[j]);
      }
      return {
        results,
        unitFell: true,
        clearedPSRs,
      };
    }
  }

  return {
    results,
    unitFell: false,
    clearedPSRs: [],
  };
}

/**
 * Calculate all applicable modifiers for a PSR.
 * Stacking rules:
 * - Gyro hits: +3 per hit
 * - Pilot wounds: +1 per wound
 * - Actuator damage: varies by type
 * - PSR-specific additionalModifier from the trigger
 */
export function calculatePSRModifiers(
  psr: IPendingPSR,
  componentDamage: IComponentDamageState,
  pilotWounds: number,
): readonly IPSRModifier[] {
  const modifiers: IPSRModifier[] = [];

  // Gyro damage: +3 per hit
  if (componentDamage.gyroHits > 0) {
    modifiers.push({
      name: 'Gyro damage',
      value: componentDamage.gyroHits * 3,
      source: 'gyro',
    });
  }

  // Pilot wounds: +1 per wound
  if (pilotWounds > 0) {
    modifiers.push({
      name: 'Pilot wounds',
      value: pilotWounds,
      source: 'pilot',
    });
  }

  // Leg actuator damage modifiers
  const actuators = componentDamage.actuators;
  if (actuators[ActuatorType.HIP]) {
    modifiers.push({
      name: 'Hip actuator destroyed',
      value: 2,
      source: 'actuator',
    });
  }
  if (actuators[ActuatorType.UPPER_LEG]) {
    modifiers.push({
      name: 'Upper leg actuator destroyed',
      value: 1,
      source: 'actuator',
    });
  }
  if (actuators[ActuatorType.LOWER_LEG]) {
    modifiers.push({
      name: 'Lower leg actuator destroyed',
      value: 1,
      source: 'actuator',
    });
  }
  if (actuators[ActuatorType.FOOT]) {
    modifiers.push({
      name: 'Foot actuator destroyed',
      value: 1,
      source: 'actuator',
    });
  }

  // PSR-specific additional modifier (e.g., DFA miss +4)
  if (psr.additionalModifier !== 0) {
    modifiers.push({
      name: `${psr.reason} modifier`,
      value: psr.additionalModifier,
      source: psr.triggerSource,
    });
  }

  return modifiers;
}
