/**
 * PSR Resolution Core
 * Implements PSR resolution logic, modifier calculation, and batch processing.
 */

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { IComponentDamageState, IPendingPSR } from '@/types/gameplay';

import type { RepresentedGyroType } from '../gyroRules';

import { defaultD6Roller } from '../diceTypes';
import { D6Roller, roll2d6 } from '../hitLocation';
import { calculatePilotingQuirkPSRModifier } from '../quirkModifiers';
import {
  getAnimalMimicryPSRModifier,
  getFrogmanWaterPSRModifier,
  getManeuveringAceSkidModifier,
  getMountaineerRubblePSRModifier,
  getSwampBeastBogDownPSRModifier,
} from '../spaModifiers';
import { IPSRResult, IPSRBatchResult, IPSRModifier, PSRTrigger } from './types';

export interface IPSRResolutionOptions {
  readonly gyroType?: RepresentedGyroType;
  readonly optionalRules?: readonly string[];
}

function isTerrainPSR(psr: IPendingPSR): boolean {
  switch (psr.reasonCode ?? psr.triggerSource) {
    case PSRTrigger.EnteringRubble:
    case PSRTrigger.RunningRoughTerrain:
    case PSRTrigger.MovingOnIce:
    case PSRTrigger.EnteringWater:
    case PSRTrigger.ExitingWater:
    case PSRTrigger.Skidding:
    case PSRTrigger.SwampBogDown:
    case PSRTrigger.BuildingCollapse:
      return true;
    default:
      return false;
  }
}

function isStuckFailurePSR(psr: IPendingPSR): boolean {
  return (psr.reasonCode ?? psr.triggerSource) === PSRTrigger.SwampBogDown;
}

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
  unitQuirks: readonly string[] | IPSRResolutionOptions = [],
  pilotAbilities: readonly string[] = [],
  isQuadMek = false,
  unitType?: string,
): IPSRResult {
  const usesFixedTargetNumber = psr.fixedTargetNumber !== undefined;
  const modifiers = calculatePSRModifiers(
    psr,
    componentDamage,
    pilotWounds,
    unitQuirks,
    pilotAbilities,
    isQuadMek,
    unitType,
    pilotingSkill,
  );

  const totalModifier = modifiers.reduce((sum, m) => sum + m.value, 0);

  // Special case: Shutdown PSR has fixed TN 3 (piloting skill not used)
  const isShutdownPSR = psr.triggerSource === PSRTrigger.Shutdown;
  const targetNumber = usesFixedTargetNumber
    ? psr.fixedTargetNumber + totalModifier
    : isShutdownPSR
      ? 3
      : pilotingSkill + totalModifier;

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
  unitQuirks: readonly string[] | IPSRResolutionOptions = [],
  pilotAbilities: readonly string[] = [],
  isQuadMek = false,
  unitType?: string,
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
      unitQuirks,
      pilotAbilities,
      isQuadMek,
      unitType,
    );
    results.push(result);

    if (!result.passed) {
      // First failure: clear all remaining PSRs
      for (let j = i + 1; j < pendingPSRs.length; j++) {
        clearedPSRs.push(pendingPSRs[j]);
      }
      if (isStuckFailurePSR(psr)) {
        return {
          results,
          unitFell: false,
          unitStuck: true,
          failedResult: result,
          clearedPSRs,
        };
      }
      return {
        results,
        unitFell: true,
        failedResult: result,
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
  unitQuirks: readonly string[] | IPSRResolutionOptions = [],
  pilotAbilities: readonly string[] = [],
  isQuadMek = false,
  unitType?: string,
  pilotingSkill?: number,
): readonly IPSRModifier[] {
  const normalizedUnitQuirks = Array.isArray(unitQuirks) ? unitQuirks : [];
  if (psr.fixedTargetNumber !== undefined) {
    return psr.additionalModifier !== 0
      ? [
          {
            name: `${psr.reason} modifier`,
            value: psr.additionalModifier,
            source: psr.triggerSource,
          },
        ]
      : [];
  }

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

  const quirkModifier = calculatePilotingQuirkPSRModifier(
    normalizedUnitQuirks,
    isTerrainPSR(psr),
    psr.reasonCode ?? psr.triggerSource,
    pilotingSkill,
    pilotAbilities,
  );
  if (quirkModifier !== 0) {
    modifiers.push({
      name: 'Piloting quirks',
      value: quirkModifier,
      source: 'quirk',
    });
  }

  if ((psr.reasonCode ?? psr.triggerSource) === PSRTrigger.Skidding) {
    const maneuveringAceModifier =
      getManeuveringAceSkidModifier(pilotAbilities);
    if (maneuveringAceModifier !== 0) {
      modifiers.push({
        name: 'Maneuvering Ace',
        value: maneuveringAceModifier,
        source: 'spa',
      });
    }
  }

  if ((psr.reasonCode ?? psr.triggerSource) === PSRTrigger.EnteringWater) {
    const frogmanModifier = getFrogmanWaterPSRModifier(
      pilotAbilities,
      psr.terrainLevel,
      unitType,
    );
    if (frogmanModifier !== 0) {
      modifiers.push({
        name: 'Frogman',
        value: frogmanModifier,
        source: 'spa',
      });
    }
  }

  if ((psr.reasonCode ?? psr.triggerSource) === PSRTrigger.EnteringRubble) {
    const mountaineerModifier = getMountaineerRubblePSRModifier(pilotAbilities);
    if (mountaineerModifier !== 0) {
      modifiers.push({
        name: 'Mountaineer',
        value: mountaineerModifier,
        source: 'spa',
      });
    }
  }

  if ((psr.reasonCode ?? psr.triggerSource) === PSRTrigger.SwampBogDown) {
    const swampBeastModifier = getSwampBeastBogDownPSRModifier(pilotAbilities);
    if (swampBeastModifier !== 0) {
      modifiers.push({
        name: 'Swamp Beast',
        value: swampBeastModifier,
        source: 'spa',
      });
    }
  }

  const animalMimicryModifier = getAnimalMimicryPSRModifier(
    pilotAbilities,
    isQuadMek,
  );
  if (animalMimicryModifier !== 0) {
    modifiers.push({
      name: 'Animal Mimicry',
      value: animalMimicryModifier,
      source: 'spa',
    });
  }

  return modifiers;
}
