import React from 'react';

import type {
  IHexCoordinate,
  IMovementRangeHex,
  IHexTerrain,
} from '@/types/gameplay';

import { HEX_COLORS } from '@/constants/hexMap';

import {
  hexToPixel,
  hexPath,
  getTerrainFill,
  getPrimaryTerrainFeature,
} from './renderHelpers';

export interface HexCellProps {
  hex: IHexCoordinate;
  terrain?: IHexTerrain;
  isSelected: boolean;
  isHovered: boolean;
  movementInfo?: IMovementRangeHex;
  isInAttackRange: boolean;
  isInPath: boolean;
  showCoordinate: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const HexCell = React.memo(function HexCell({
  hex,
  terrain,
  isSelected,
  isHovered,
  movementInfo,
  isInAttackRange,
  isInPath,
  showCoordinate,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: HexCellProps): React.ReactElement {
  const { x, y } = hexToPixel(hex);
  const pathD = hexPath(x, y);

  const terrainFill = getTerrainFill(terrain);
  const primaryFeature = getPrimaryTerrainFeature(terrain);
  const terrainType = primaryFeature?.type ?? null;

  const hasOverlay =
    isSelected || isInPath || movementInfo || isInAttackRange || isHovered;
  let overlayFill: string | null = null;
  let overlayOpacity = 0.5;

  if (isSelected) {
    overlayFill = HEX_COLORS.hexSelected;
    overlayOpacity = 0.7;
  } else if (isInPath) {
    overlayFill = HEX_COLORS.pathHighlight;
    overlayOpacity = 0.6;
  } else if (movementInfo) {
    overlayFill = movementInfo.reachable
      ? HEX_COLORS.movementRange
      : HEX_COLORS.movementRangeUnreachable;
    overlayOpacity = 0.5;
  } else if (isInAttackRange) {
    overlayFill = HEX_COLORS.attackRange;
    overlayOpacity = 0.5;
  } else if (isHovered) {
    overlayFill = HEX_COLORS.hexHover;
    overlayOpacity = 0.4;
  }

  return (
    <g
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: 'pointer' }}
      data-testid={`hex-${hex.q}-${hex.r}`}
    >
      <path
        d={pathD}
        fill={terrainFill}
        stroke={HEX_COLORS.gridLine}
        strokeWidth={1}
        data-terrain={terrainType}
      />
      {hasOverlay && overlayFill && (
        <path
          d={pathD}
          fill={overlayFill}
          opacity={overlayOpacity}
          pointerEvents="none"
        />
      )}
      {showCoordinate && (
        <text x={x} y={y + 4} textAnchor="middle" fontSize={10} fill="#64748b">
          {hex.q},{hex.r}
        </text>
      )}
      {movementInfo && movementInfo.reachable && (
        <text x={x} y={y + 12} textAnchor="middle" fontSize={8} fill="#166534">
          {movementInfo.mpCost}MP
        </text>
      )}
    </g>
  );
});
