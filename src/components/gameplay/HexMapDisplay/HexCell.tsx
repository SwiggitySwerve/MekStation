import React from 'react';

import type {
  IHexCoordinate,
  IMovementRangeHex,
  IHexTerrain,
} from '@/types/gameplay';

import { TerrainArtLayer } from '@/components/gameplay/terrain/TerrainArtLayer';
import { HEX_COLORS } from '@/constants/hexMap';
import { MovementType } from '@/types/gameplay';

/**
 * Per `add-movement-phase-ui` task 3.4: when jump-range tiles render
 * they need a distinct diagonal-hatch pattern on top of the blue
 * tint so the player can visually distinguish "land here by
 * jumping" from "walk/run here." The pattern id is defined in
 * `Overlays.tsx` under <TerrainPatternDefs> so every HexCell can
 * reference it by URL.
 */
const JUMP_PATTERN_URL = 'url(#pattern-jump-range)';

/**
 * Per `add-movement-phase-ui` task 3.2-3.4: pick the per-type tile
 * color (green = walk, yellow = run, blue = jump). Falls back to the
 * uniform `movementRange` color for legacy callers that don't set a
 * type or use Stationary.
 */
function colorForMovementType(type: MovementType): string {
  switch (type) {
    case MovementType.Walk:
      return HEX_COLORS.movementRangeWalk;
    case MovementType.Run:
      return HEX_COLORS.movementRangeRun;
    case MovementType.Jump:
      return HEX_COLORS.movementRangeJump;
    default:
      return HEX_COLORS.movementRange;
  }
}

import {
  hexToPixel,
  hexPath,
  getTerrainFill,
  getPrimaryTerrainFeature,
} from './renderHelpers';

export interface HexCellProps {
  hex: IHexCoordinate;
  terrain?: IHexTerrain;
  /**
   * Per `add-terrain-rendering` tasks 4-5: the terrain art layer
   * needs access to neighbor elevations to render contour edges and
   * to keep the visual-key lookup consistent with the parent map.
   * `HexMapDisplay` already maintains this Map; `HexCell` threads it
   * through to `TerrainArtLayer` without re-deriving it per cell.
   *
   * Optional: when omitted (legacy / test callers), the cell renders
   * without terrain art — the flat polygon stands alone exactly like
   * the Phase 1 MVP.
   */
  terrainLookup?: ReadonlyMap<string, IHexTerrain>;
  isSelected: boolean;
  isHovered: boolean;
  movementInfo?: IMovementRangeHex;
  isInAttackRange: boolean;
  isInPath: boolean;
  showCoordinate: boolean;
  /**
   * Per `add-movement-phase-ui` § 4.3: when the user hovers a
   * reachable hex the destination tile shows the cumulative MP cost
   * in a readable badge. We pass the MP cost explicitly (rather than
   * lifting it off `movementInfo`) because the path-preview feature
   * must display the number even when the hovered tile is the path
   * terminus with pathHighlight overlay.
   */
  hoverMpCost?: number;
  /**
   * Per § 4.4 / spec delta "Hover unreachable hex shows tooltip":
   * when the user hovers a hex outside the reachable set we surface
   * the canonical `"Unreachable"` tooltip. The cell itself doesn't
   * render the tooltip DOM — the parent `HexMapDisplay` renders a
   * shared tooltip layer — but we mark the cell with
   * `data-unreachable` so the tooltip layer can key off it.
   */
  isUnreachableHover?: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const HexCell = React.memo(function HexCell({
  hex,
  terrain,
  terrainLookup,
  isSelected,
  isHovered,
  movementInfo,
  isInAttackRange,
  isInPath,
  showCoordinate,
  hoverMpCost,
  isUnreachableHover,
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

  // Reasoning: path-preview wins over the type-tint so the player can
  // always see where the planned path lands, even when the hex is
  // also part of the walk/run/jump reachable envelope (which it
  // always is — you can't draw a path to an unreachable hex).
  if (isSelected) {
    overlayFill = HEX_COLORS.hexSelected;
    overlayOpacity = 0.7;
  } else if (isInPath) {
    overlayFill = HEX_COLORS.pathHighlight;
    overlayOpacity = 0.6;
  } else if (movementInfo) {
    overlayFill = movementInfo.reachable
      ? colorForMovementType(movementInfo.movementType)
      : HEX_COLORS.movementRangeUnreachable;
    overlayOpacity = 0.5;
  } else if (isInAttackRange) {
    overlayFill = HEX_COLORS.attackRange;
    overlayOpacity = 0.5;
  } else if (isHovered) {
    overlayFill = HEX_COLORS.hexHover;
    overlayOpacity = 0.4;
  }

  const isJumpTile =
    movementInfo?.reachable && movementInfo.movementType === MovementType.Jump;

  /*
   * Per `add-terrain-rendering` task 5: the terrain art layer
   * renders BENEATH the hex polygon. When art is present the
   * polygon fill becomes transparent so the art shows through, but
   * the polygon keeps its grid stroke AND stays the primary
   * hit-test target (pointer events fire on the polygon via the
   * enclosing <g>). When `terrainLookup` is absent we fall back to
   * the Phase 1 MVP flat color.
   */
  const hasTerrainArt = Boolean(terrainLookup);
  const polygonFill = hasTerrainArt ? 'transparent' : terrainFill;
  return (
    <g
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: 'pointer' }}
      data-testid={`hex-${hex.q}-${hex.r}`}
      data-unreachable={isUnreachableHover ? 'true' : undefined}
      data-reachable={movementInfo?.reachable ? 'true' : undefined}
      data-movement-type={movementInfo?.movementType}
    >
      {hasTerrainArt && terrainLookup && (
        <TerrainArtLayer
          hex={hex}
          terrain={terrain}
          terrainLookup={terrainLookup}
        />
      )}
      <path
        d={pathD}
        fill={polygonFill}
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
      {isJumpTile && !isInPath && (
        <path
          d={pathD}
          fill={JUMP_PATTERN_URL}
          opacity={0.6}
          pointerEvents="none"
          data-testid={`jump-pattern-${hex.q}-${hex.r}`}
        />
      )}
      {showCoordinate && (
        <text x={x} y={y + 4} textAnchor="middle" fontSize={10} fill="#64748b">
          {hex.q},{hex.r}
        </text>
      )}
      {movementInfo && movementInfo.reachable && hoverMpCost === undefined && (
        <text x={x} y={y + 12} textAnchor="middle" fontSize={8} fill="#166534">
          {movementInfo.mpCost}MP
        </text>
      )}
      {hoverMpCost !== undefined && (
        <g pointerEvents="none" data-testid={`hex-mp-badge-${hex.q}-${hex.r}`}>
          <rect
            x={x - 14}
            y={y + 6}
            width={28}
            height={12}
            rx={3}
            fill="#1e293b"
            opacity={0.9}
          />
          <text
            x={x}
            y={y + 15}
            textAnchor="middle"
            fontSize={9}
            fontWeight="bold"
            fill="#f8fafc"
          >
            {hoverMpCost} MP
          </text>
        </g>
      )}
    </g>
  );
});
