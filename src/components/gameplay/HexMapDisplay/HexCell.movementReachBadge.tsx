import React from 'react';

import type { IMovementRangeHex } from '@/types/gameplay';

import {
  HexCellSvgTextBadge,
  type MovementProjectionBadgeProps,
} from './HexCell.badgePrimitives';
import {
  formatMovementModeLabel,
  formatMovementModeTitleLabel,
  formatMovementOptionCostBadgeLabel,
  formatMovementOptionTitle,
  formatMovementTypeLabel,
  movementOptionAltitudeControlsAttribute,
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
  movementOptionsForBadge,
} from './HexCell.movementOptionSummaries';
import {
  movementProjectionSourceMetadata,
  tacticalProjectionDataAttributes,
} from './HexMapDisplay.tacticalProjectionAttributes';

export function formatMovementReachBadgeLabel(
  movementInfo: IMovementRangeHex,
): string {
  const options = movementOptionsForBadge(movementInfo);
  const motiveLabel = formatMovementModeLabel(movementInfo.movementMode);

  if (options.length > 1) {
    return formatMovementOptionCostBadgeLabel(options);
  }

  const typeLabel = formatMovementTypeLabel(movementInfo.movementType);
  const modeLabel = motiveLabel ? `${typeLabel}/${motiveLabel}` : typeLabel;
  const mpLabel = Number.isFinite(movementInfo.mpCost)
    ? `${movementInfo.mpCost}MP`
    : 'XMP';
  return `${modeLabel} ${mpLabel}`;
}

export function formatMovementModeTitle(
  movementInfo: IMovementRangeHex,
): string {
  if (
    movementInfo.movementMode &&
    movementInfo.movementMode !== movementInfo.movementType
  ) {
    return `${movementInfo.movementType} via ${formatMovementModeTitleLabel(
      movementInfo.movementMode,
    )}`;
  }
  return movementInfo.movementType;
}

export function formatMovementReachBadgeTitle(
  movementInfo: IMovementRangeHex,
): string {
  const conversion =
    movementInfo.conversionStepCount === undefined &&
    movementInfo.conversionMpCost === undefined
      ? ''
      : `; conversion ${movementInfo.conversionStepCount ?? 0} steps ${
          movementInfo.conversionMpCost ?? 0
        } MP`;
  const altitudeControl =
    movementInfo.altitudeControlStepCount === undefined &&
    movementInfo.altitudeControlMpCost === undefined
      ? ''
      : `; altitude control ${
          movementInfo.altitudeControlStepCount ?? 0
        } steps ${movementInfo.altitudeControlMpCost ?? 0} MP`;
  const automaticLanding = movementInfo.automaticLandingRequired
    ? `; automatic ${
        movementInfo.automaticLandingMode
          ? formatMovementModeTitleLabel(movementInfo.automaticLandingMode)
          : 'WiGE'
      } landing ${movementInfo.automaticLandingDistance ?? 0}/${
        movementInfo.automaticLandingMinimumDistance ?? 0
      } hexes`
    : '';
  const primary = `${formatMovementModeTitle(movementInfo)} reachable: ${movementInfo.mpCost} MP${conversion}${altitudeControl}${automaticLanding}`;
  const options = movementInfo.movementModeOptions ?? [];
  if (options.length <= 1) return primary;
  return `${primary}; options ${options.map(formatMovementOptionTitle).join('; ')}`;
}

function movementOptionAttributes(
  movementOptions: NonNullable<IMovementRangeHex['movementModeOptions']>,
): Record<string, string | number | undefined> {
  if (movementOptions.length <= 1) return {};
  return {
    'data-movement-badge-option-count': movementOptions.length,
    'data-movement-badge-option-types': movementOptions
      .map((option) => option.movementType)
      .join(','),
    'data-movement-badge-option-costs': movementOptions
      .map((option) => `${option.movementType}:${option.mpCost}`)
      .join('|'),
    'data-movement-badge-option-blocked-reasons':
      movementOptionBlockedReasonsAttribute(movementOptions),
    'data-movement-badge-option-invalid-reasons':
      movementOptionInvalidReasonsAttribute(movementOptions),
    'data-movement-badge-option-invalid-details':
      movementOptionInvalidDetailsAttribute(movementOptions),
    'data-movement-badge-option-terrain-costs':
      movementOptionTerrainCostsAttribute(movementOptions),
    'data-movement-badge-option-elevation-deltas':
      movementOptionElevationDeltasAttribute(movementOptions),
    'data-movement-badge-option-elevation-costs':
      movementOptionElevationCostsAttribute(movementOptions),
    'data-movement-badge-option-conversion-step-counts':
      movementOptionConversionStepCountsAttribute(movementOptions),
    'data-movement-badge-option-conversion-mp-costs':
      movementOptionConversionMpCostsAttribute(movementOptions),
    'data-movement-badge-option-altitude-control-step-counts':
      movementOptionAltitudeControlStepCountsAttribute(movementOptions),
    'data-movement-badge-option-altitude-control-mp-costs':
      movementOptionAltitudeControlMpCostsAttribute(movementOptions),
    'data-movement-badge-option-altitude-controls':
      movementOptionAltitudeControlsAttribute(movementOptions),
    'data-movement-badge-option-automatic-landings':
      movementOptionAutomaticLandingsAttribute(movementOptions),
  };
}

export function MovementReachBadge({
  x,
  y,
  hex,
  movementInfo,
  projectionExplanation,
  sourceReferences,
}: MovementProjectionBadgeProps): React.ReactElement | null {
  if (!movementInfo?.reachable) return null;

  const label = formatMovementReachBadgeLabel(movementInfo);
  const title = formatMovementReachBadgeTitle(movementInfo);
  const movementOptions = movementInfo.movementModeOptions ?? [];
  const width = Math.max(34, label.length * 5.6 + 10);
  const source = movementProjectionSourceMetadata(sourceReferences);

  return (
    <HexCellSvgTextBadge
      testId={`hex-movement-badge-${hex.q}-${hex.r}`}
      title={title}
      label={label}
      dataAttributes={{
        ...tacticalProjectionDataAttributes(source),
        'data-movement-badge-type': movementInfo.movementType,
        'data-movement-badge-mode': movementInfo.movementMode,
        'data-movement-badge-mp-cost': movementInfo.mpCost,
        'data-movement-badge-heat-generated': movementInfo.heatGenerated,
        'data-movement-badge-conversion-step-count':
          movementInfo.conversionStepCount,
        'data-movement-badge-conversion-mp-cost': movementInfo.conversionMpCost,
        'data-movement-badge-altitude-control-step-count':
          movementInfo.altitudeControlStepCount,
        'data-movement-badge-altitude-control-mp-cost':
          movementInfo.altitudeControlMpCost,
        'data-movement-badge-altitude-control-required':
          movementInfo.altitudeControlRequired ? 'true' : undefined,
        'data-movement-badge-altitude-control-mode':
          movementInfo.altitudeControlMode,
        'data-movement-badge-altitude-control-altitude':
          movementInfo.altitudeControlAltitude,
        'data-movement-badge-automatic-landing-required':
          movementInfo.automaticLandingRequired ? 'true' : undefined,
        'data-movement-badge-automatic-landing-mode':
          movementInfo.automaticLandingMode,
        'data-movement-badge-automatic-landing-distance':
          movementInfo.automaticLandingDistance,
        'data-movement-badge-automatic-landing-minimum-distance':
          movementInfo.automaticLandingMinimumDistance,
        'data-movement-badge-option-heats':
          movementOptionHeatGeneratedAttribute(movementOptions),
        'data-movement-badge-source-refs': source.sourceRefs,
        'data-movement-badge-rule-refs': source.ruleRefs,
        'data-movement-badge-projection-explanation': projectionExplanation,
        ...movementOptionAttributes(movementOptions),
      }}
      rect={{
        x: x - width / 2,
        y: y + 7,
        width,
        height: 12,
        rx: 3,
        fill: '#14532d',
        opacity: 0.9,
      }}
      text={{
        x,
        y: y + 16,
        fontSize: 8,
        fontWeight: 'bold',
        fill: '#ecfdf5',
      }}
    />
  );
}
