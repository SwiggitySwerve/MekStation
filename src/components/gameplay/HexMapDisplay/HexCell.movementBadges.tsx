import React from 'react';

import type { IHexCoordinate, IMovementRangeHex } from '@/types/gameplay';

import {
  HexCellSvgTextBadge,
  type MovementProjectionBadgeProps,
} from './HexCell.badgePrimitives';
import { formatMovementModeTitleLabel } from './HexCell.movementOptionSummaries';
import {
  movementProjectionSourceMetadata,
  tacticalProjectionDataAttributes,
} from './HexMapDisplay.tacticalProjectionAttributes';

export {
  formatMovementModeTitle,
  formatMovementReachBadgeLabel,
  formatMovementReachBadgeTitle,
  MovementReachBadge,
} from './HexCell.movementReachBadge';

const formatElevationDeltaLabel = (elevationDelta: number): string =>
  elevationDelta > 0 ? `UP${elevationDelta}` : `DN${Math.abs(elevationDelta)}`;

function formatMovementStepCostLabel(
  movementInfo: IMovementRangeHex,
): string | null {
  const labels: string[] = [];
  const {
    elevationCost,
    elevationDelta = 0,
    terrainCost,
    turningCost,
  } = movementInfo;
  const hasElevationDelta = elevationDelta !== 0;
  if (terrainCost && terrainCost > 0) labels.push(`T+${terrainCost}`);
  if (turningCost && turningCost > 0) labels.push(`TURN+${turningCost}`);
  if (elevationCost !== undefined && (elevationCost > 0 || hasElevationDelta)) {
    labels.push(`E+${elevationCost}`);
  }
  if (hasElevationDelta) labels.push(formatElevationDeltaLabel(elevationDelta));
  return labels.length > 0 ? labels.join(' ') : null;
}

function formatMovementStepCostTitle(movementInfo: IMovementRangeHex): string {
  const labels: string[] = [];
  const {
    elevationCost,
    elevationDelta = 0,
    terrainCost,
    turningCost,
  } = movementInfo;
  const hasElevationDelta = elevationDelta !== 0;
  if (terrainCost && terrainCost > 0) labels.push(`terrain +${terrainCost}`);
  if (turningCost && turningCost > 0) labels.push(`turning +${turningCost}`);
  if (elevationCost !== undefined && (elevationCost > 0 || hasElevationDelta)) {
    labels.push(`elevation cost +${elevationCost}`);
  }
  if (hasElevationDelta) {
    labels.push(
      `elevation delta ${elevationDelta > 0 ? '+' : ''}${elevationDelta}`,
    );
  }
  return `Movement step cost: ${labels.join('; ')}`;
}

function formatStandUpBadgeLabel(movementInfo: IMovementRangeHex): string {
  const prefix = movementInfo.standUpMode === 'careful' ? 'C-STAND' : 'STAND';
  if (movementInfo.standUpPsrImpossibleReason) return `${prefix} IMP`;
  const cost =
    movementInfo.standUpCost === undefined
      ? prefix
      : `${prefix} ${movementInfo.standUpCost}MP`;
  if (!movementInfo.standUpPsrRequired) return cost;
  if (movementInfo.standUpPsrTargetNumber === undefined) return `${cost} PSR`;
  return `${cost} PSR${movementInfo.standUpPsrTargetNumber}`;
}

function formatStandUpBadgeTitle(movementInfo: IMovementRangeHex): string {
  const details: string[] = [];
  if (movementInfo.standUpPsrImpossibleReason) {
    details.push(movementInfo.standUpPsrImpossibleReason);
  }
  if (movementInfo.standUpCost !== undefined) {
    details.push(
      `${movementInfo.standUpMode === 'careful' ? 'careful stand' : 'stand-up'} cost ${movementInfo.standUpCost} MP`,
    );
  }
  if (
    !movementInfo.standUpPsrRequired &&
    movementInfo.standUpPsrAutomaticSuccessReason
  ) {
    details.push(`${movementInfo.standUpPsrAutomaticSuccessReason}; no PSR`);
  }
  if (movementInfo.standUpPsrRequired) {
    if (movementInfo.standUpPsrImpossibleReason) {
      details.push('PSR impossible');
    } else {
      details.push(
        movementInfo.standUpPsrTargetNumber === undefined
          ? 'PSR required'
          : `PSR required TN ${movementInfo.standUpPsrTargetNumber}`,
      );
    }
  }
  if (
    movementInfo.standUpPsrModifier !== undefined &&
    movementInfo.standUpPsrModifier !== 0
  ) {
    details.push(
      `stand-up modifier ${movementInfo.standUpPsrModifier >= 0 ? '+' : ''}${movementInfo.standUpPsrModifier}`,
    );
  }
  if (movementInfo.standUpPsrModifierDetails?.length) {
    details.push(movementInfo.standUpPsrModifierDetails.join('; '));
  }
  return movementInfo.standUpPsrImpossibleReason
    ? `Cannot stand before moving: ${details.join('; ')}`
    : `${movementInfo.standUpMode === 'careful' ? 'Careful stand' : 'Must stand'} before moving: ${details.join('; ')}`;
}

function formatHullDownExitBadgeLabel(movementInfo: IMovementRangeHex): string {
  return movementInfo.hullDownExitCost === undefined
    ? 'HD-UP'
    : `HD-UP ${movementInfo.hullDownExitCost}MP`;
}

function formatHullDownExitBadgeTitle(movementInfo: IMovementRangeHex): string {
  return `Must exit hull-down before moving: posture exit cost ${movementInfo.hullDownExitCost ?? '?'} MP`;
}

function formatAutomaticLandingBadgeTitle(
  movementInfo: IMovementRangeHex,
): string {
  const mode = movementInfo.automaticLandingMode
    ? formatMovementModeTitleLabel(movementInfo.automaticLandingMode)
    : 'WiGE';
  const reason = movementInfo.automaticLandingReason
    ? `: ${movementInfo.automaticLandingReason}`
    : '';
  return `Automatic ${mode} landing after ${
    movementInfo.automaticLandingDistance ?? 0
  }/${movementInfo.automaticLandingMinimumDistance ?? 0} hexes${reason}`;
}

export function MovementAutomaticLandingBadge({
  x,
  y,
  hex,
  movementInfo,
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly movementInfo?: IMovementRangeHex;
}): React.ReactElement | null {
  if (!movementInfo?.automaticLandingRequired) return null;
  const title = formatAutomaticLandingBadgeTitle(movementInfo);
  return (
    <HexCellSvgTextBadge
      testId={`hex-automatic-landing-badge-${hex.q}-${hex.r}`}
      title={title}
      label="LAND"
      dataAttributes={{
        'data-automatic-landing-mode': movementInfo.automaticLandingMode,
        'data-automatic-landing-distance':
          movementInfo.automaticLandingDistance,
        'data-automatic-landing-minimum-distance':
          movementInfo.automaticLandingMinimumDistance,
        'data-automatic-landing-reason': movementInfo.automaticLandingReason,
      }}
      rect={{
        x: x - 19,
        y: y + 33,
        width: 38,
        height: 12,
        rx: 3,
        fill: '#7c2d12',
        opacity: 0.92,
        stroke: '#fed7aa',
        strokeOpacity: 0.65,
        strokeWidth: 0.7,
      }}
      text={{
        x,
        y: y + 42,
        fontSize: 8,
        fontWeight: 'bold',
        fill: '#fff7ed',
      }}
    />
  );
}

export function MovementStepCostBadge({
  x,
  y,
  hex,
  movementInfo,
  projectionExplanation,
  sourceReferences,
}: MovementProjectionBadgeProps): React.ReactElement | null {
  if (!movementInfo?.reachable) return null;
  const label = formatMovementStepCostLabel(movementInfo);
  if (!label) return null;

  const title = formatMovementStepCostTitle(movementInfo);
  const width = Math.max(28, label.length * 5.4 + 8);
  const source = movementProjectionSourceMetadata(sourceReferences);
  return (
    <HexCellSvgTextBadge
      testId={`hex-movement-cost-badge-${hex.q}-${hex.r}`}
      title={title}
      label={label}
      dataAttributes={{
        ...tacticalProjectionDataAttributes(source),
        'data-movement-step-terrain-cost': movementInfo.terrainCost,
        'data-movement-step-turning-cost': movementInfo.turningCost,
        'data-movement-step-elevation-cost': movementInfo.elevationCost,
        'data-movement-step-elevation-delta': movementInfo.elevationDelta,
        'data-movement-step-source-refs': source.sourceRefs,
        'data-movement-step-rule-refs': source.ruleRefs,
        'data-movement-step-projection-explanation': projectionExplanation,
      }}
      rect={{
        x: x - width - 3,
        y: y + 20,
        width,
        height: 12,
        rx: 3,
        fill: '#365314',
        opacity: 0.9,
      }}
      text={{
        x: x - width / 2 - 3,
        y: y + 29,
        fontSize: 8,
        fontWeight: 'bold',
        fill: '#f7fee7',
      }}
    />
  );
}

export function MovementStandUpBadge({
  x,
  y,
  hex,
  movementInfo,
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly movementInfo?: IMovementRangeHex;
}): React.ReactElement | null {
  if (!movementInfo?.standUpRequired && !movementInfo?.hullDownExitRequired) {
    return null;
  }

  const label = movementInfo.hullDownExitRequired
    ? formatHullDownExitBadgeLabel(movementInfo)
    : formatStandUpBadgeLabel(movementInfo);
  const title = movementInfo.hullDownExitRequired
    ? formatHullDownExitBadgeTitle(movementInfo)
    : formatStandUpBadgeTitle(movementInfo);
  const width = Math.max(42, label.length * 5.2 + 10);
  return (
    <HexCellSvgTextBadge
      testId={`hex-stand-up-badge-${hex.q}-${hex.r}`}
      title={title}
      label={label}
      dataAttributes={{
        'data-stand-up-mode': movementInfo.standUpMode,
        'data-stand-up-cost': movementInfo.standUpCost,
        'data-stand-up-psr-required': movementInfo.standUpPsrRequired
          ? 'true'
          : 'false',
        'data-stand-up-psr-target': movementInfo.standUpPsrTargetNumber,
        'data-stand-up-psr-modifier': movementInfo.standUpPsrModifier,
        'data-stand-up-psr-modifier-details':
          movementInfo.standUpPsrModifierDetails?.join('|'),
        'data-stand-up-psr-impossible-reason':
          movementInfo.standUpPsrImpossibleReason,
        'data-stand-up-psr-automatic-success-reason':
          movementInfo.standUpPsrAutomaticSuccessReason,
        'data-hull-down-exit-required': movementInfo.hullDownExitRequired
          ? 'true'
          : undefined,
        'data-hull-down-exit-cost': movementInfo.hullDownExitCost,
      }}
      rect={{
        x: x - width / 2,
        y: y + 33,
        width,
        height: 12,
        rx: 3,
        fill: '#854d0e',
        opacity: 0.92,
      }}
      text={{
        x,
        y: y + 42,
        fontSize: 8,
        fontWeight: 'bold',
        fill: '#fefce8',
      }}
    />
  );
}

function formatMovementPathStepLabel(pathIndex: number): string {
  return pathIndex === 0 ? 'S' : `#${pathIndex}`;
}

function formatMovementPathStepTitle(pathIndex: number): string {
  return pathIndex === 0
    ? 'Movement path start'
    : `Movement path step ${pathIndex}`;
}

export function MovementPathStepBadge({
  x,
  y,
  hex,
  pathIndex,
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly pathIndex?: number;
}): React.ReactElement | null {
  if (pathIndex === undefined) return null;

  const label = formatMovementPathStepLabel(pathIndex);
  const title = formatMovementPathStepTitle(pathIndex);
  const width = Math.max(20, label.length * 6 + 8);

  return (
    <HexCellSvgTextBadge
      testId={`hex-path-step-badge-${hex.q}-${hex.r}`}
      title={title}
      label={label}
      dataAttributes={{
        'data-path-index': pathIndex,
        'data-path-step': pathIndex === 0 ? 'start' : pathIndex,
      }}
      rect={{
        x: x + 14,
        y: y - 21,
        width,
        height: 14,
        rx: 3,
        fill: '#1d4ed8',
        opacity: 0.94,
        stroke: '#dbeafe',
        strokeOpacity: 0.7,
        strokeWidth: 0.75,
      }}
      text={{
        x: x + 14 + width / 2,
        y: y - 11,
        fontSize: 9,
        fontWeight: 'bold',
        fill: '#eff6ff',
      }}
    />
  );
}
