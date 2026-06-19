import type {
  IMovementCapability,
  IUnitGameState,
  StandUpMode,
} from '@/types/gameplay';
import type { IMovementInvalidPayload } from '@/types/gameplay/GameSessionMovementEvents';

import { getHeatMovementPenalty } from '@/constants/heat';
import { representedUnitImmobileReason } from '@/utils/gameplay/unitImmobility';

import {
  pendingAltitudeControlMovementCost,
  type IPendingAltitudeControlMovementCost,
} from './altitudeControlAccounting';
import { getMaxMP } from './calculations';
import {
  pendingConversionMovementCost,
  type IPendingConversionMovementCost,
} from './conversionAccounting';
import { movementDeclarationLockInvalidState } from './declarationEligibility';
import { getHullDownExitCost } from './hullDownExit';
import { resolveRuntimeMovementCapability } from './runtimeCapability';
import { getStandingCost } from './validation';

export interface ICommittedMovementContext {
  readonly movementCapability: IMovementCapability;
  readonly maxCost: number;
  readonly standUpMode: StandUpMode;
  readonly standingCost: number;
  readonly pendingConversion: IPendingConversionMovementCost;
  readonly pendingAltitudeControl: IPendingAltitudeControlMovementCost;
  readonly reservedCost: number;
  readonly reservedCostLabel: string;
}

export type CommitReadinessFailure = {
  readonly valid: false;
  readonly reason: IMovementInvalidPayload['reason'];
  readonly details: string;
  readonly mpCost?: number;
  readonly heatGenerated?: number;
};

export function validateCommitReadiness(input: {
  readonly unit: IUnitGameState;
}): CommitReadinessFailure | null {
  const alreadyMoved = movementDeclarationLockInvalidState(
    input.unit.lockState,
  );
  if (alreadyMoved) {
    return {
      valid: false,
      reason: alreadyMoved.reason,
      details: alreadyMoved.details,
      mpCost: 0,
      heatGenerated: 0,
    };
  }

  const immobileReason = representedUnitImmobileReason(input.unit);
  if (!immobileReason) return null;
  return {
    valid: false,
    reason: 'UnitImmobile',
    details: immobileReason,
    mpCost: 0,
    heatGenerated: 0,
  };
}

export function buildCommittedMovementContext(input: {
  readonly unit: IUnitGameState;
  readonly capability?: IMovementCapability | null;
  readonly movementType: Parameters<typeof getMaxMP>[1];
  readonly standUpMode?: StandUpMode;
}): ICommittedMovementContext | null {
  if (!input.capability) return null;

  const capability =
    resolveRuntimeMovementCapability(input.unit, input.capability) ??
    input.capability;
  const movementCapability =
    input.unit.isQuad === true && capability.mekLegProfile !== 'quad'
      ? { ...capability, mekLegProfile: 'quad' as const }
      : capability;
  const standUpMode = input.standUpMode ?? 'normal';
  const standingCost = input.unit.prone
    ? getStandingCost(movementCapability, standUpMode)
    : getHullDownExitCost(input.unit, movementCapability, input.movementType);
  const pendingConversion = pendingConversionMovementCost(input.unit);
  const pendingAltitudeControl = pendingAltitudeControlMovementCost(input.unit);
  const reservedCost =
    standingCost + pendingConversion.mpCost + pendingAltitudeControl.mpCost;

  return {
    movementCapability,
    maxCost: getMaxMP(
      movementCapability,
      input.movementType,
      getHeatMovementPenalty(input.unit.heat),
    ),
    standUpMode,
    standingCost,
    pendingConversion,
    pendingAltitudeControl,
    reservedCost,
    reservedCostLabel: movementReservedCostLabel(
      standingCost,
      pendingConversion,
      pendingAltitudeControl,
    ),
  };
}

function movementReservedCostLabel(
  standingCost: number,
  pendingConversion: IPendingConversionMovementCost,
  pendingAltitudeControl: IPendingAltitudeControlMovementCost,
): string {
  const parts: string[] = [];
  if (standingCost > 0) parts.push('stand-up');
  if (pendingConversion.stepCount > 0 || pendingConversion.mpCost > 0) {
    parts.push('conversion');
  }
  if (
    pendingAltitudeControl.stepCount > 0 ||
    pendingAltitudeControl.mpCost > 0
  ) {
    parts.push('altitude control');
  }
  return parts.join(' and ');
}
