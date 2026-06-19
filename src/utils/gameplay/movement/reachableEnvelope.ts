import type {
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
  IMovementRangeHex,
  IUnitGameState,
  StandUpMode,
} from '@/types/gameplay';

import { getHeatMovementPenalty } from '@/constants/heat';
import { MovementType } from '@/types/gameplay';
import { hexesInRange } from '@/utils/gameplay/hexMath';

import type { IMovementProjectionRuleOptions } from './reachableProjectionTypes';

import { pendingAltitudeControlMovementCost } from './altitudeControlAccounting';
import {
  getMaxMP,
  getPavementRoadBonusMP,
  movementCostContextForCapability,
} from './calculations';
import { pendingConversionMovementCost } from './conversionAccounting';
import { getHullDownExitCost } from './hullDownExit';
import { movementModeForRange } from './mode';
import { compareRangeHexes } from './rangeHexProjection';
import { deriveMovementRangeHexForDestination } from './reachableDestination';
import { resolveRuntimeMovementCapability } from './runtimeCapability';
import { getStandingCost } from './validation';

export function deriveReachableHexes(
  unit: IUnitGameState,
  mpType: MovementType,
  grid: IHexGrid,
  capability: IMovementCapability,
  standUpMode: StandUpMode = 'normal',
  ruleOptions: IMovementProjectionRuleOptions = {},
): readonly IMovementRangeHex[] {
  const resolvedCapability =
    resolveRuntimeMovementCapability(unit, capability) ?? capability;

  if (mpType === MovementType.Stationary) return [];

  const mp = getMaxMP(
    resolvedCapability,
    mpType,
    getHeatMovementPenalty(unit.heat),
  );
  if (mp <= 0) return [];

  const candidates = hexesInRange(
    unit.position,
    reachableCandidateRange({
      unit,
      mpType,
      capability: resolvedCapability,
      standUpMode,
      ruleOptions,
      mp,
    }),
  );
  const results: IMovementRangeHex[] = [];
  const projectCandidate = (hex: IHexCoordinate): IMovementRangeHex | null =>
    deriveMovementRangeHexForDestination(
      unit,
      mpType,
      grid,
      resolvedCapability,
      hex,
      standUpMode,
      ruleOptions,
    );

  for (const hex of candidates) {
    const projection = projectCandidate(hex);
    if (projection) results.push(projection);
  }

  results.sort(compareRangeHexes);
  return results;
}

function reachableCandidateRange(input: {
  readonly unit: IUnitGameState;
  readonly mpType: MovementType;
  readonly capability: IMovementCapability;
  readonly standUpMode: StandUpMode;
  readonly ruleOptions: IMovementProjectionRuleOptions;
  readonly mp: number;
}): number {
  const projectionMovementMode = movementModeForRange(
    input.mpType,
    input.capability,
  );
  const projectionCostContext = movementCostContextForCapability(
    input.mpType,
    input.capability,
    {
      environmentalConditions: input.ruleOptions.environmentalConditions,
      optionalRules: input.ruleOptions.optionalRules,
      pilotAbilities: input.unit.abilities,
    },
  );
  const standingCost =
    input.unit.prone && input.mpType !== MovementType.Jump
      ? getStandingCost(input.capability, input.standUpMode)
      : getHullDownExitCost(input.unit, input.capability, input.mpType);
  const pendingConversion = pendingConversionMovementCost(input.unit);
  const pendingAltitudeControl = pendingAltitudeControlMovementCost(input.unit);
  const reservedCost =
    standingCost + pendingConversion.mpCost + pendingAltitudeControl.mpCost;
  const pathBudget = Math.max(0, input.mp - reservedCost);

  return input.mpType === MovementType.Jump
    ? input.mp
    : pathBudget +
        getPavementRoadBonusMP(projectionMovementMode, projectionCostContext);
}
