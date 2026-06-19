import type {
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
  IMovementRangeHex,
  IUnitGameState,
  MovementTravelMode,
} from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';
import { getOccupant, isInBounds, isOccupied } from '@/utils/gameplay/hexGrid';
import { hexEquals } from '@/utils/gameplay/hexMath';
import { representedUnitImmobileReason } from '@/utils/gameplay/unitImmobility';

import type { IPendingAltitudeControlMovementCost } from './altitudeControlAccounting';
import type { IMovementCostContext } from './calculations';
import type { IPendingConversionMovementCost } from './conversionAccounting';
import type {
  HullDownExitProjection,
  IMovementProjectionRuleOptions,
  ReservedProjectionApplier,
  StandUpProjection,
} from './reachableProjectionTypes';

import { getJumpElevationDelta } from './calculations';
import { immobileMovementRangeHex } from './immobilityProjection';
import { movementModeForPath } from './mode';
import {
  insufficientMpRangeHex,
  occupiedRangeHex,
  outOfBoundsRangeHex,
} from './rangeHexProjection';
import {
  runtimeBlockedRangeHex,
  withPostureProjection,
} from './reachableProjectionHelpers';
import {
  runtimeMovementAltitudeControlContext,
  runtimeMovementProjectionBlockedReason,
} from './runtimeCapability';
import { getStandingCost } from './validation';

export interface IPrePathBlockedRangeHexInput {
  readonly unit: IUnitGameState;
  readonly mpType: MovementType;
  readonly grid: IHexGrid;
  readonly capability: IMovementCapability;
  readonly hex: IHexCoordinate;
  readonly origin: IHexCoordinate;
  readonly dist: number;
  readonly mp: number;
  readonly maxPathCost: number;
  readonly movementMode: MovementTravelMode;
  readonly costContext: IMovementCostContext;
  readonly reservedCost: number;
  readonly reservedCostReason: string;
  readonly reservedAfterLabel: string;
  readonly pendingConversion: IPendingConversionMovementCost;
  readonly pendingAltitudeControl: IPendingAltitudeControlMovementCost;
  readonly standUpProjection: StandUpProjection;
  readonly hullDownExitProjection: HullDownExitProjection;
  readonly ruleOptions: IMovementProjectionRuleOptions;
  readonly withReservedProjection: ReservedProjectionApplier;
}

export function derivePrePathBlockedRangeHex(
  input: IPrePathBlockedRangeHexInput,
): IMovementRangeHex | null {
  const immobileProjection = deriveImmobileOrRuntimeBlockedRangeHex(input);
  if (immobileProjection) return immobileProjection;

  const mapProjection = deriveMapBlockedRangeHex(input);
  if (mapProjection) return mapProjection;

  const postureProjection = derivePostureBlockedRangeHex(input);
  if (postureProjection) return postureProjection;

  return deriveBudgetBlockedRangeHex(input);
}

function deriveImmobileOrRuntimeBlockedRangeHex(
  input: IPrePathBlockedRangeHexInput,
): IMovementRangeHex | null {
  const immobileReason = representedUnitImmobileReason(input.unit);
  if (immobileReason) {
    return input.withReservedProjection(
      immobileMovementRangeHex({
        grid: input.grid,
        origin: input.origin,
        hex: input.hex,
        mpType: input.mpType,
        movementMode: input.movementMode,
        reason: immobileReason,
      }),
    );
  }

  const runtimeBlockedReason = runtimeMovementProjectionBlockedReason(
    input.unit,
    input.capability,
    input.movementMode,
    input.ruleOptions,
  );
  if (!runtimeBlockedReason) return null;

  const altitudeControlContext = runtimeMovementAltitudeControlContext(
    input.unit,
  );
  return input.withReservedProjection(
    runtimeBlockedRangeHex({
      origin: input.origin,
      hex: input.hex,
      mpType: input.mpType,
      movementMode: input.movementMode,
      reason: runtimeBlockedReason,
      heatGenerated: 0,
      altitudeControlRequired: altitudeControlContext?.altitudeControlRequired,
      altitudeControlMode: altitudeControlContext?.altitudeControlMode,
      altitudeControlAltitude: altitudeControlContext?.altitudeControlAltitude,
    }),
  );
}

function deriveMapBlockedRangeHex(
  input: IPrePathBlockedRangeHexInput,
): IMovementRangeHex | null {
  if (!isInBounds(input.grid, input.hex)) {
    return input.withReservedProjection(
      withPostureProjection(
        outOfBoundsRangeHex({
          hex: input.hex,
          mpType: input.mpType,
          movementMode: movementModeForPath(input.mpType, input.capability),
          mpCost: input.dist + input.reservedCost,
          path: [input.origin, input.hex],
        }),
        input.standUpProjection,
        input.hullDownExitProjection,
      ),
    );
  }

  if (
    !hexEquals(input.origin, input.hex) &&
    isOccupied(input.grid, input.hex)
  ) {
    return input.withReservedProjection(
      withPostureProjection(
        occupiedRangeHex({
          grid: input.grid,
          origin: input.origin,
          hex: input.hex,
          mpType: input.mpType,
          movementMode: input.movementMode,
          mpCost: input.dist + input.reservedCost,
          path: [input.origin, input.hex],
        }),
        input.standUpProjection,
        input.hullDownExitProjection,
      ),
    );
  }

  const startOccupantId = getOccupant(input.grid, input.origin);
  if (
    hexEquals(input.origin, input.hex) ||
    startOccupantId === null ||
    startOccupantId === input.unit.id
  ) {
    return null;
  }

  const details =
    'Unit cannot make follow-up movement from a start hex occupied by another unit';
  return input.withReservedProjection({
    hex: input.hex,
    mpCost: input.reservedCost,
    terrainCost: undefined,
    elevationDelta: undefined,
    elevationCost: undefined,
    path: [input.origin],
    heatGenerated: 0,
    movementMode: input.movementMode,
    reachable: false,
    movementType: input.mpType,
    blockedReason: details,
    movementInvalidReason: 'InvalidDestination',
    movementInvalidDetails: details,
    ...input.standUpProjection,
    ...input.hullDownExitProjection,
  });
}

function derivePostureBlockedRangeHex(
  input: IPrePathBlockedRangeHexInput,
): IMovementRangeHex | null {
  if (input.mpType === MovementType.Jump && input.capability.jumpMP <= 0) {
    return input.withReservedProjection(
      jumpBlockedRangeHex(input, 'Unit cannot jump (no jump jets)', {
        reason: 'JumpUnavailable',
      }),
    );
  }

  if (input.unit.prone && input.standUpProjection.standUpMode === 'careful') {
    const details = 'Careful stand consumes the movement for this turn';
    return input.withReservedProjection({
      hex: input.hex,
      mpCost: input.reservedCost,
      terrainCost: undefined,
      elevationDelta: undefined,
      elevationCost: undefined,
      path: [input.origin],
      heatGenerated: 0,
      movementMode: input.movementMode,
      reachable: false,
      movementType: input.mpType,
      blockedReason: details,
      movementInvalidReason: 'InvalidDestination',
      movementInvalidDetails: details,
      ...input.standUpProjection,
    });
  }

  if (input.unit.prone && input.mpType === MovementType.Jump) {
    return input.withReservedProjection({
      ...jumpBlockedRangeHex(
        input,
        'Unit is prone and must stand before jumping',
      ),
      ...input.standUpProjection,
    });
  }

  if (
    input.unit.hullDown &&
    !input.unit.prone &&
    input.mpType === MovementType.Jump
  ) {
    return input.withReservedProjection(
      jumpBlockedRangeHex(
        input,
        'Unit is hull-down and must stand before jumping',
        {
          mpCost:
            getStandingCost(input.capability) +
            input.pendingConversion.mpCost +
            input.pendingAltitudeControl.mpCost,
        },
      ),
    );
  }

  const details = input.standUpProjection.standUpPsrImpossibleReason;
  if (!details) return null;
  return input.withReservedProjection({
    hex: input.hex,
    mpCost: input.reservedCost,
    terrainCost: undefined,
    elevationDelta: undefined,
    elevationCost: undefined,
    path: [input.origin, input.hex],
    heatGenerated: 0,
    movementMode: input.movementMode,
    reachable: false,
    movementType: input.mpType,
    blockedReason: details,
    movementInvalidReason: 'InvalidDestination',
    movementInvalidDetails: details,
    ...input.standUpProjection,
  });
}

function deriveBudgetBlockedRangeHex(
  input: IPrePathBlockedRangeHexInput,
): IMovementRangeHex | null {
  if (input.reservedCost > input.mp) {
    const details = `Unit needs ${input.reservedCost} MP for ${input.reservedCostReason}, but max range for ${input.mpType} is ${input.mp}`;
    return input.withReservedProjection({
      hex: input.hex,
      mpCost: input.reservedCost,
      terrainCost: input.mpType === MovementType.Jump ? 0 : undefined,
      elevationDelta:
        input.mpType === MovementType.Jump
          ? getJumpElevationDelta(input.grid, input.origin, input.hex)
          : undefined,
      elevationCost: input.mpType === MovementType.Jump ? 0 : undefined,
      path: [input.origin, input.hex],
      heatGenerated: 0,
      movementMode: input.movementMode,
      reachable: false,
      movementType: input.mpType,
      blockedReason: details,
      movementInvalidReason: 'InsufficientMP',
      movementInvalidDetails: details,
      ...input.standUpProjection,
      ...input.hullDownExitProjection,
    });
  }

  if (input.mp <= 0) {
    const details = `Destination is ${input.dist} hexes away, but max range for ${input.mpType} is ${input.mp}`;
    return input.withReservedProjection({
      hex: input.hex,
      mpCost: input.dist + input.reservedCost,
      terrainCost: input.mpType === MovementType.Jump ? 0 : undefined,
      elevationDelta:
        input.mpType === MovementType.Jump
          ? getJumpElevationDelta(input.grid, input.origin, input.hex)
          : undefined,
      elevationCost: input.mpType === MovementType.Jump ? 0 : undefined,
      path: [input.origin, input.hex],
      heatGenerated: 0,
      movementMode: input.movementMode,
      reachable: false,
      movementType: input.mpType,
      blockedReason: details,
      movementInvalidReason: 'InsufficientMP',
      movementInvalidDetails: details,
    });
  }

  if (input.dist <= input.maxPathCost) return null;
  if (input.reservedCost > 0) return reservedBudgetBlockedRangeHex(input);

  return input.withReservedProjection(
    insufficientMpRangeHex({
      grid: input.grid,
      origin: input.origin,
      hex: input.hex,
      mpType: input.mpType,
      movementMode: input.movementMode,
      mpCost: input.dist,
      maxCost: input.maxPathCost,
      costContext: input.costContext,
    }),
  );
}

function reservedBudgetBlockedRangeHex(
  input: IPrePathBlockedRangeHexInput,
): IMovementRangeHex {
  const details = `Destination is ${input.dist} hexes away, but max range for ${input.mpType} after ${input.reservedAfterLabel} is ${input.maxPathCost}`;
  return input.withReservedProjection({
    hex: input.hex,
    mpCost: input.dist + input.reservedCost,
    terrainCost: undefined,
    elevationDelta: undefined,
    elevationCost: undefined,
    path: [input.origin, input.hex],
    heatGenerated: 0,
    movementMode: input.movementMode,
    reachable: false,
    movementType: input.mpType,
    blockedReason: details,
    movementInvalidReason: 'InsufficientMP',
    movementInvalidDetails: details,
    ...input.standUpProjection,
    ...input.hullDownExitProjection,
  });
}

function jumpBlockedRangeHex(
  input: IPrePathBlockedRangeHexInput,
  details: string,
  options: {
    readonly reason?: IMovementRangeHex['movementInvalidReason'];
    readonly mpCost?: number;
  } = {},
): IMovementRangeHex {
  return {
    hex: input.hex,
    mpCost: options.mpCost ?? input.reservedCost,
    terrainCost: 0,
    elevationDelta: getJumpElevationDelta(input.grid, input.origin, input.hex),
    elevationCost: 0,
    path: [input.origin, input.hex],
    heatGenerated: 0,
    movementMode: input.movementMode,
    reachable: false,
    movementType: MovementType.Jump,
    blockedReason: details,
    movementInvalidReason: options.reason ?? 'InvalidDestination',
    movementInvalidDetails: details,
  };
}
