/**
 * PSR Resolution Core
 * Implements PSR resolution logic, modifier calculation, and batch processing.
 */

import { IComponentDamageState, IPendingPSR } from '@/types/gameplay';

import { defaultD6Roller } from '../diceTypes';
import { D6Roller, roll2d6 } from '../hitLocation';
import {
  calculatePSRModifiers,
  type IPSRModifierCalculationInput,
  type IPSRResolutionOptions,
  normalizeResolutionOptions,
} from './modifierResolution';
import { IPSRResult, IPSRBatchResult, PSRTrigger } from './types';

export interface IPSRResolveInput extends IPSRModifierCalculationInput {
  readonly pilotingSkill: number;
  readonly diceRoller?: D6Roller;
}

export interface IPSRBatchResolveInput extends IPSRResolutionOptions {
  readonly pilotingSkill: number;
  readonly pendingPSRs: readonly IPendingPSR[];
  readonly componentDamage: IComponentDamageState;
  readonly pilotWounds: number;
  readonly diceRoller?: D6Roller;
}

type LegacyResolvePSRArgs = readonly [
  pilotingSkill: number,
  psr: IPendingPSR,
  componentDamage: IComponentDamageState,
  pilotWounds: number,
  diceRoller?: D6Roller,
  unitQuirks?: readonly string[] | IPSRResolutionOptions,
  pilotAbilities?: readonly string[],
  isQuadMek?: boolean,
  unitType?: string,
];

type ResolvePSRArgs = readonly [input: IPSRResolveInput] | LegacyResolvePSRArgs;

type LegacyResolveAllPSRsArgs = readonly [
  pilotingSkill: number,
  pendingPSRs: readonly IPendingPSR[],
  componentDamage: IComponentDamageState,
  pilotWounds: number,
  diceRoller?: D6Roller,
  unitQuirks?: readonly string[] | IPSRResolutionOptions,
  pilotAbilities?: readonly string[],
  isQuadMek?: boolean,
  unitType?: string,
];

type ResolveAllPSRsArgs =
  | readonly [input: IPSRBatchResolveInput]
  | LegacyResolveAllPSRsArgs;

function isStuckFailurePSR(psr: IPendingPSR): boolean {
  return (psr.reasonCode ?? psr.triggerSource) === PSRTrigger.SwampBogDown;
}

function normalizeResolvePSRInput(args: ResolvePSRArgs): IPSRResolveInput {
  if (typeof args[0] === 'object') {
    return args[0];
  }

  const legacyArgs = args as LegacyResolvePSRArgs;
  const [
    pilotingSkill,
    psr,
    componentDamage,
    pilotWounds,
    diceRoller,
    unitQuirks,
    pilotAbilities,
    isQuadMek,
    unitType,
  ] = legacyArgs;
  const options = normalizeResolutionOptions(
    unitQuirks,
    pilotAbilities ?? [],
    isQuadMek ?? false,
    unitType,
    pilotingSkill,
  );

  return {
    pilotingSkill,
    psr,
    componentDamage,
    pilotWounds,
    diceRoller,
    ...options,
  };
}

function normalizeResolveAllPSRsInput(
  args: ResolveAllPSRsArgs,
): IPSRBatchResolveInput {
  if (typeof args[0] === 'object') {
    return args[0];
  }

  const legacyArgs = args as LegacyResolveAllPSRsArgs;
  const [
    pilotingSkill,
    pendingPSRs,
    componentDamage,
    pilotWounds,
    diceRoller,
    unitQuirks,
    pilotAbilities,
    isQuadMek,
    unitType,
  ] = legacyArgs;
  const options = normalizeResolutionOptions(
    unitQuirks,
    pilotAbilities ?? [],
    isQuadMek ?? false,
    unitType,
    pilotingSkill,
  );

  return {
    pilotingSkill,
    pendingPSRs,
    componentDamage,
    pilotWounds,
    diceRoller,
    ...options,
  };
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
export function resolvePSR(...args: ResolvePSRArgs): IPSRResult {
  const input = normalizeResolvePSRInput(args);
  const { pilotingSkill, psr, diceRoller = defaultD6Roller } = input;
  const usesFixedTargetNumber = psr.fixedTargetNumber !== undefined;
  const modifiers = calculatePSRModifiers({
    psr,
    componentDamage: input.componentDamage,
    pilotWounds: input.pilotWounds,
    gyroType: input.gyroType,
    optionalRules: input.optionalRules,
    unitQuirks: input.unitQuirks,
    pilotAbilities: input.pilotAbilities,
    neuralInterfaceActive: input.neuralInterfaceActive,
    isQuadMek: input.isQuadMek,
    unitType: input.unitType,
    pilotingSkill,
  });

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
export function resolveAllPSRs(...args: ResolveAllPSRsArgs): IPSRBatchResult {
  const input = normalizeResolveAllPSRsInput(args);
  const {
    pilotingSkill,
    pendingPSRs,
    componentDamage,
    pilotWounds,
    diceRoller = defaultD6Roller,
  } = input;

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
    const result = resolvePSR({
      pilotingSkill,
      psr,
      componentDamage,
      pilotWounds,
      diceRoller,
      gyroType: input.gyroType,
      optionalRules: input.optionalRules,
      unitQuirks: input.unitQuirks,
      pilotAbilities: input.pilotAbilities,
      neuralInterfaceActive: input.neuralInterfaceActive,
      isQuadMek: input.isQuadMek,
      unitType: input.unitType,
    });
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
