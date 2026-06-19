import type {
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
  IMovementRangeHex,
  IUnitGameState,
  MovementTravelMode,
} from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';

import type {
  HullDownExitProjection,
  StandUpProjection,
} from './reachableProjectionTypes';

import {
  formatPendingAltitudeControlCost,
  type IPendingAltitudeControlMovementCost,
} from './altitudeControlAccounting';
import {
  formatPendingConversionCost,
  type IPendingConversionMovementCost,
} from './conversionAccounting';
import { getHullDownExitCost } from './hullDownExit';
import { withStandUpProjection } from './standUpProjection';

export function runtimeBlockedRangeHex(params: {
  readonly origin: IHexCoordinate;
  readonly hex: IHexCoordinate;
  readonly mpType: MovementType;
  readonly movementMode: MovementTravelMode;
  readonly reason: string;
  readonly heatGenerated: number;
  readonly altitudeControlRequired?: boolean;
  readonly altitudeControlMode?: 'vtol' | 'wige';
  readonly altitudeControlAltitude?: number;
}): IMovementRangeHex {
  return {
    hex: params.hex,
    mpCost: Infinity,
    terrainCost: 0,
    elevationDelta: undefined,
    elevationCost: 0,
    path: [params.origin],
    heatGenerated: params.heatGenerated,
    movementMode: params.movementMode,
    reachable: false,
    movementType: params.mpType,
    blockedReason: params.reason,
    movementInvalidReason: 'InvalidDestination',
    movementInvalidDetails: params.reason,
    altitudeControlRequired: params.altitudeControlRequired,
    altitudeControlMode: params.altitudeControlMode,
    altitudeControlAltitude: params.altitudeControlAltitude,
  };
}

export function deriveHullDownExitProjection(
  unit: IUnitGameState,
  capability: IMovementCapability,
  mpType: MovementType,
): HullDownExitProjection {
  const hullDownExitCost = getHullDownExitCost(unit, capability, mpType);
  return hullDownExitCost > 0
    ? {
        hullDownExitRequired: true,
        hullDownExitCost,
      }
    : {};
}

export function withPostureProjection(
  movementHex: IMovementRangeHex,
  standUpProjection: StandUpProjection,
  hullDownExitProjection: HullDownExitProjection,
): IMovementRangeHex {
  return {
    ...withStandUpProjection(movementHex, standUpProjection),
    ...hullDownExitProjection,
  };
}

export function formatReservedMovementCostReason(
  standingCost: number,
  pendingConversion: IPendingConversionMovementCost,
  pendingAltitudeControl: IPendingAltitudeControlMovementCost,
  postureAction: string,
): string {
  const parts: string[] = [];
  if (pendingConversion.mpCost > 0) {
    parts.push(formatPendingConversionCost(pendingConversion));
  }
  if (pendingAltitudeControl.mpCost > 0) {
    parts.push(formatPendingAltitudeControlCost(pendingAltitudeControl));
  }
  if (standingCost > 0) {
    parts.push(`${postureAction} (${standingCost} MP)`);
  }
  return parts.join(' and ');
}

export function formatReservedMovementAfterLabel(
  standingCost: number,
  pendingConversion: IPendingConversionMovementCost,
  pendingAltitudeControl: IPendingAltitudeControlMovementCost,
  postureAfterLabel: string,
): string {
  const parts: string[] = [];
  if (pendingConversion.stepCount > 0 || pendingConversion.mpCost > 0) {
    parts.push('conversion');
  }
  if (
    pendingAltitudeControl.stepCount > 0 ||
    pendingAltitudeControl.mpCost > 0
  ) {
    parts.push('altitude control');
  }
  if (standingCost > 0) parts.push(postureAfterLabel);
  return parts.join(' and ');
}

export function formatReservedMovementNoun(
  standingCost: number,
  pendingConversion: IPendingConversionMovementCost,
  pendingAltitudeControl: IPendingAltitudeControlMovementCost,
  postureNoun: string,
): string {
  const parts: string[] = [];
  if (pendingConversion.stepCount > 0 || pendingConversion.mpCost > 0) {
    parts.push('conversion');
  }
  if (
    pendingAltitudeControl.stepCount > 0 ||
    pendingAltitudeControl.mpCost > 0
  ) {
    parts.push('altitude control');
  }
  if (standingCost > 0) parts.push(postureNoun);
  return parts.join(' and ');
}
