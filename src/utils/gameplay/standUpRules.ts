import type {
  IComponentDamageState,
  IMovementCapability,
  IUnitGameState,
  StandUpMode,
} from '@/types/gameplay';

import { UnitType } from '@/types/unit/BattleMechInterfaces';

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

export interface IStandUpPsrProjection {
  readonly reason: string;
  readonly targetNumber?: number;
  readonly modifier: number;
  readonly modifierDetails: readonly string[];
  readonly impossibleReason?: string;
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
}: {
  readonly unitState: IUnitGameState;
  readonly unitPiloting?: number;
  readonly unitType?: UnitType;
  readonly movementCapability?: IMovementCapability;
  readonly standUpMode?: StandUpMode;
}): IStandUpPsrProjection {
  const psr = createStandingUpPSR(unitState.id);
  const modifiers = calculatePSRModifiers(
    psr,
    unitState.componentDamage ?? DEFAULT_COMPONENT_DAMAGE,
    unitState.pilotWounds,
  );
  const representedStandUpModifiers = tacOpsAttemptingStandArmModifiers(
    unitState,
    movementCapability,
  );
  const allModifiers = [...modifiers, ...representedStandUpModifiers];
  const carefulStandModifier = shouldApplyCarefulStandModifier(
    movementCapability,
    standUpMode,
  )
    ? -2
    : 0;
  const modifier =
    allModifiers.reduce((sum, entry) => sum + entry.value, 0) +
    carefulStandModifier;
  const impossibleReason = destroyedLegAndArmsStandBlock(unitState, unitType);

  return {
    reason: psr.reason,
    modifier,
    modifierDetails: [
      ...allModifiers.map(
        (entry) => `${entry.name} ${entry.value >= 0 ? '+' : ''}${entry.value}`,
      ),
      ...(carefulStandModifier === 0 ? [] : ['Careful stand -2']),
    ],
    impossibleReason,
    ...(unitPiloting === undefined
      ? {}
      : {
          targetNumber: impossibleReason ? Infinity : unitPiloting + modifier,
        }),
  };
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
  return [
    ...(destroyed.has('right_arm')
      ? [{ name: 'Right arm destroyed', value: 2 }]
      : []),
    ...(destroyed.has('left_arm')
      ? [{ name: 'Left arm destroyed', value: 2 }]
      : []),
  ];
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
