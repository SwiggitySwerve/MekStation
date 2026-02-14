import React from 'react';

import type { IHexCoordinate, IHexTerrain } from '@/types/gameplay';

import { TERRAIN_COLORS } from '@/constants/terrain';
import { TerrainType } from '@/types/gameplay';
import { CoverLevel } from '@/types/gameplay/TerrainTypes';

import {
  hexToPixel,
  getTerrainMovementCost,
  getTerrainCoverLevel,
} from './renderHelpers';

// =============================================================================
// MovementCostOverlay
// =============================================================================

export interface MovementCostOverlayProps {
  hex: IHexCoordinate;
  terrain: IHexTerrain | undefined;
}

export const MovementCostOverlay = React.memo(function MovementCostOverlay({
  hex,
  terrain,
}: MovementCostOverlayProps): React.ReactElement {
  const { x, y } = hexToPixel(hex);
  const cost = getTerrainMovementCost(terrain);

  return (
    <g pointerEvents="none">
      <circle cx={x} cy={y} r={12} fill="#1e293b" opacity={0.85} />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fontSize={11}
        fontWeight="bold"
        fill="#f8fafc"
      >
        {cost}
      </text>
    </g>
  );
});

// =============================================================================
// CoverOverlay
// =============================================================================

export interface CoverOverlayProps {
  hex: IHexCoordinate;
  terrain: IHexTerrain | undefined;
}

export const CoverOverlay = React.memo(function CoverOverlay({
  hex,
  terrain,
}: CoverOverlayProps): React.ReactElement {
  const { x, y } = hexToPixel(hex);
  const coverLevel = getTerrainCoverLevel(terrain);

  const shieldPath = `M${x},${y - 14} L${x - 10},${y - 6} L${x - 10},${y + 4} Q${x},${y + 14} ${x + 10},${y + 4} L${x + 10},${y - 6} Z`;

  let fillColor: string;
  let fillOpacity: number;
  switch (coverLevel) {
    case CoverLevel.Full:
      fillColor = '#22c55e';
      fillOpacity = 0.9;
      break;
    case CoverLevel.Partial:
      fillColor = '#eab308';
      fillOpacity = 0.8;
      break;
    default:
      fillColor = '#64748b';
      fillOpacity = 0.3;
  }

  return (
    <g pointerEvents="none">
      <path
        d={shieldPath}
        fill={fillColor}
        fillOpacity={fillOpacity}
        stroke="#1e293b"
        strokeWidth={1.5}
      />
      {coverLevel === CoverLevel.Partial && (
        <line
          x1={x - 8}
          y1={y}
          x2={x + 8}
          y2={y}
          stroke="#1e293b"
          strokeWidth={2}
        />
      )}
    </g>
  );
});

// =============================================================================
// LOSLine
// =============================================================================

export interface LOSLineProps {
  from: IHexCoordinate;
  to: IHexCoordinate;
  hasLOS: boolean;
}

export const LOSLine = React.memo(function LOSLine({
  from,
  to,
  hasLOS,
}: LOSLineProps): React.ReactElement {
  const fromPixel = hexToPixel(from);
  const toPixel = hexToPixel(to);

  return (
    <line
      x1={fromPixel.x}
      y1={fromPixel.y}
      x2={toPixel.x}
      y2={toPixel.y}
      stroke={hasLOS ? '#22c55e' : '#ef4444'}
      strokeWidth={2}
      strokeOpacity={0.6}
      strokeDasharray={hasLOS ? undefined : '4,4'}
      pointerEvents="none"
    />
  );
});

// =============================================================================
// TerrainPatternDefs
// =============================================================================

export function TerrainPatternDefs(): React.ReactElement {
  return (
    <defs>
      <pattern
        id="pattern-light-woods"
        patternUnits="userSpaceOnUse"
        width="12"
        height="12"
      >
        <rect
          width="12"
          height="12"
          fill={TERRAIN_COLORS[TerrainType.LightWoods]}
        />
        <circle cx="6" cy="6" r="3" fill="#4ade80" opacity="0.6" />
        <circle cx="0" cy="0" r="2" fill="#22c55e" opacity="0.4" />
        <circle cx="12" cy="12" r="2" fill="#22c55e" opacity="0.4" />
      </pattern>

      <pattern
        id="pattern-heavy-woods"
        patternUnits="userSpaceOnUse"
        width="10"
        height="10"
      >
        <rect
          width="10"
          height="10"
          fill={TERRAIN_COLORS[TerrainType.HeavyWoods]}
        />
        <circle cx="5" cy="5" r="4" fill="#15803d" opacity="0.7" />
        <circle cx="0" cy="0" r="3" fill="#166534" opacity="0.5" />
        <circle cx="10" cy="10" r="3" fill="#166534" opacity="0.5" />
        <circle cx="10" cy="0" r="2" fill="#14532d" opacity="0.4" />
        <circle cx="0" cy="10" r="2" fill="#14532d" opacity="0.4" />
      </pattern>

      <pattern
        id="pattern-rough"
        patternUnits="userSpaceOnUse"
        width="8"
        height="8"
      >
        <rect width="8" height="8" fill={TERRAIN_COLORS[TerrainType.Rough]} />
        <circle cx="2" cy="2" r="1.5" fill="#a8a29e" />
        <circle cx="6" cy="5" r="1" fill="#78716c" />
        <circle cx="4" cy="7" r="0.8" fill="#a8a29e" />
      </pattern>

      <pattern
        id="pattern-rubble"
        patternUnits="userSpaceOnUse"
        width="10"
        height="10"
      >
        <rect
          width="10"
          height="10"
          fill={TERRAIN_COLORS[TerrainType.Rubble]}
        />
        <polygon points="2,3 4,1 5,4" fill="#78716c" />
        <polygon points="6,7 8,5 9,8" fill="#57534e" />
        <polygon points="1,8 3,6 4,9" fill="#78716c" />
        <rect
          x="5"
          y="2"
          width="2"
          height="1.5"
          fill="#57534e"
          transform="rotate(15 6 2.75)"
        />
      </pattern>

      <pattern
        id="pattern-building"
        patternUnits="userSpaceOnUse"
        width="10"
        height="10"
      >
        <rect
          width="10"
          height="10"
          fill={TERRAIN_COLORS[TerrainType.Building]}
        />
        <line x1="0" y1="5" x2="10" y2="5" stroke="#57534e" strokeWidth="0.5" />
        <line x1="5" y1="0" x2="5" y2="10" stroke="#57534e" strokeWidth="0.5" />
        <rect x="1" y="1" width="3" height="3" fill="#44403c" opacity="0.3" />
        <rect x="6" y="6" width="3" height="3" fill="#44403c" opacity="0.3" />
      </pattern>
    </defs>
  );
}
