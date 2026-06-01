import React from 'react';

import type { IHexCoordinate, IMovementRangeHex } from '@/types/gameplay';
import type { ITacticalMapProjectionSourceReference } from '@/utils/gameplay/tacticalMapProjection';

import {
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

import {
  formatMovementModeTitle,
  formatMovementReachBadgeLabel,
} from './HexCell.movementBadges';

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
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly hoverMpCost?: number;
  readonly movementInfo?: IMovementRangeHex;
  readonly projectionExplanation?: string;
  readonly sourceReferences?: readonly ITacticalMapProjectionSourceReference[];
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
  const movementSourceReferences =
    sourceReferences?.filter((source) => source.channel === 'movement') ?? [];
  const movementSourceRefsAttribute =
    formatTacticalProjectionSourceReferences(movementSourceReferences) ||
    undefined;
  const movementRuleRefsAttribute =
    formatTacticalProjectionRuleReferences(movementSourceReferences) ||
    undefined;
  const movementProjectionChannel =
    movementSourceReferences.length > 0 ? 'movement' : undefined;

  return (
    <g
      pointerEvents="none"
      data-testid={`hex-mp-badge-${hex.q}-${hex.r}`}
      aria-label={title}
      data-tactical-projection-source={
        movementProjectionChannel ? 'shared-tactical-map-projection' : undefined
      }
      data-tactical-projection-channel={movementProjectionChannel}
      data-tactical-rules-surface={movementProjectionChannel}
      data-hover-mp-cost={hoverMpCost}
      data-movement-badge-type={movementInfo?.movementType}
      data-movement-badge-mode={movementInfo?.movementMode}
      data-movement-badge-terrain-cost={movementInfo?.terrainCost}
      data-movement-badge-elevation-delta={movementInfo?.elevationDelta}
      data-movement-badge-elevation-cost={movementInfo?.elevationCost}
      data-movement-badge-heat-generated={movementInfo?.heatGenerated}
      data-movement-badge-source-refs={movementSourceRefsAttribute}
      data-movement-badge-rule-refs={movementRuleRefsAttribute}
      data-movement-badge-projection-explanation={projectionExplanation}
    >
      <title>{title}</title>
      <rect
        x={x - width / 2}
        y={y + 6}
        width={width}
        height={12}
        rx={3}
        fill="#1e293b"
        opacity={0.9}
      />
      <text
        x={x}
        y={y + 15}
        textAnchor="middle"
        fontSize={8}
        fontWeight="bold"
        fill="#f8fafc"
      >
        {label}
      </text>
    </g>
  );
}
