/**
 * PSR modifier calculation.
 */

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { IComponentDamageState, IPendingPSR } from '@/types/gameplay';

import {
  type RepresentedGyroType,
  gyroPsrModifierForType,
  gyroPsrModifierName,
} from '../gyroRules';
import { calculatePilotingQuirkPSRModifier } from '../quirkModifiers';
import {
  calculateNeuralInterfacePilotingModifier,
  getAnimalMimicryPSRModifier,
  getFrogmanWaterPSRModifier,
  getManeuveringAceFlankingTurningModifier,
  getManeuveringAceOutOfControlModifier,
  getManeuveringAceSkidModifier,
  getMountaineerRubblePSRModifier,
  getSwampBeastBogDownPSRModifier,
} from '../spaModifiers';
import { IPSRModifier, PSRTrigger } from './types';

export interface IPSRResolutionOptions {
  readonly gyroType?: RepresentedGyroType;
  readonly optionalRules?: readonly string[];
  readonly unitQuirks?: readonly string[];
  readonly pilotAbilities?: readonly string[];
  readonly neuralInterfaceActive?: boolean;
  readonly isQuadMek?: boolean;
  readonly unitType?: string;
  readonly pilotingSkill?: number;
}

export interface IPSRModifierCalculationInput extends IPSRResolutionOptions {
  readonly psr: IPendingPSR;
  readonly componentDamage: IComponentDamageState;
  readonly pilotWounds: number;
}

export interface INormalizedPSRResolutionOptions {
  readonly gyroType?: RepresentedGyroType;
  readonly optionalRules?: readonly string[];
  readonly unitQuirks: readonly string[];
  readonly pilotAbilities: readonly string[];
  readonly neuralInterfaceActive?: boolean;
  readonly isQuadMek: boolean;
  readonly unitType?: string;
  readonly pilotingSkill?: number;
}

type LegacyCalculatePSRModifiersArgs = readonly [
  psr: IPendingPSR,
  componentDamage: IComponentDamageState,
  pilotWounds: number,
  unitQuirks?: readonly string[] | IPSRResolutionOptions,
  pilotAbilities?: readonly string[],
  isQuadMek?: boolean,
  unitType?: string,
  pilotingSkill?: number,
];

type CalculatePSRModifiersArgs =
  | readonly [input: IPSRModifierCalculationInput]
  | LegacyCalculatePSRModifiersArgs;

interface INormalizedPSRModifierInput extends INormalizedPSRResolutionOptions {
  readonly psr: IPendingPSR;
  readonly componentDamage: IComponentDamageState;
  readonly pilotWounds: number;
}

const TERRAIN_PSR_TRIGGERS = new Set<PSRTrigger>([
  PSRTrigger.EnteringRubble,
  PSRTrigger.RunningRoughTerrain,
  PSRTrigger.MovingOnIce,
  PSRTrigger.EnteringWater,
  PSRTrigger.ExitingWater,
  PSRTrigger.Skidding,
  PSRTrigger.SwampBogDown,
  PSRTrigger.BuildingCollapse,
]);

function getPSRTrigger(psr: IPendingPSR): PSRTrigger {
  return (psr.reasonCode ?? psr.triggerSource) as PSRTrigger;
}

function isTerrainPSR(psr: IPendingPSR): boolean {
  return TERRAIN_PSR_TRIGGERS.has(getPSRTrigger(psr));
}

function isReadonlyStringArray(
  value: readonly string[] | IPSRResolutionOptions | undefined,
): value is readonly string[] {
  return Array.isArray(value);
}

export function normalizeResolutionOptions(
  unitQuirksOrOptions: readonly string[] | IPSRResolutionOptions | undefined,
  fallbackPilotAbilities: readonly string[],
  fallbackIsQuadMek: boolean,
  fallbackUnitType: string | undefined,
  fallbackPilotingSkill: number | undefined,
): INormalizedPSRResolutionOptions {
  if (isReadonlyStringArray(unitQuirksOrOptions)) {
    return {
      unitQuirks: unitQuirksOrOptions,
      pilotAbilities: fallbackPilotAbilities,
      isQuadMek: fallbackIsQuadMek,
      unitType: fallbackUnitType,
      pilotingSkill: fallbackPilotingSkill,
    };
  }

  const options = unitQuirksOrOptions ?? {};

  return {
    gyroType: options.gyroType,
    optionalRules: options.optionalRules,
    unitQuirks: options.unitQuirks ?? [],
    pilotAbilities: options.pilotAbilities ?? fallbackPilotAbilities,
    neuralInterfaceActive: options.neuralInterfaceActive,
    isQuadMek: options.isQuadMek ?? fallbackIsQuadMek,
    unitType: options.unitType ?? fallbackUnitType,
    pilotingSkill: options.pilotingSkill ?? fallbackPilotingSkill,
  };
}

function isModifierCalculationInput(
  value: CalculatePSRModifiersArgs[0],
): value is IPSRModifierCalculationInput {
  return typeof value === 'object' && 'psr' in value;
}

function normalizeModifierInput(
  args: CalculatePSRModifiersArgs,
): INormalizedPSRModifierInput {
  if (isModifierCalculationInput(args[0])) {
    const input = args[0];

    return {
      psr: input.psr,
      componentDamage: input.componentDamage,
      pilotWounds: input.pilotWounds,
      gyroType: input.gyroType,
      optionalRules: input.optionalRules,
      unitQuirks: input.unitQuirks ?? [],
      pilotAbilities: input.pilotAbilities ?? [],
      neuralInterfaceActive: input.neuralInterfaceActive,
      isQuadMek: input.isQuadMek ?? false,
      unitType: input.unitType,
      pilotingSkill: input.pilotingSkill,
    };
  }

  const legacyArgs = args as LegacyCalculatePSRModifiersArgs;
  const [
    psr,
    componentDamage,
    pilotWounds,
    unitQuirksOrOptions = [],
    pilotAbilities = [],
    isQuadMek = false,
    unitType,
    pilotingSkill,
  ] = legacyArgs;
  const options = normalizeResolutionOptions(
    unitQuirksOrOptions,
    pilotAbilities,
    isQuadMek,
    unitType,
    pilotingSkill,
  );

  return {
    psr,
    componentDamage,
    pilotWounds,
    ...options,
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
  ...args: CalculatePSRModifiersArgs
): readonly IPSRModifier[] {
  const input = normalizeModifierInput(args);
  const { psr } = input;
  const modifiers: IPSRModifier[] = [];

  if (psr.fixedTargetNumber !== undefined) {
    appendAdditionalPSRModifier(psr, modifiers);
    return modifiers;
  }

  appendDamageStateModifiers(input, modifiers);
  appendAdditionalPSRModifier(psr, modifiers);
  appendQuirkModifier(input, modifiers);
  appendTriggerSpaModifiers(input, modifiers);
  appendUniversalSpaModifiers(input, modifiers);

  return modifiers;
}

function appendModifier(
  modifiers: IPSRModifier[],
  name: string,
  value: number,
  source: string,
): void {
  if (value !== 0) {
    modifiers.push({
      name,
      value,
      source,
    });
  }
}

function appendAdditionalPSRModifier(
  psr: IPendingPSR,
  modifiers: IPSRModifier[],
): void {
  appendModifier(
    modifiers,
    `${psr.reason} modifier`,
    psr.additionalModifier,
    psr.triggerSource,
  );
}

function appendDamageStateModifiers(
  input: INormalizedPSRModifierInput,
  modifiers: IPSRModifier[],
): void {
  const useLandingSpecificDamage = usesAirMekLandingSpecificDamageModifiers(
    input.psr,
  );

  if (!useLandingSpecificDamage) {
    appendGyroModifier(input, modifiers);
    appendActuatorModifiers(input, modifiers);
  }

  appendModifier(modifiers, 'Pilot wounds', input.pilotWounds, 'pilot');
}

function appendGyroModifier(
  input: INormalizedPSRModifierInput,
  modifiers: IPSRModifier[],
): void {
  appendModifier(
    modifiers,
    gyroPsrModifierName(input.gyroType),
    gyroPsrModifierForType(input.componentDamage, input.gyroType, {
      optionalRules: input.optionalRules,
    }),
    'gyro',
  );
}

const ACTUATOR_PSR_MODIFIERS = [
  {
    actuator: ActuatorType.HIP,
    name: 'Hip actuator destroyed',
    value: 2,
  },
  {
    actuator: ActuatorType.UPPER_LEG,
    name: 'Upper leg actuator destroyed',
    value: 1,
  },
  {
    actuator: ActuatorType.LOWER_LEG,
    name: 'Lower leg actuator destroyed',
    value: 1,
  },
  {
    actuator: ActuatorType.FOOT,
    name: 'Foot actuator destroyed',
    value: 1,
  },
] as const;

function appendActuatorModifiers(
  input: INormalizedPSRModifierInput,
  modifiers: IPSRModifier[],
): void {
  for (const { actuator, name, value } of ACTUATOR_PSR_MODIFIERS) {
    if (input.componentDamage.actuators[actuator]) {
      appendModifier(modifiers, name, value, 'actuator');
    }
  }
}

function appendQuirkModifier(
  input: INormalizedPSRModifierInput,
  modifiers: IPSRModifier[],
): void {
  const quirkModifier = calculatePilotingQuirkPSRModifier(
    input.unitQuirks,
    isTerrainPSR(input.psr),
    getPSRTrigger(input.psr),
    input.pilotingSkill,
    input.pilotAbilities,
  );

  appendModifier(modifiers, 'Piloting quirks', quirkModifier, 'quirk');
}

interface ITriggerSpaModifierRule {
  readonly trigger: PSRTrigger;
  readonly name: string;
  readonly calculate: (input: INormalizedPSRModifierInput) => number;
}

const TRIGGER_SPA_MODIFIER_RULES: readonly ITriggerSpaModifierRule[] = [
  {
    trigger: PSRTrigger.Skidding,
    name: 'Maneuvering Ace',
    calculate: (input) => getManeuveringAceSkidModifier(input.pilotAbilities),
  },
  {
    trigger: PSRTrigger.OutOfControl,
    name: 'Maneuvering Ace',
    calculate: (input) =>
      getManeuveringAceOutOfControlModifier(input.pilotAbilities),
  },
  {
    trigger: PSRTrigger.FlankingAndTurning,
    name: 'Maneuvering Ace',
    calculate: (input) =>
      getManeuveringAceFlankingTurningModifier(input.pilotAbilities),
  },
  {
    trigger: PSRTrigger.EnteringWater,
    name: 'Frogman',
    calculate: (input) =>
      getFrogmanWaterPSRModifier(
        input.pilotAbilities,
        input.psr.terrainLevel,
        input.unitType,
      ),
  },
  {
    trigger: PSRTrigger.EnteringRubble,
    name: 'Mountaineer',
    calculate: (input) => getMountaineerRubblePSRModifier(input.pilotAbilities),
  },
  {
    trigger: PSRTrigger.SwampBogDown,
    name: 'Swamp Beast',
    calculate: (input) => getSwampBeastBogDownPSRModifier(input.pilotAbilities),
  },
] as const;

function appendTriggerSpaModifiers(
  input: INormalizedPSRModifierInput,
  modifiers: IPSRModifier[],
): void {
  const trigger = getPSRTrigger(input.psr);

  for (const rule of TRIGGER_SPA_MODIFIER_RULES) {
    if (rule.trigger === trigger) {
      appendModifier(modifiers, rule.name, rule.calculate(input), 'spa');
    }
  }
}

function appendUniversalSpaModifiers(
  input: INormalizedPSRModifierInput,
  modifiers: IPSRModifier[],
): void {
  const animalMimicryModifier = getAnimalMimicryPSRModifier(
    input.pilotAbilities,
    input.isQuadMek,
  );
  appendModifier(modifiers, 'Animal Mimicry', animalMimicryModifier, 'spa');

  const neuralInterfacePilotingModifier =
    calculateNeuralInterfacePilotingModifier(
      input.pilotAbilities,
      input.unitType,
      input.neuralInterfaceActive ?? true,
    );
  if (neuralInterfacePilotingModifier) {
    appendModifier(
      modifiers,
      neuralInterfacePilotingModifier.name,
      neuralInterfacePilotingModifier.value,
      'spa',
    );
  }
}

function usesAirMekLandingSpecificDamageModifiers(psr: IPendingPSR): boolean {
  return (
    psr.reasonCode === PSRTrigger.AirMekLanding ||
    psr.triggerSource === PSRTrigger.AirMekLanding
  );
}
