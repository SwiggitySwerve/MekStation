import type { IHexCoordinate, IHexGrid } from '@/types/gameplay';
import type { IMovementCapability, IMovementRangeHex } from '@/types/gameplay';
import type { IUnitGameState, MovementTravelMode } from '@/types/gameplay';
import type { StandUpMode } from '@/types/gameplay';

import { getHeatMovementPenalty } from '@/constants/heat';
import { MovementType } from '@/types/gameplay';
import { hexDistance, hexEquals } from '@/utils/gameplay/hexMath';

import type { IPendingAltitudeControlMovementCost } from './altitudeControlAccounting';
import type { IMovementCostContext } from './calculations';
import type { IPendingConversionMovementCost } from './conversionAccounting';
import type {
  HullDownExitProjection,
  IMovementProjectionRuleOptions,
  ReservedProjectionApplier,
  StandUpProjection,
} from './reachableProjectionTypes';

import {
  pendingAltitudeControlMovementCost,
  withPendingAltitudeControlProjection,
} from './altitudeControlAccounting';
import {
  getMaxMP,
  getPavementRoadBonusMP,
  movementCostContextForCapability,
} from './calculations';
import {
  pendingConversionMovementCost,
  withPendingConversionProjection,
} from './conversionAccounting';
import { getHullDownExitCost } from './hullDownExit';
import { movementModeForPath, movementModeForRange } from './mode';
import { calculateMovementHeat } from './modifiers';
import { deriveGroundRangeHex } from './reachableGround';
import { deriveJumpRangeHex } from './reachableJump';
import { derivePrePathBlockedRangeHex } from './reachablePrePath';
import {
  deriveHullDownExitProjection,
  formatReservedMovementAfterLabel,
  formatReservedMovementCostReason,
  formatReservedMovementNoun,
} from './reachableProjectionHelpers';
import { resolveRuntimeMovementCapability } from './runtimeCapability';
import { deriveStandUpProjection } from './standUpProjection';
import { getStandingCost } from './validation';

type DeriveMovementRangeHexForDestinationArgs = readonly [
  unit: IUnitGameState,
  mpType: MovementType,
  grid: IHexGrid,
  capability: IMovementCapability,
  hex: IHexCoordinate,
  standUpMode?: StandUpMode,
  ruleOptions?: IMovementProjectionRuleOptions,
];

interface IDestinationProjectionContext {
  readonly unit: IUnitGameState;
  readonly mpType: MovementType;
  readonly grid: IHexGrid;
  readonly capability: IMovementCapability;
  readonly hex: IHexCoordinate;
  readonly origin: IHexCoordinate;
  readonly dist: number;
  readonly mp: number;
  readonly pathBudget: number;
  readonly maxPathCost: number;
  readonly heatGenerated: number;
  readonly movementMode: MovementTravelMode;
  readonly costContext: IMovementCostContext;
  readonly reservedCost: number;
  readonly reservedCostReason: string;
  readonly reservedAfterLabel: string;
  readonly reservedNoun: string;
  readonly pendingConversion: IPendingConversionMovementCost;
  readonly pendingAltitudeControl: IPendingAltitudeControlMovementCost;
  readonly standUpProjection: StandUpProjection;
  readonly hullDownExitProjection: HullDownExitProjection;
  readonly ruleOptions: IMovementProjectionRuleOptions;
  readonly withReservedProjection: ReservedProjectionApplier;
}

export function deriveMovementRangeHexForDestination(
  ...args: DeriveMovementRangeHexForDestinationArgs
): IMovementRangeHex | null {
  const [unit, mpType, grid, initialCapability, hex] = args;
  const standUpMode = args[5] ?? 'normal';
  const ruleOptions = args[6] ?? {};
  const capability =
    resolveRuntimeMovementCapability(unit, initialCapability) ??
    initialCapability;

  if (mpType === MovementType.Stationary) return null;
  if (hexEquals(hex, unit.position) && !unit.hullDown) return null;

  const context = buildDestinationProjectionContext({
    unit,
    mpType,
    grid,
    capability,
    hex,
    standUpMode,
    ruleOptions,
  });
  const prePathProjection = derivePrePathBlockedRangeHex(context);
  if (prePathProjection) return prePathProjection;

  if (mpType === MovementType.Jump) {
    return deriveJumpRangeHex(context);
  }

  return deriveGroundRangeHex(context);
}

function buildDestinationProjectionContext(input: {
  readonly unit: IUnitGameState;
  readonly mpType: MovementType;
  readonly grid: IHexGrid;
  readonly capability: IMovementCapability;
  readonly hex: IHexCoordinate;
  readonly standUpMode: StandUpMode;
  readonly ruleOptions: IMovementProjectionRuleOptions;
}): IDestinationProjectionContext {
  const origin = input.unit.position;
  const dist = hexDistance(origin, input.hex);
  const mp = getMaxMP(
    input.capability,
    input.mpType,
    getHeatMovementPenalty(input.unit.heat),
  );
  const heatGenerated = calculateMovementHeat(input.mpType, dist, {
    movementMode: input.capability.movementMode,
    movementHeatProfile: input.capability.movementHeatProfile,
    partialWingJumpBonus: input.capability.partialWingJumpBonus,
  });
  const movementMode = destinationMovementMode(input.mpType, input.capability);
  const costContext = movementCostContextForCapability(
    input.mpType,
    input.capability,
    {
      environmentalConditions: input.ruleOptions.environmentalConditions,
      optionalRules: input.ruleOptions.optionalRules,
      pilotAbilities: input.unit.abilities,
    },
  );
  const standingCost = input.unit.prone
    ? getStandingCost(input.capability, input.standUpMode)
    : getHullDownExitCost(input.unit, input.capability, input.mpType);
  const pendingConversion = pendingConversionMovementCost(input.unit);
  const pendingAltitudeControl = pendingAltitudeControlMovementCost(input.unit);
  const reservedCost =
    standingCost + pendingConversion.mpCost + pendingAltitudeControl.mpCost;
  const pathBudget = mp - reservedCost;
  const maxPathCost =
    input.mpType === MovementType.Jump
      ? pathBudget
      : pathBudget + getPavementRoadBonusMP(movementMode, costContext);
  const postureLabels = destinationPostureLabels(input.unit);

  return {
    ...input,
    origin,
    dist,
    mp,
    pathBudget,
    maxPathCost,
    heatGenerated,
    movementMode,
    costContext,
    reservedCost,
    reservedCostReason: formatReservedMovementCostReason(
      standingCost,
      pendingConversion,
      pendingAltitudeControl,
      postureLabels.action,
    ),
    reservedAfterLabel: formatReservedMovementAfterLabel(
      standingCost,
      pendingConversion,
      pendingAltitudeControl,
      postureLabels.afterLabel,
    ),
    reservedNoun: formatReservedMovementNoun(
      standingCost,
      pendingConversion,
      pendingAltitudeControl,
      postureLabels.noun,
    ),
    pendingConversion,
    pendingAltitudeControl,
    standUpProjection: deriveStandUpProjection(
      input.unit,
      input.capability,
      input.standUpMode,
      input.ruleOptions,
    ),
    hullDownExitProjection: deriveHullDownExitProjection(
      input.unit,
      input.capability,
      input.mpType,
    ),
    withReservedProjection: reservedProjectionApplier(
      pendingConversion,
      pendingAltitudeControl,
    ),
  };
}

function destinationMovementMode(
  mpType: MovementType,
  capability: IMovementCapability,
): MovementTravelMode {
  return mpType === MovementType.Jump
    ? movementModeForRange(mpType, capability)
    : movementModeForPath(mpType, capability);
}

function destinationPostureLabels(unit: IUnitGameState): {
  readonly action: string;
  readonly afterLabel: string;
  readonly noun: string;
} {
  return unit.hullDown && !unit.prone
    ? {
        action: 'exit hull-down',
        afterLabel: 'exit hull-down',
        noun: 'hull-down exit',
      }
    : {
        action: 'stand',
        afterLabel: 'standing',
        noun: 'stand-up',
      };
}

function reservedProjectionApplier(
  pendingConversion: IPendingConversionMovementCost,
  pendingAltitudeControl: IPendingAltitudeControlMovementCost,
): ReservedProjectionApplier {
  return (movementHex) =>
    withPendingAltitudeControlProjection(
      withPendingConversionProjection(movementHex, pendingConversion),
      pendingAltitudeControl,
    );
}
