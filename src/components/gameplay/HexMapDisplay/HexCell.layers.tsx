import React from 'react';

import type { IHexCoordinate, IHexTerrain } from '@/types/gameplay';

import { TerrainArtLayer } from '@/components/gameplay/terrain/TerrainArtLayer';

import type { SvgDataAttributes } from './HexCell.overlayAttributes';
import type { IsometricTerrainOccluderInfo } from './projection';

const JUMP_PATTERN_URL = 'url(#pattern-jump-range)';
const BLOCKED_MOVEMENT_PATTERN_URL = 'url(#pattern-blocked-movement)';

export function HexCellTerrainArtLayer({
  hex,
  terrain,
  terrainLookup,
}: {
  readonly hex: IHexCoordinate;
  readonly terrain?: IHexTerrain;
  readonly terrainLookup?: ReadonlyMap<string, IHexTerrain>;
}): React.ReactElement | null {
  if (!terrainLookup) return null;
  return (
    <TerrainArtLayer
      hex={hex}
      terrain={terrain}
      terrainLookup={terrainLookup}
    />
  );
}

export function HexCellOverlayLayer({
  hex,
  pathD,
  hasOverlay,
  overlayFill,
  overlayOpacity,
  overlayAttributes,
  isLegacyAttackRangeFallback,
}: {
  readonly hex: IHexCoordinate;
  readonly pathD: string;
  readonly hasOverlay: boolean;
  readonly overlayFill: string | null;
  readonly overlayOpacity: number;
  readonly overlayAttributes: SvgDataAttributes;
  readonly isLegacyAttackRangeFallback: boolean;
}): React.ReactElement {
  return (
    <>
      {hasOverlay && overlayFill && (
        <path
          d={pathD}
          fill={overlayFill}
          opacity={overlayOpacity}
          pointerEvents="none"
          data-testid={`hex-overlay-${hex.q}-${hex.r}`}
          {...overlayAttributes}
        />
      )}
      {isLegacyAttackRangeFallback && (
        <path
          d={pathD}
          fill="none"
          stroke="#334155"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={0.9}
          pointerEvents="none"
          data-testid={`hex-legacy-range-outline-${hex.q}-${hex.r}`}
          aria-label={`Legacy range envelope for hex ${hex.q},${hex.r}; not weapon-backed`}
        />
      )}
    </>
  );
}

export function HexCellMovementEncodingLayers({
  hex,
  x,
  y,
  pathD,
  isJumpTile,
  isRunTile,
  isBlockedTile,
  isInPath,
}: {
  readonly hex: IHexCoordinate;
  readonly x: number;
  readonly y: number;
  readonly pathD: string;
  readonly isJumpTile: boolean;
  readonly isRunTile: boolean;
  readonly isBlockedTile: boolean;
  readonly isInPath: boolean;
}): React.ReactElement | null {
  if (isInPath) return null;
  return (
    <>
      {isJumpTile && (
        <path
          d={pathD}
          fill={JUMP_PATTERN_URL}
          opacity={0.6}
          pointerEvents="none"
          data-testid={`jump-pattern-${hex.q}-${hex.r}`}
        />
      )}
      {isBlockedTile && (
        <>
          <path
            d={pathD}
            fill={BLOCKED_MOVEMENT_PATTERN_URL}
            opacity={0.72}
            pointerEvents="none"
            data-testid={`blocked-movement-pattern-${hex.q}-${hex.r}`}
          />
          <g
            pointerEvents="none"
            data-testid={`blocked-movement-glyph-${hex.q}-${hex.r}`}
            aria-label={`Blocked movement marker for hex ${hex.q},${hex.r}`}
          >
            <rect
              x={x - 28}
              y={y + 11}
              width={16}
              height={14}
              rx={3}
              fill="#0f172a"
              fillOpacity={0.88}
              stroke="#f8fafc"
              strokeWidth={0.75}
            />
            <text
              x={x - 20}
              y={y + 21}
              textAnchor="middle"
              fontSize={10}
              fontWeight="bold"
              fill="#f8fafc"
            >
              !
            </text>
          </g>
        </>
      )}
      {isRunTile && (
        <path
          d={pathD}
          fill="none"
          stroke="#854d0e"
          strokeWidth={2}
          strokeDasharray="5 3"
          opacity={0.92}
          pointerEvents="none"
          data-testid={`run-range-outline-${hex.q}-${hex.r}`}
          aria-label={`Run-only movement marker for hex ${hex.q},${hex.r}`}
        />
      )}
    </>
  );
}

export function HexCellIsometricOccluderHighlight({
  hex,
  x,
  y,
  pathD,
  isIsometricOccluder,
  isometricOccluderInfo,
  occludedUnitIds,
  occlusionReasons,
  occluderElevationLabel,
}: {
  readonly hex: IHexCoordinate;
  readonly x: number;
  readonly y: number;
  readonly pathD: string;
  readonly isIsometricOccluder: boolean;
  readonly isometricOccluderInfo?: IsometricTerrainOccluderInfo;
  readonly occludedUnitIds?: string;
  readonly occlusionReasons?: string;
  readonly occluderElevationLabel: string;
}): React.ReactElement | null {
  if (!isIsometricOccluder || !isometricOccluderInfo) return null;
  return (
    <g
      pointerEvents="none"
      data-testid={`hex-isometric-occluder-highlight-${hex.q}-${hex.r}`}
      data-isometric-occludes-units={occludedUnitIds}
      data-isometric-occlusion-reasons={occlusionReasons}
      data-isometric-occluder-rotation-step={isometricOccluderInfo.rotationStep}
      aria-label={`Tall elevation ${occluderElevationLabel} may hide units ${occludedUnitIds}`}
    >
      <title>
        {`Tall elevation ${occluderElevationLabel} may hide units ${occludedUnitIds}`}
      </title>
      <path
        d={pathD}
        fill="none"
        stroke="#38bdf8"
        strokeWidth={2.25}
        strokeDasharray="5 3"
        opacity={0.92}
      />
      <rect
        x={x - 18}
        y={y - 25}
        width={36}
        height={12}
        rx={2}
        fill="#0f172a"
        fillOpacity={0.88}
        stroke="#38bdf8"
        strokeWidth={0.75}
      />
      <text
        x={x}
        y={y - 16}
        textAnchor="middle"
        fontSize={8}
        fontWeight="bold"
        fill="#e0f2fe"
      >
        OCC
      </text>
    </g>
  );
}

export function HexCellCoordinateLabel({
  hex,
  x,
  y,
  showCoordinate,
}: {
  readonly hex: IHexCoordinate;
  readonly x: number;
  readonly y: number;
  readonly showCoordinate: boolean;
}): React.ReactElement | null {
  if (!showCoordinate) return null;
  return (
    <text x={x} y={y + 4} textAnchor="middle" fontSize={10} fill="#64748b">
      {hex.q},{hex.r}
    </text>
  );
}
