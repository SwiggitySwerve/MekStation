import React from 'react';

import type {
  ICombatRangeHex,
  IHexCoordinate,
  IMovementRangeHex,
  IHexTerrain,
  MapProjectionMode,
} from '@/types/gameplay';
import type {
  ITacticalMapProjectionSourceReference,
  ITacticalMapCombatLosBlockerReference,
  TacticalMapCombatProjectionStatus,
  TacticalMapHexProjectionIntent,
  TacticalMapHexProjectionStatus,
  TacticalMapMovementHazardProjectionStatus,
  TacticalMapMovementCostProjectionStatus,
  TacticalMapMovementProjectionStatus,
} from '@/utils/gameplay/tacticalMapProjection';

import { HEX_COLORS } from '@/constants/hexMap';
import { MovementType } from '@/types/gameplay';

import { HexCellBadgeStack } from './HexCell.badgeStack';
import {
  IsometricElevationStack,
  getIsometricElevationStackMetrics,
} from './HexCell.isometricStack';
import { formatElevationLabel } from './HexCell.labels';
import {
  HexCellCoordinateLabel,
  HexCellIsometricOccluderHighlight,
  HexCellMovementEncodingLayers,
  HexCellOverlayLayer,
  HexCellTerrainArtLayer,
} from './HexCell.layers';
import { deriveHexOverlayState } from './HexCell.overlayModel';
import { buildHexCellRenderModel } from './HexCell.renderModel';
import {
  isIsometricProjection,
  type IsometricTerrainOccluderInfo,
} from './projection';
import { hexToPixel, hexPath, getTerrainFill } from './renderHelpers';

function isJumpRangeTile(movementInfo?: IMovementRangeHex): boolean {
  return (
    movementInfo?.reachable === true &&
    movementInfo.movementType === MovementType.Jump
  );
}

function isRunRangeTile(movementInfo?: IMovementRangeHex): boolean {
  return (
    movementInfo?.reachable === true &&
    (movementInfo.movementType === MovementType.Run ||
      movementInfo.movementType === MovementType.Sprint ||
      movementInfo.movementType === MovementType.Evade)
  );
}

function isBlockedMovementTile(movementInfo?: IMovementRangeHex): boolean {
  return movementInfo !== undefined && movementInfo.reachable === false;
}

function hasRenderableIsometricOccluder(
  isIsometricTile: boolean,
  isometricOccluderInfo?: IsometricTerrainOccluderInfo,
): isometricOccluderInfo is IsometricTerrainOccluderInfo {
  return (
    isIsometricTile &&
    isometricOccluderInfo !== undefined &&
    isometricOccluderInfo.occludedUnitIds.length > 0
  );
}

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
  combatInfo?: ICombatRangeHex;
  combatLosBlockerFor?: readonly ITacticalMapCombatLosBlockerReference[];
  isInAttackRange: boolean;
  isInPath: boolean;
  pathIndex?: number;
  tacticalProjectionIntent?: TacticalMapHexProjectionIntent;
  tacticalProjectionStatus?: TacticalMapHexProjectionStatus;
  tacticalProjectionMovementStatus?: TacticalMapMovementProjectionStatus;
  tacticalProjectionMovementCostStatus?: TacticalMapMovementCostProjectionStatus;
  tacticalProjectionMovementCostReasons?: readonly string[];
  tacticalProjectionMovementHazardStatus?: TacticalMapMovementHazardProjectionStatus;
  tacticalProjectionMovementHazardReasons?: readonly string[];
  tacticalProjectionCombatStatus?: TacticalMapCombatProjectionStatus;
  tacticalProjectionBlockedReasons?: readonly string[];
  tacticalProjectionSourceReferences?: readonly ITacticalMapProjectionSourceReference[];
  tacticalProjectionExplanation?: string;
  isometricOccluderInfo?: IsometricTerrainOccluderInfo;
  showCoordinate: boolean;
  showElevationBadge?: boolean;
  projectionMode?: MapProjectionMode;
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
  /**
   * Audit 2026-06-09 G (W5.1a): the click/hover callbacks receive the
   * cell's own `hex` so the parent can pass ONE referentially stable
   * handler to every cell. The previous `() => void` contract forced
   * `renderHexCell` to allocate fresh per-hex arrow closures each
   * render, which defeated this component's `React.memo` on every
   * camera pan/zoom event.
   */
  onClick: (hex: IHexCoordinate) => void;
  onMouseEnter: (hex: IHexCoordinate) => void;
  onMouseLeave: () => void;
}

export const HexCell = React.memo(function HexCell({
  hex,
  terrain,
  terrainLookup,
  isSelected,
  isHovered,
  movementInfo,
  combatInfo,
  combatLosBlockerFor,
  isInAttackRange,
  isInPath,
  pathIndex,
  tacticalProjectionIntent,
  tacticalProjectionStatus,
  tacticalProjectionMovementStatus,
  tacticalProjectionMovementCostStatus,
  tacticalProjectionMovementCostReasons,
  tacticalProjectionMovementHazardStatus,
  tacticalProjectionMovementHazardReasons,
  tacticalProjectionCombatStatus,
  tacticalProjectionBlockedReasons,
  tacticalProjectionSourceReferences,
  tacticalProjectionExplanation,
  isometricOccluderInfo,
  showCoordinate,
  showElevationBadge = true,
  projectionMode = 'topDown',
  hoverMpCost,
  isUnreachableHover,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: HexCellProps): React.ReactElement {
  const { x, y } = hexToPixel(hex);
  const pathD = hexPath(x, y);

  const terrainFill = getTerrainFill(terrain);
  const terrainFeatures = terrain?.features ?? [];
  const elevation = terrain?.elevation ?? 0;
  const elevationLabel = formatElevationLabel(elevation);
  const isIsometricTile = isIsometricProjection(projectionMode);
  const elevationStackMetrics = getIsometricElevationStackMetrics({
    isIsometricTile,
    elevation,
    terrainFeatures,
  });

  const overlayState = deriveHexOverlayState({
    combatInfo,
    isHovered,
    isInAttackRange,
    isInPath,
    isSelected,
    movementInfo,
    tacticalProjectionCombatStatus,
    tacticalProjectionSourceReferences,
  });
  const hasOverlay = overlayState.hasOverlay;
  const overlayFill = overlayState.fill;
  const overlayOpacity = overlayState.opacity;

  const isLegacyAttackRangeFallback = overlayState.isLegacyAttackRangeFallback;
  const isJumpTile = isJumpRangeTile(movementInfo);
  const isRunTile = isRunRangeTile(movementInfo);
  const isBlockedTile = isBlockedMovementTile(movementInfo);
  const isIsometricOccluder = hasRenderableIsometricOccluder(
    isIsometricTile,
    isometricOccluderInfo,
  );
  const occluderElevationLabel = isIsometricOccluder
    ? formatElevationLabel(isometricOccluderInfo.occluderElevation)
    : elevationLabel;
  const occludedUnitIds = isIsometricOccluder
    ? isometricOccluderInfo.occludedUnitIds.join(',')
    : undefined;
  const occlusionReasons = isIsometricOccluder
    ? isometricOccluderInfo.reasons.join('|')
    : undefined;
  const occluderLabel = isIsometricOccluder
    ? `; occludes units ${occludedUnitIds}`
    : '';

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
  const {
    hexLabel,
    movementOptions,
    overlayAttributes,
    rootAttributes,
    terrainType,
  } = buildHexCellRenderModel({
    combatInfo,
    combatLosBlockerFor,
    elevation,
    elevationLabel,
    elevationStackMetrics,
    hex,
    isInPath,
    isIsometricOccluder,
    isUnreachableHover,
    movementInfo,
    occludedUnitIds,
    occluderElevation: isIsometricOccluder
      ? isometricOccluderInfo.occluderElevation
      : undefined,
    occluderLabel,
    occlusionReasons,
    overlayState,
    pathIndex,
    tacticalProjectionBlockedReasons,
    tacticalProjectionCombatStatus,
    tacticalProjectionExplanation,
    tacticalProjectionIntent,
    tacticalProjectionMovementCostReasons,
    tacticalProjectionMovementCostStatus,
    tacticalProjectionMovementHazardReasons,
    tacticalProjectionMovementHazardStatus,
    tacticalProjectionMovementStatus,
    tacticalProjectionSourceReferences,
    tacticalProjectionStatus,
    terrain,
  });

  return (
    <g
      // Arrow wrappers here are BELOW the memo boundary, so they are
      // re-created only when this cell genuinely re-renders — the
      // parent's handler props stay referentially stable (W5.1a).
      onClick={() => onClick(hex)}
      onMouseEnter={() => onMouseEnter(hex)}
      onMouseLeave={onMouseLeave}
      style={{ cursor: 'pointer' }}
      {...rootAttributes}
    >
      <title>{hexLabel}</title>
      <IsometricElevationStack
        x={x}
        y={y}
        hex={hex}
        stackMetrics={elevationStackMetrics}
        isometricOccluderInfo={
          isIsometricOccluder ? isometricOccluderInfo : undefined
        }
      />
      <HexCellTerrainArtLayer
        hex={hex}
        terrain={terrain}
        terrainLookup={terrainLookup}
      />
      <path
        d={pathD}
        fill={polygonFill}
        stroke={HEX_COLORS.gridLine}
        strokeWidth={1}
        pointerEvents="all"
        data-terrain={terrainType}
      />
      <HexCellOverlayLayer
        hex={hex}
        pathD={pathD}
        hasOverlay={hasOverlay}
        overlayFill={overlayFill}
        overlayOpacity={overlayOpacity}
        overlayAttributes={overlayAttributes}
        isLegacyAttackRangeFallback={isLegacyAttackRangeFallback}
      />
      <HexCellMovementEncodingLayers
        hex={hex}
        x={x}
        y={y}
        pathD={pathD}
        isJumpTile={isJumpTile}
        isRunTile={isRunTile}
        isBlockedTile={isBlockedTile}
        isInPath={isInPath}
      />
      <HexCellIsometricOccluderHighlight
        hex={hex}
        x={x}
        y={y}
        pathD={pathD}
        isIsometricOccluder={isIsometricOccluder}
        isometricOccluderInfo={isometricOccluderInfo}
        occludedUnitIds={occludedUnitIds}
        occlusionReasons={occlusionReasons}
        occluderElevationLabel={occluderElevationLabel}
      />
      <HexCellCoordinateLabel
        hex={hex}
        x={x}
        y={y}
        showCoordinate={showCoordinate}
      />
      <HexCellBadgeStack
        x={x}
        y={y}
        hex={hex}
        elevation={elevation}
        elevationLabel={elevationLabel}
        terrainFeatures={terrainFeatures}
        showElevationBadge={showElevationBadge}
        projectionMode={projectionMode}
        movementInfo={movementInfo}
        movementOptions={movementOptions}
        hoverMpCost={hoverMpCost}
        pathIndex={pathIndex}
        combatInfo={combatInfo}
        combatLosBlockerFor={combatLosBlockerFor}
        tacticalProjectionIntent={tacticalProjectionIntent}
        tacticalProjectionStatus={tacticalProjectionStatus}
        tacticalProjectionMovementStatus={tacticalProjectionMovementStatus}
        tacticalProjectionMovementCostStatus={
          tacticalProjectionMovementCostStatus
        }
        tacticalProjectionMovementCostReasons={
          tacticalProjectionMovementCostReasons
        }
        tacticalProjectionMovementHazardStatus={
          tacticalProjectionMovementHazardStatus
        }
        tacticalProjectionMovementHazardReasons={
          tacticalProjectionMovementHazardReasons
        }
        tacticalProjectionCombatStatus={tacticalProjectionCombatStatus}
        tacticalProjectionBlockedReasons={tacticalProjectionBlockedReasons}
        tacticalProjectionSourceReferences={tacticalProjectionSourceReferences}
        tacticalProjectionExplanation={tacticalProjectionExplanation}
      />
    </g>
  );
});
