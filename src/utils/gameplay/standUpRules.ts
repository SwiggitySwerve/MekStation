import type {
  IComponentDamageState,
  IMovementCapability,
  MovementStandUpArmActuator,
  IUnitGameState,
  StandUpMode,
} from '@/types/gameplay';

import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { isGyroDestroyedForType } from './gyroRules';
import {
  calculatePSRModifiers,
  createStandingUpPSR,
} from './pilotingSkillRolls';

const DEFAULT_COMPONENT_DAMAGE: IComponentDamageState = {
  engineHits: 0,
  gyroHits: 0,
  sensorHits: 0,
  lifeSupport: 0,
  cockpitHit: false,
  actuators: {},
  weaponsDestroyed: [],
  heatSinksDestroyed: 0,
  jumpJetsDestroyed: 0,
};

const MEK_STAND_UNIT_TYPES = new Set<UnitType | undefined>([
  undefined,
  UnitType.BATTLEMECH,
  UnitType.OMNIMECH,
  UnitType.INDUSTRIALMECH,
]);

const PLAYTEST_2_OPTIONAL_RULE_KEY = 'playtest2';

export interface IStandUpRuleOptions {
  readonly optionalRules?: readonly string[];
}

export interface IStandUpPsrProjection {
  readonly reason: string;
  readonly required: boolean;
  readonly targetNumber?: number;
  readonly modifier: number;
  readonly modifierDetails: readonly string[];
  readonly impossibleReason?: string;
  readonly automaticSuccessReason?: string;
}

interface IStandUpPsrModifier {
  readonly name: string;
  readonly value: number;
}

export function projectStandUpPsr({
  unitState,
  unitPiloting,
  unitType,
  movementCapability,
  standUpMode = 'normal',
  optionalRules = [],
}: {
  readonly unitState: IUnitGameState;
  readonly unitPiloting?: number;
  readonly unitType?: UnitType;
  readonly movementCapability?: IMovementCapability;
  readonly standUpMode?: StandUpMode;
  readonly optionalRules?: readonly string[];
}): IStandUpPsrProjection {
  const psr = createStandingUpPSR(unitState.id);
  const modifiers = calculatePSRModifiers(
    psr,
    unitState.componentDamage ?? DEFAULT_COMPONENT_DAMAGE,
    unitState.pilotWounds,
    {
      gyroType: unitState.gyroType,
      optionalRules,
      unitQuirks: unitState.unitQuirks,
      pilotAbilities: unitState.abilities,
      neuralInterfaceActive: unitState.neuralInterfaceActive,
      isQuadMek: unitState.isQuad,
      unitType: unitState.unitType ?? unitType,
      pilotingSkill: unitPiloting,
    },
  );
  const playtest2Modifiers = playtest2TryingToStandModifiers(optionalRules);
  const representedStandUpModifiers = representedStandUpCapabilityModifiers(
    unitState,
    movementCapability,
  );
  const allModifiers = [
    ...modifiers,
    ...playtest2Modifiers,
    ...representedStandUpModifiers,
  ];
  const carefulStandModifier = shouldApplyCarefulStandModifier(
    movementCapability,
    standUpMode,
  )
    ? -2
    : 0;
  const modifier =
    allModifiers.reduce((sum, entry) => sum + entry.value, 0) +
    carefulStandModifier;
  const impossibleReason = standUpImpossibleReason(
    unitState,
    unitType,
    optionalRules,
  );
  const automaticSuccessReason = standUpAutomaticSuccessReason(
    unitState,
    movementCapability,
    impossibleReason,
    optionalRules,
  );
  const required = automaticSuccessReason === undefined;

  return {
    reason: automaticSuccessReason ?? psr.reason,
    required,
    modifier: required ? modifier : 0,
    modifierDetails: required
      ? [
          ...allModifiers.map(
            (entry) =>
              `${entry.name} ${entry.value >= 0 ? '+' : ''}${entry.value}`,
          ),
          ...(carefulStandModifier === 0 ? [] : ['Careful stand -2']),
        ]
      : [],
    impossibleReason,
    automaticSuccessReason,
    ...(!required || unitPiloting === undefined
      ? {}
      : {
          targetNumber: impossibleReason ? Infinity : unitPiloting + modifier,
        }),
  };
}

function playtest2TryingToStandModifiers(
  optionalRules: readonly string[],
): readonly IStandUpPsrModifier[] {
  return hasOptionalRule(optionalRules, PLAYTEST_2_OPTIONAL_RULE_KEY)
    ? [{ name: 'Trying to stand', value: -1 }]
    : [];
}

function hasOptionalRule(
  optionalRules: readonly string[],
  expectedKey: string,
): boolean {
  return optionalRules.some(
    (rule) => normalizedOptionalRuleKey(rule) === expectedKey,
  );
}

function normalizedOptionalRuleKey(rule: string): string {
  return rule.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function shouldApplyCarefulStandModifier(
  movementCapability: IMovementCapability | undefined,
  standUpMode: StandUpMode,
): boolean {
  return standUpMode === 'careful' && (movementCapability?.walkMP ?? 0) > 2;
}

function tacOpsAttemptingStandArmModifiers(
  unitState: IUnitGameState,
  movementCapability?: IMovementCapability,
): readonly IStandUpPsrModifier[] {
  if (movementCapability?.standUpCapability?.tacOpsAttemptingStand !== true) {
    return [];
  }

  const destroyed = new Set(unitState.destroyedLocations);
  const armActuators = movementCapability.standUpCapability.armActuators;
  return [
    ...(destroyed.has('right_arm')
      ? [{ name: 'Right arm destroyed', value: 2 }]
      : tacOpsArmActuatorModifier('Right arm', armActuators?.right)),
    ...(destroyed.has('left_arm')
      ? [{ name: 'Left arm destroyed', value: 2 }]
      : tacOpsArmActuatorModifier('Left arm', armActuators?.left)),
  ];
}

function tacOpsArmActuatorModifier(
  armName: string,
  actuator?: MovementStandUpArmActuator,
): readonly IStandUpPsrModifier[] {
  if (actuator === undefined) return [];

  return [
    {
      name: `${armName} ${formatStandUpArmActuator(actuator)} actuator missing/destroyed`,
      value: 1,
    },
  ];
}

function formatStandUpArmActuator(
  actuator: MovementStandUpArmActuator,
): string {
  switch (actuator) {
    case 'hand':
      return 'hand';
    case 'lower_arm':
      return 'lower';
    case 'upper_arm':
      return 'upper';
    case 'shoulder':
      return 'shoulder';
  }
}

function representedStandUpCapabilityModifiers(
  unitState: IUnitGameState,
  movementCapability?: IMovementCapability,
): readonly IStandUpPsrModifier[] {
  if (movementCapability?.standUpCapability?.noMinimalArmsQuirk === true) {
    return [{ name: 'No/minimal arms', value: 2 }];
  }
  return tacOpsAttemptingStandArmModifiers(unitState, movementCapability);
}

export function destroyedLegAndArmsStandBlock(
  unitState: IUnitGameState,
  unitType?: UnitType,
): string | undefined {
  if (!MEK_STAND_UNIT_TYPES.has(unitType)) return undefined;

  const destroyed = new Set(unitState.destroyedLocations);
  const hasDestroyedLeg =
    destroyed.has('left_leg') || destroyed.has('right_leg');
  const bothArmsDestroyed =
    destroyed.has('left_arm') && destroyed.has('right_arm');

  return hasDestroyedLeg && bothArmsDestroyed
    ? 'Cannot stand with a destroyed leg and both arms destroyed'
    : undefined;
}

function standUpImpossibleReason(
  unitState: IUnitGameState,
  unitType?: UnitType,
  optionalRules: readonly string[] = [],
): string | undefined {
  return (
    destroyedGyroStandBlock(unitState, unitType, optionalRules) ??
    destroyedLegAndArmsStandBlock(unitState, unitType)
  );
}

function destroyedGyroStandBlock(
  unitState: IUnitGameState,
  unitType?: UnitType,
  optionalRules: readonly string[] = [],
): string | undefined {
  if (!MEK_STAND_UNIT_TYPES.has(unitType)) return undefined;
  return isGyroDestroyedForType(
    unitState.componentDamage ?? DEFAULT_COMPONENT_DAMAGE,
    unitState.gyroType,
    { optionalRules },
  )
    ? 'Cannot stand with a destroyed gyro'
    : undefined;
}

function standUpAutomaticSuccessReason(
  unitState: IUnitGameState,
  movementCapability: IMovementCapability | undefined,
  impossibleReason: string | undefined,
  optionalRules: readonly string[] = [],
): string | undefined {
  if (impossibleReason !== undefined) return undefined;
  if (movementCapability?.standUpCapability?.standUpLegProfile !== 'quad') {
    return undefined;
  }
  if (
    isGyroDestroyedForType(
      unitState.componentDamage ?? DEFAULT_COMPONENT_DAMAGE,
      unitState.gyroType,
      { optionalRules },
    )
  ) {
    return undefined;
  }
  return hasDestroyedQuadLeg(unitState)
    ? undefined
    : 'Quad Mek has all four legs and does not need a stand-up PSR';
}

function hasDestroyedQuadLeg(unitState: IUnitGameState): boolean {
  const destroyed = new Set(
    unitState.destroyedLocations.map(normalizedLocationKey),
  );
  return QUAD_STAND_LEG_LOCATION_KEYS.some((location) =>
    destroyed.has(location),
  );
}

function normalizedLocationKey(location: string): string {
  return location.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

const QUAD_STAND_LEG_LOCATION_KEYS = [
  'leftarm',
  'rightarm',
  'leftleg',
  'rightleg',
  'frontleftleg',
  'frontrightleg',
  'rearleftleg',
  'rearrightleg',
  'fll',
  'frl',
  'rll',
  'rrl',
] as const;
