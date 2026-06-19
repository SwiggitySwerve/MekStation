import React from 'react';

import type { IMovementRangeHex } from '@/types/gameplay';

import {
  HexCellSvgTextBadge,
  type MovementProjectionBadgeProps,
} from './HexCell.badgePrimitives';
import {
  formatMovementModeTitle,
  formatMovementReachBadgeLabel,
} from './HexCell.movementBadges';
import {
  movementProjectionSourceMetadata,
  tacticalProjectionDataAttributes,
} from './HexMapDisplay.tacticalProjectionAttributes';

function formatSignedCost(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

function formatPathPreviewTitle(
  movementInfo: IMovementRangeHex | undefined,
  hoverMpCost: number,
): string {
  if (!movementInfo) return `Movement path preview: ${hoverMpCost} MP`;

  const details = [
    `${formatMovementModeTitle({ ...movementInfo, mpCost: hoverMpCost })} path preview: ${hoverMpCost} MP`,
  ];
  if (movementInfo.terrainCost !== undefined) {
    details.push(`terrain ${formatSignedCost(movementInfo.terrainCost)}`);
  }
  if (
    movementInfo.elevationDelta !== undefined ||
    movementInfo.elevationCost !== undefined
  ) {
    const elevationDetails: string[] = [];
    if (movementInfo.elevationDelta !== undefined) {
      elevationDetails.push(
        `delta ${formatSignedCost(movementInfo.elevationDelta)}`,
      );
    }
    if (movementInfo.elevationCost !== undefined) {
      elevationDetails.push(
        `cost ${formatSignedCost(movementInfo.elevationCost)}`,
      );
    }
    details.push(`elevation ${elevationDetails.join(' ')}`);
  }
  if (movementInfo.heatGenerated !== undefined) {
    details.push(`heat ${formatSignedCost(movementInfo.heatGenerated)}`);
  }

  return details.join('; ');
}

export function MovementHoverCostBadge({
  x,
  y,
  hex,
  hoverMpCost,
  movementInfo,
  projectionExplanation,
  sourceReferences,
}: MovementProjectionBadgeProps & {
  readonly hoverMpCost?: number;
}): React.ReactElement | null {
  if (hoverMpCost === undefined) return null;

  const activeMovementInfo = movementInfo
    ? {
        ...movementInfo,
        movementModeOptions: undefined,
        mpCost: hoverMpCost,
      }
    : undefined;
  const label = activeMovementInfo
    ? formatMovementReachBadgeLabel(activeMovementInfo)
    : `${hoverMpCost}MP`;
  const title = formatPathPreviewTitle(movementInfo, hoverMpCost);
  const width = Math.max(34, label.length * 5.6 + 10);
  const source = movementProjectionSourceMetadata(sourceReferences);

  return (
    <HexCellSvgTextBadge
      title={title}
      label={label}
      testId={`hex-mp-badge-${hex.q}-${hex.r}`}
      dataAttributes={{
        ...tacticalProjectionDataAttributes(source),
        'data-hover-mp-cost': hoverMpCost,
        'data-movement-badge-type': movementInfo?.movementType,
        'data-movement-badge-mode': movementInfo?.movementMode,
        'data-movement-badge-terrain-cost': movementInfo?.terrainCost,
        'data-movement-badge-elevation-delta': movementInfo?.elevationDelta,
        'data-movement-badge-elevation-cost': movementInfo?.elevationCost,
        'data-movement-badge-heat-generated': movementInfo?.heatGenerated,
        'data-movement-badge-source-refs': source.sourceRefs,
        'data-movement-badge-rule-refs': source.ruleRefs,
        'data-movement-badge-projection-explanation': projectionExplanation,
      }}
      rect={{
        x: x - width / 2,
        y: y + 6,
        width,
        height: 12,
        rx: 3,
        fill: '#1e293b',
        opacity: 0.9,
      }}
      text={{
        x,
        y: y + 15,
        fontSize: 8,
        fontWeight: 'bold',
        fill: '#f8fafc',
      }}
    />
  );
}
