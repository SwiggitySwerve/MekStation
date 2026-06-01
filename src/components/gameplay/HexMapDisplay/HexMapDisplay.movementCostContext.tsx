import React from 'react';

import type { IHexCoordinate, IMovementRangeHex } from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import {
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

import {
  formatElevationLabel,
  formatMovementModeLabel,
} from './HexCell.labels';
import { formatMovementPathSummaryLabel } from './HexMapDisplay.tooltipFormatters';

function movementSourceAttributes(
  movementInfo: IMovementRangeHex,
  projection?: ITacticalMapHexProjection,
): Record<string, string | number | undefined> {
  const movementSourceReferences =
    projection?.sourceReferences.filter(
      (source) => source.channel === 'movement',
    ) ?? [];
  const movementSourceRefsAttribute =
    formatTacticalProjectionSourceReferences(movementSourceReferences) ||
    undefined;
  const movementRuleRefsAttribute =
    formatTacticalProjectionRuleReferences(movementSourceReferences) ||
    undefined;
  const movementProjectionChannel =
    movementSourceReferences.length > 0 ? 'movement' : undefined;

  return {
    'data-tactical-projection-source': movementProjectionChannel
      ? 'shared-tactical-map-projection'
      : undefined,
    'data-tactical-projection-channel': movementProjectionChannel,
    'data-tactical-rules-surface': movementProjectionChannel,
    'data-movement-reachable': movementInfo.reachable ? 'true' : 'false',
    'data-movement-type': movementInfo.movementType,
    'data-movement-mode': movementInfo.movementMode,
    'data-movement-mp-cost': movementInfo.mpCost,
    'data-movement-source-refs': movementSourceRefsAttribute,
    'data-movement-rule-refs': movementRuleRefsAttribute,
  };
}

function movementPathCoordinatesAttribute(
  path: readonly IHexCoordinate[] | undefined,
): string | undefined {
  if (!path || path.length === 0) return undefined;
  return path.map((hex) => `${hex.q},${hex.r}`).join('|');
}

export function MovementCostContextRows({
  movementInfo,
  projection,
  testIdPrefix,
}: {
  readonly movementInfo: IMovementRangeHex;
  readonly projection?: ITacticalMapHexProjection;
  readonly testIdPrefix: string;
}): React.ReactElement | null {
  const sourceAttributes = movementSourceAttributes(movementInfo, projection);
  const pathSummaryLabel = formatMovementPathSummaryLabel(movementInfo);
  const pathStepCount = movementInfo.path
    ? Math.max(0, movementInfo.path.length - 1)
    : undefined;
  const hasConversionContext =
    movementInfo.conversionStepCount !== undefined ||
    movementInfo.conversionMpCost !== undefined;
  const hasAltitudeControlContext =
    movementInfo.altitudeControlStepCount !== undefined ||
    movementInfo.altitudeControlMpCost !== undefined;
  const hasAutomaticLandingContext =
    movementInfo.automaticLandingRequired === true;
  const conversionStepCount = movementInfo.conversionStepCount ?? 0;
  const conversionStepLabel =
    conversionStepCount === 1 ? '1 step' : `${conversionStepCount} steps`;
  const altitudeControlStepCount = movementInfo.altitudeControlStepCount ?? 0;
  const altitudeControlStepLabel =
    altitudeControlStepCount === 1
      ? '1 step'
      : `${altitudeControlStepCount} steps`;

  if (
    movementInfo.terrainCost === undefined &&
    movementInfo.elevationDelta === undefined &&
    movementInfo.heatGenerated === undefined &&
    !hasConversionContext &&
    !hasAltitudeControlContext &&
    !hasAutomaticLandingContext &&
    !pathSummaryLabel
  ) {
    return null;
  }

  return (
    <>
      {movementInfo.terrainCost !== undefined && (
        <div
          data-testid={`${testIdPrefix}-terrain`}
          data-movement-context-kind="terrain-cost"
          data-movement-terrain-cost={movementInfo.terrainCost}
          {...sourceAttributes}
        >
          Terrain cost: +{movementInfo.terrainCost}
        </div>
      )}
      {movementInfo.elevationDelta !== undefined && (
        <div
          data-testid={`${testIdPrefix}-elevation`}
          data-movement-context-kind="elevation-cost"
          data-movement-elevation-delta={movementInfo.elevationDelta}
          data-movement-elevation-cost={movementInfo.elevationCost}
          {...sourceAttributes}
        >
          Elevation: {formatElevationLabel(movementInfo.elevationDelta)}
          {movementInfo.elevationCost !== undefined
            ? `, cost +${movementInfo.elevationCost}`
            : ''}
        </div>
      )}
      {movementInfo.heatGenerated !== undefined && (
        <div
          data-testid={`${testIdPrefix}-heat`}
          data-movement-context-kind="heat"
          data-movement-heat-generated={movementInfo.heatGenerated}
          {...sourceAttributes}
        >
          Heat: +{movementInfo.heatGenerated}
        </div>
      )}
      {hasConversionContext && (
        <div
          data-testid={`${testIdPrefix}-conversion`}
          data-movement-context-kind="conversion"
          data-movement-conversion-step-count={conversionStepCount}
          data-movement-conversion-mp-cost={movementInfo.conversionMpCost ?? 0}
          {...sourceAttributes}
        >
          Conversion: {conversionStepLabel},{' '}
          {movementInfo.conversionMpCost ?? 0} MP
        </div>
      )}
      {hasAltitudeControlContext && (
        <div
          data-testid={`${testIdPrefix}-altitude-control`}
          data-movement-context-kind="altitude-control"
          data-movement-altitude-control-step-count={altitudeControlStepCount}
          data-movement-altitude-control-mp-cost={
            movementInfo.altitudeControlMpCost ?? 0
          }
          {...sourceAttributes}
        >
          Altitude control: {altitudeControlStepLabel},{' '}
          {movementInfo.altitudeControlMpCost ?? 0} MP
        </div>
      )}
      {hasAutomaticLandingContext && (
        <div
          data-testid={`${testIdPrefix}-automatic-landing`}
          data-movement-context-kind="automatic-landing"
          data-movement-automatic-landing-mode={
            movementInfo.automaticLandingMode
          }
          data-movement-automatic-landing-distance={
            movementInfo.automaticLandingDistance
          }
          data-movement-automatic-landing-minimum-distance={
            movementInfo.automaticLandingMinimumDistance
          }
          data-movement-automatic-landing-reason={
            movementInfo.automaticLandingReason
          }
          {...sourceAttributes}
        >
          Automatic {formatMovementModeLabel(movementInfo.automaticLandingMode)}{' '}
          landing: {movementInfo.automaticLandingDistance ?? 0}/
          {movementInfo.automaticLandingMinimumDistance ?? 0} hexes
        </div>
      )}
      {pathSummaryLabel && (
        <div
          data-testid={`${testIdPrefix}-path`}
          data-movement-context-kind="path"
          data-movement-path-step-count={pathStepCount}
          data-movement-path-coordinates={movementPathCoordinatesAttribute(
            movementInfo.path,
          )}
          {...sourceAttributes}
        >
          {pathSummaryLabel}
        </div>
      )}
    </>
  );
}
