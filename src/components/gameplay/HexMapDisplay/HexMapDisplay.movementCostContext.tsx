import React from 'react';

import type { IHexCoordinate, IMovementRangeHex } from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import {
  formatElevationLabel,
  formatMovementModeLabel,
} from './HexCell.labels';
import {
  movementProjectionSourceMetadata,
  tacticalProjectionDataAttributes,
} from './HexMapDisplay.tacticalProjectionAttributes';
import { formatMovementPathSummaryLabel } from './HexMapDisplay.tooltipFormatters';

function movementSourceAttributes(
  movementInfo: IMovementRangeHex,
  projection?: ITacticalMapHexProjection,
): Record<string, string | number | undefined> {
  const source = movementProjectionSourceMetadata(projection?.sourceReferences);

  return {
    ...tacticalProjectionDataAttributes(source),
    'data-movement-reachable': movementInfo.reachable ? 'true' : 'false',
    'data-movement-type': movementInfo.movementType,
    'data-movement-mode': movementInfo.movementMode,
    'data-movement-mp-cost': movementInfo.mpCost,
    'data-movement-source-refs': source.sourceRefs,
    'data-movement-rule-refs': source.ruleRefs,
  };
}

function movementPathCoordinatesAttribute(
  path: readonly IHexCoordinate[] | undefined,
): string | undefined {
  if (!path || path.length === 0) return undefined;
  return path.map((hex) => `${hex.q},${hex.r}`).join('|');
}

type MovementSourceAttributes = ReturnType<typeof movementSourceAttributes>;

interface MovementContextRowProps {
  readonly movementInfo: IMovementRangeHex;
  readonly sourceAttributes: MovementSourceAttributes;
  readonly testIdPrefix: string;
}

function hasMovementCostContext(
  movementInfo: IMovementRangeHex,
  pathSummaryLabel: string | undefined,
): boolean {
  return (
    movementInfo.terrainCost !== undefined ||
    movementInfo.turningCost !== undefined ||
    movementInfo.elevationDelta !== undefined ||
    movementInfo.heatGenerated !== undefined ||
    movementInfo.conversionStepCount !== undefined ||
    movementInfo.conversionMpCost !== undefined ||
    movementInfo.altitudeControlStepCount !== undefined ||
    movementInfo.altitudeControlMpCost !== undefined ||
    movementInfo.automaticLandingRequired === true ||
    Boolean(pathSummaryLabel)
  );
}

function formatStepCount(count: number): string {
  return count === 1 ? '1 step' : `${count} steps`;
}

function TerrainCostContextRow({
  movementInfo,
  sourceAttributes,
  testIdPrefix,
}: MovementContextRowProps): React.ReactElement | null {
  if (movementInfo.terrainCost === undefined) return null;

  return (
    <div
      data-testid={`${testIdPrefix}-terrain`}
      data-movement-context-kind="terrain-cost"
      data-movement-terrain-cost={movementInfo.terrainCost}
      {...sourceAttributes}
    >
      Terrain cost: +{movementInfo.terrainCost}
    </div>
  );
}

function TurningCostContextRow({
  movementInfo,
  sourceAttributes,
  testIdPrefix,
}: MovementContextRowProps): React.ReactElement | null {
  if (movementInfo.turningCost === undefined) return null;

  return (
    <div
      data-testid={`${testIdPrefix}-turning`}
      data-movement-context-kind="turning-cost"
      data-movement-turning-cost={movementInfo.turningCost}
      {...sourceAttributes}
    >
      Turning cost: +{movementInfo.turningCost}
    </div>
  );
}

function ElevationContextRow({
  movementInfo,
  sourceAttributes,
  testIdPrefix,
}: MovementContextRowProps): React.ReactElement | null {
  if (movementInfo.elevationDelta === undefined) return null;

  return (
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
  );
}

function HeatContextRow({
  movementInfo,
  sourceAttributes,
  testIdPrefix,
}: MovementContextRowProps): React.ReactElement | null {
  if (movementInfo.heatGenerated === undefined) return null;

  return (
    <div
      data-testid={`${testIdPrefix}-heat`}
      data-movement-context-kind="heat"
      data-movement-heat-generated={movementInfo.heatGenerated}
      {...sourceAttributes}
    >
      Heat: +{movementInfo.heatGenerated}
    </div>
  );
}

function ConversionContextRow({
  movementInfo,
  sourceAttributes,
  testIdPrefix,
}: MovementContextRowProps): React.ReactElement | null {
  if (
    movementInfo.conversionStepCount === undefined &&
    movementInfo.conversionMpCost === undefined
  ) {
    return null;
  }

  const conversionStepCount = movementInfo.conversionStepCount ?? 0;
  return (
    <div
      data-testid={`${testIdPrefix}-conversion`}
      data-movement-context-kind="conversion"
      data-movement-conversion-step-count={conversionStepCount}
      data-movement-conversion-mp-cost={movementInfo.conversionMpCost ?? 0}
      {...sourceAttributes}
    >
      Conversion: {formatStepCount(conversionStepCount)},{' '}
      {movementInfo.conversionMpCost ?? 0} MP
    </div>
  );
}

function AltitudeControlContextRow({
  movementInfo,
  sourceAttributes,
  testIdPrefix,
}: MovementContextRowProps): React.ReactElement | null {
  if (
    movementInfo.altitudeControlStepCount === undefined &&
    movementInfo.altitudeControlMpCost === undefined
  ) {
    return null;
  }

  const altitudeControlStepCount = movementInfo.altitudeControlStepCount ?? 0;
  return (
    <div
      data-testid={`${testIdPrefix}-altitude-control`}
      data-movement-context-kind="altitude-control"
      data-movement-altitude-control-step-count={altitudeControlStepCount}
      data-movement-altitude-control-mp-cost={
        movementInfo.altitudeControlMpCost ?? 0
      }
      {...sourceAttributes}
    >
      Altitude control: {formatStepCount(altitudeControlStepCount)},{' '}
      {movementInfo.altitudeControlMpCost ?? 0} MP
    </div>
  );
}

function AutomaticLandingContextRow({
  movementInfo,
  sourceAttributes,
  testIdPrefix,
}: MovementContextRowProps): React.ReactElement | null {
  if (movementInfo.automaticLandingRequired !== true) return null;

  return (
    <div
      data-testid={`${testIdPrefix}-automatic-landing`}
      data-movement-context-kind="automatic-landing"
      data-movement-automatic-landing-mode={movementInfo.automaticLandingMode}
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
  );
}

function PathContextRow({
  movementInfo,
  pathSummaryLabel,
  sourceAttributes,
  testIdPrefix,
}: MovementContextRowProps & {
  readonly pathSummaryLabel: string | undefined;
}): React.ReactElement | null {
  if (!pathSummaryLabel) return null;

  const pathStepCount = movementInfo.path
    ? Math.max(0, movementInfo.path.length - 1)
    : undefined;

  return (
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
  );
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
  const pathSummaryLabel =
    formatMovementPathSummaryLabel(movementInfo) ?? undefined;

  if (!hasMovementCostContext(movementInfo, pathSummaryLabel)) return null;

  return (
    <>
      <TerrainCostContextRow
        movementInfo={movementInfo}
        sourceAttributes={sourceAttributes}
        testIdPrefix={testIdPrefix}
      />
      <TurningCostContextRow
        movementInfo={movementInfo}
        sourceAttributes={sourceAttributes}
        testIdPrefix={testIdPrefix}
      />
      <ElevationContextRow
        movementInfo={movementInfo}
        sourceAttributes={sourceAttributes}
        testIdPrefix={testIdPrefix}
      />
      <HeatContextRow
        movementInfo={movementInfo}
        sourceAttributes={sourceAttributes}
        testIdPrefix={testIdPrefix}
      />
      <ConversionContextRow
        movementInfo={movementInfo}
        sourceAttributes={sourceAttributes}
        testIdPrefix={testIdPrefix}
      />
      <AltitudeControlContextRow
        movementInfo={movementInfo}
        sourceAttributes={sourceAttributes}
        testIdPrefix={testIdPrefix}
      />
      <AutomaticLandingContextRow
        movementInfo={movementInfo}
        sourceAttributes={sourceAttributes}
        testIdPrefix={testIdPrefix}
      />
      <PathContextRow
        movementInfo={movementInfo}
        pathSummaryLabel={pathSummaryLabel}
        sourceAttributes={sourceAttributes}
        testIdPrefix={testIdPrefix}
      />
    </>
  );
}
