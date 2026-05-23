import React from 'react';

import type { IHexCoordinate, IMovementRangeHex } from '@/types/gameplay';

import {
  formatMovementModeTitle,
  formatMovementReachBadgeLabel,
} from './HexCell.movementBadges';

export function MovementHoverCostBadge({
  x,
  y,
  hex,
  hoverMpCost,
  movementInfo,
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly hoverMpCost?: number;
  readonly movementInfo?: IMovementRangeHex;
}): React.ReactElement | null {
  if (hoverMpCost === undefined) return null;

  const label = movementInfo
    ? formatMovementReachBadgeLabel({ ...movementInfo, mpCost: hoverMpCost })
    : `${hoverMpCost}MP`;
  const title = movementInfo
    ? `${formatMovementModeTitle(movementInfo)} path preview: ${hoverMpCost} MP`
    : `Movement path preview: ${hoverMpCost} MP`;
  const width = Math.max(34, label.length * 5.6 + 10);

  return (
    <g
      pointerEvents="none"
      data-testid={`hex-mp-badge-${hex.q}-${hex.r}`}
      aria-label={title}
      data-hover-mp-cost={hoverMpCost}
      data-movement-badge-type={movementInfo?.movementType}
      data-movement-badge-mode={movementInfo?.movementMode}
      data-movement-badge-heat-generated={movementInfo?.heatGenerated}
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
