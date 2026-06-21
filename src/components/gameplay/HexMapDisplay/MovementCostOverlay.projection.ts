import type { IMovementRangeHex } from '@/types/gameplay';

import { formatMovementModeTitle } from './HexCell.movementBadges';
import {
  movementOptionAltitudeControlMpCostsAttribute,
  movementOptionAltitudeControlStepCountsAttribute,
  movementOptionAutomaticLandingsAttribute,
  movementOptionBlockedReasonsAttribute,
  movementOptionConversionMpCostsAttribute,
  movementOptionConversionStepCountsAttribute,
  movementOptionElevationCostsAttribute,
  movementOptionElevationDeltasAttribute,
  movementOptionHeatGeneratedAttribute,
  movementOptionInvalidDetailsAttribute,
  movementOptionInvalidReasonsAttribute,
  movementOptionTerrainCostsAttribute,
  movementOptionTurningCostsAttribute,
  movementOptionsForBadge,
} from './HexCell.movementOptionSummaries';

export type MovementProjectionOverlayAttributes = Readonly<
  Record<string, string | number | undefined>
>;

export type MovementCostBand = 'low' | 'medium' | 'high';

export function movementCostBandFor(cost: number): MovementCostBand {
  if (cost <= 1) return 'low';
  if (cost <= 3) return 'medium';
  return 'high';
}

export function movementCostBandFill(band: MovementCostBand): string {
  switch (band) {
    case 'low':
      return '#22c55e';
    case 'medium':
      return '#eab308';
    case 'high':
      return '#ef4444';
  }
}

function formatMovementProjectionTitle(
  movementInfo: IMovementRangeHex | undefined,
): string | null {
  if (!movementInfo) return null;

  const status = movementInfo.reachable ? 'reachable' : 'blocked';
  const details = [
    `${formatMovementModeTitle(movementInfo)} ${status}`,
    `${movementInfo.mpCost} MP`,
    `terrain +${movementInfo.terrainCost ?? 0}`,
    `turning +${movementInfo.turningCost ?? 0}`,
    `elevation delta ${movementInfo.elevationDelta ?? 0}`,
    `elevation cost +${movementInfo.elevationCost ?? 0}`,
    `heat +${movementInfo.heatGenerated ?? 0}`,
  ];
  if (
    movementInfo.altitudeControlStepCount !== undefined ||
    movementInfo.altitudeControlMpCost !== undefined
  ) {
    details.push(
      `altitude control ${movementInfo.altitudeControlStepCount ?? 0} steps ${
        movementInfo.altitudeControlMpCost ?? 0
      } MP`,
    );
  }
  if (movementInfo.automaticLandingRequired) {
    details.push(
      `automatic ${movementInfo.automaticLandingMode ?? 'wige'} landing ${
        movementInfo.automaticLandingDistance ?? 0
      }/${movementInfo.automaticLandingMinimumDistance ?? 0} hexes`,
    );
  }
  const blockedReason =
    movementInfo.movementInvalidDetails ??
    movementInfo.blockedReason ??
    movementInfo.movementInvalidReason;
  if (blockedReason) details.push(blockedReason);

  return `Projected movement: ${details.join('; ')}`;
}

export function movementProjectionOverlayTitleParts({
  movementInfo,
  projectionExplanation,
}: {
  readonly movementInfo?: IMovementRangeHex;
  readonly projectionExplanation?: string;
}): readonly string[] {
  return [
    formatMovementProjectionTitle(movementInfo),
    projectionExplanation ? `Projection: ${projectionExplanation}` : null,
  ].filter((part): part is string => part !== null);
}

export function movementProjectionOverlayAttributes(
  movementInfo: IMovementRangeHex | undefined,
  projectionExplanation: string | undefined,
): MovementProjectionOverlayAttributes {
  const movementOptions = movementInfo
    ? movementOptionsForBadge(movementInfo)
    : [];
  const hasMultipleOptions = movementOptions.length > 1;

  return {
    'data-movement-projection-type': movementInfo?.movementType,
    'data-movement-projection-mode': movementInfo?.movementMode,
    'data-movement-projection-reachable': movementInfo
      ? movementInfo.reachable
        ? 'true'
        : 'false'
      : undefined,
    'data-movement-projection-mp-cost': movementInfo?.mpCost,
    'data-movement-projection-terrain-cost': movementInfo?.terrainCost,
    'data-movement-projection-turning-cost': movementInfo?.turningCost,
    'data-movement-projection-elevation-delta': movementInfo?.elevationDelta,
    'data-movement-projection-elevation-cost': movementInfo?.elevationCost,
    'data-movement-projection-heat-generated': movementInfo?.heatGenerated,
    'data-movement-projection-conversion-step-count':
      movementInfo?.conversionStepCount,
    'data-movement-projection-conversion-mp-cost':
      movementInfo?.conversionMpCost,
    'data-movement-projection-altitude-control-step-count':
      movementInfo?.altitudeControlStepCount,
    'data-movement-projection-altitude-control-mp-cost':
      movementInfo?.altitudeControlMpCost,
    'data-movement-projection-automatic-landing-required':
      movementInfo?.automaticLandingRequired ? 'true' : undefined,
    'data-movement-projection-automatic-landing-mode':
      movementInfo?.automaticLandingMode,
    'data-movement-projection-automatic-landing-distance':
      movementInfo?.automaticLandingDistance,
    'data-movement-projection-automatic-landing-minimum-distance':
      movementInfo?.automaticLandingMinimumDistance,
    'data-movement-projection-blocked-reason': movementInfo?.blockedReason,
    'data-movement-projection-invalid-reason':
      movementInfo?.movementInvalidReason,
    'data-movement-projection-invalid-details':
      movementInfo?.movementInvalidDetails,
    'data-movement-projection-option-count': hasMultipleOptions
      ? movementOptions.length
      : undefined,
    'data-movement-projection-option-terrain-costs': hasMultipleOptions
      ? movementOptionTerrainCostsAttribute(movementOptions)
      : undefined,
    'data-movement-projection-option-turning-costs': hasMultipleOptions
      ? movementOptionTurningCostsAttribute(movementOptions)
      : undefined,
    'data-movement-projection-option-elevation-deltas': hasMultipleOptions
      ? movementOptionElevationDeltasAttribute(movementOptions)
      : undefined,
    'data-movement-projection-option-elevation-costs': hasMultipleOptions
      ? movementOptionElevationCostsAttribute(movementOptions)
      : undefined,
    'data-movement-projection-option-heats': hasMultipleOptions
      ? movementOptionHeatGeneratedAttribute(movementOptions)
      : undefined,
    'data-movement-projection-option-conversion-step-counts': hasMultipleOptions
      ? movementOptionConversionStepCountsAttribute(movementOptions)
      : undefined,
    'data-movement-projection-option-conversion-mp-costs': hasMultipleOptions
      ? movementOptionConversionMpCostsAttribute(movementOptions)
      : undefined,
    'data-movement-projection-option-altitude-control-step-counts':
      hasMultipleOptions
        ? movementOptionAltitudeControlStepCountsAttribute(movementOptions)
        : undefined,
    'data-movement-projection-option-altitude-control-mp-costs':
      hasMultipleOptions
        ? movementOptionAltitudeControlMpCostsAttribute(movementOptions)
        : undefined,
    'data-movement-projection-option-automatic-landings': hasMultipleOptions
      ? movementOptionAutomaticLandingsAttribute(movementOptions)
      : undefined,
    'data-movement-projection-option-blocked-reasons': hasMultipleOptions
      ? movementOptionBlockedReasonsAttribute(movementOptions)
      : undefined,
    'data-movement-projection-option-invalid-reasons': hasMultipleOptions
      ? movementOptionInvalidReasonsAttribute(movementOptions)
      : undefined,
    'data-movement-projection-option-invalid-details': hasMultipleOptions
      ? movementOptionInvalidDetailsAttribute(movementOptions)
      : undefined,
    'data-tactical-projection-explanation': projectionExplanation,
  };
}
