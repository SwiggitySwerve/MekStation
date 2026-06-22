import React from 'react';

import type {
  IHexCoordinate,
  IHexTerrain,
  ICombatRangeHex,
  IMovementRangeHex,
} from '@/types/gameplay';

import { TERRAIN_COLORS } from '@/constants/terrain';
import { TerrainType } from '@/types/gameplay';
import { CoverLevel } from '@/types/gameplay/TerrainTypes';

import {
  coverProjectionOverlayAttributes,
  coverProjectionOverlayLevel,
  coverProjectionOverlayTitleParts,
} from './CoverOverlay.projection';
import {
  formatElevationLabel,
  formatTerrainFeaturesLabel,
} from './HexCell.labels';
import {
  movementCostBandFill,
  movementCostBandFor,
  movementProjectionOverlayAttributes,
  movementProjectionOverlayTitleParts,
} from './MovementCostOverlay.projection';
import {
  hexToPixel,
  getPrimaryTerrainFeature,
  getTerrainMovementCost,
  getTerrainCoverLevel,
} from './renderHelpers';

export interface MovementCostOverlayProps {
  hex: IHexCoordinate;
  terrain: IHexTerrain | undefined;
  movementInfo?: IMovementRangeHex;
  projectionExplanation?: string;
}

export const MovementCostOverlay = React.memo(function MovementCostOverlay({
  hex,
  terrain,
  movementInfo,
  projectionExplanation,
}: MovementCostOverlayProps): React.ReactElement {
  const { x, y } = hexToPixel(hex);
  const cost = getTerrainMovementCost(terrain);
  const costBand = movementCostBandFor(cost);
  const costBandFill = movementCostBandFill(costBand);
  const terrainTypes = terrain?.features.map((feature) => feature.type) ?? [];
  const terrainLabel = formatTerrainFeaturesLabel(terrainTypes);
  const elevation = terrain?.elevation ?? 0;
  const elevationLabel = formatElevationLabel(elevation);
  const title = [
    `Terrain movement cost ${cost}`,
    `terrain ${terrainLabel}`,
    `elevation ${elevationLabel}`,
    ...movementProjectionOverlayTitleParts({
      movementInfo,
      projectionExplanation,
    }),
  ]
    .filter(Boolean)
    .join('; ');
  const movementProjectionAttributes = movementProjectionOverlayAttributes(
    movementInfo,
    projectionExplanation,
  );

  return (
    <g
      pointerEvents="none"
      data-testid={`movement-cost-overlay-hex-${hex.q}-${hex.r}`}
      data-terrain-movement-cost={cost}
      data-terrain-features={
        terrainTypes.length > 0 ? terrainTypes.join(',') : undefined
      }
      data-terrain-movement-cost-band={costBand}
      data-terrain-movement-cost-fill={costBandFill}
      data-elevation={elevation}
      aria-label={title}
      {...movementProjectionAttributes}
    >
      <title>{title}</title>
      <circle
        cx={x}
        cy={y}
        r={12}
        fill={costBandFill}
        stroke="#1e293b"
        strokeWidth={1.5}
        opacity={0.88}
      />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fontSize={9}
        fontWeight="bold"
        fill="#f8fafc"
      >
        T{cost}
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
  combatInfo?: ICombatRangeHex;
  projectionExplanation?: string;
}

export const CoverOverlay = React.memo(function CoverOverlay({
  hex,
  terrain,
  combatInfo,
  projectionExplanation,
}: CoverOverlayProps): React.ReactElement | null {
  const { x, y } = hexToPixel(hex);
  const terrainCoverLevel = getTerrainCoverLevel(terrain);
  const coverLevel =
    coverProjectionOverlayLevel(combatInfo) ?? terrainCoverLevel;
  if (coverLevel === CoverLevel.None) return null;

  const coverLabel = formatCoverOverlayLabel(coverLevel);
  const terrainTypes = terrain?.features.map((feature) => feature.type) ?? [];
  const terrainLabel = formatTerrainFeaturesLabel(terrainTypes);
  const elevation = terrain?.elevation ?? 0;
  const elevationLabel = formatElevationLabel(elevation);
  const primaryTerrain = getPrimaryTerrainFeature(terrain)?.type ?? 'clear';
  const coverTitle = formatCoverOverlayTitle(
    coverLevel,
    terrainLabel,
    elevationLabel,
    coverProjectionOverlayTitleParts({
      combatInfo,
      projectionExplanation,
    }),
  );
  const coverProjectionAttributes = coverProjectionOverlayAttributes({
    combatInfo,
    projectionExplanation,
  });

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
  }

  return (
    <g
      pointerEvents="none"
      data-testid={`cover-overlay-hex-${hex.q}-${hex.r}`}
      data-cover-level={coverLevel}
      data-terrain-cover-level={terrainCoverLevel}
      data-cover-source-terrain={primaryTerrain}
      data-terrain-features={
        terrainTypes.length > 0 ? terrainTypes.join(',') : 'clear'
      }
      data-elevation={elevation}
      aria-label={coverTitle}
      {...coverProjectionAttributes}
    >
      <title>{coverTitle}</title>
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
      <rect
        x={x - 17}
        y={y + 9}
        width={34}
        height={11}
        rx={3}
        fill="#0f172a"
        fillOpacity={0.86}
      />
      <text
        x={x}
        y={y + 17}
        textAnchor="middle"
        fontSize={7}
        fontWeight="bold"
        fill="#f8fafc"
      >
        {coverLabel}
      </text>
    </g>
  );
});

function formatCoverOverlayLabel(coverLevel: CoverLevel): string {
  switch (coverLevel) {
    case CoverLevel.Full:
      return 'FULL';
    case CoverLevel.Partial:
      return 'PART';
    case CoverLevel.None:
      return 'NONE';
  }
}

function formatCoverOverlayBaseTitle(coverLevel: CoverLevel): string {
  switch (coverLevel) {
    case CoverLevel.Full:
      return 'Full cover';
    case CoverLevel.Partial:
      return 'Partial cover';
    case CoverLevel.None:
      return 'No cover';
  }
}

function formatCoverOverlayTitle(
  coverLevel: CoverLevel,
  terrainLabel: string,
  elevationLabel: string,
  projectionTitleParts: readonly string[] = [],
): string {
  return [
    formatCoverOverlayBaseTitle(coverLevel),
    `terrain ${terrainLabel}`,
    `elevation ${elevationLabel}`,
    ...projectionTitleParts,
  ]
    .filter(Boolean)
    .join('; ');
}

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
      {/*
        Per `add-movement-phase-ui` task 3.4 / spec "Jump-range tiles
        rendered blue with pattern": landing hexes reachable via jump
        are tinted blue AND overlaid with a distinct diagonal hatch
        so the player can tell them apart from the attack-range tint
        or a selected hex at a glance. Pattern id consumed by
        `HexCell.tsx` via `url(#pattern-jump-range)`.
      */}
      <pattern
        id="pattern-jump-range"
        patternUnits="userSpaceOnUse"
        width="8"
        height="8"
        patternTransform="rotate(45)"
      >
        <rect width="8" height="8" fill="transparent" />
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="8"
          stroke="#1d4ed8"
          strokeWidth="1.5"
          opacity="0.7"
        />
      </pattern>
      <pattern
        id="pattern-blocked-movement"
        patternUnits="userSpaceOnUse"
        width="8"
        height="8"
      >
        <rect width="8" height="8" fill="transparent" />
        <path
          d="M0 0 8 8 M8 0 0 8"
          stroke="#0f172a"
          strokeWidth="1.25"
          opacity="0.65"
        />
        <path
          d="M4 0v8 M0 4h8"
          stroke="#f8fafc"
          strokeWidth="0.75"
          opacity="0.55"
        />
      </pattern>
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
