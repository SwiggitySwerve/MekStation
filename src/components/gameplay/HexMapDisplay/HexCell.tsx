import React from 'react';

import type {
  ICombatRangeHex,
  IHexCoordinate,
  IMovementRangeHex,
  IHexTerrain,
  MapProjectionMode,
} from '@/types/gameplay';
import type {
  ITacticalMapCombatLosBlockerReference,
  TacticalMapHexProjectionIntent,
  TacticalMapHexProjectionStatus,
} from '@/utils/gameplay/tacticalMapProjection';

import { TerrainArtLayer } from '@/components/gameplay/terrain/TerrainArtLayer';
import { HEX_COLORS } from '@/constants/hexMap';
import { MovementType } from '@/types/gameplay';

import {
  CombatLineOfSightBlockerBadge,
  CombatRangeBadge,
} from './HexCell.combatBadges';
import { CombatImpactBadge } from './HexCell.combatImpactBadge';
import { MovementHoverCostBadge } from './HexCell.hoverMovementBadge';
import {
  CombatInvalidBadge,
  MovementInvalidBadge,
} from './HexCell.invalidBadges';
import {
  IsometricElevationStack,
  getIsometricElevationLayerCount,
} from './HexCell.isometricStack';
import {
  ElevationBadge,
  HeatBadge,
  TerrainBadge,
  formatCombatLabel,
  formatElevationLabel,
  formatMovementLabel,
  formatTerrainFeaturesLabel,
  formatTerrainLabel,
} from './HexCell.labels';
import {
  MovementPathStepBadge,
  MovementReachBadge,
  MovementStepCostBadge,
  MovementStandUpBadge,
} from './HexCell.movementBadges';
import {
  movementOptionBlockedReasonsAttribute,
  movementOptionElevationCostsAttribute,
  movementOptionElevationDeltasAttribute,
  movementOptionInvalidDetailsAttribute,
  movementOptionInvalidReasonsAttribute,
  movementOptionTerrainCostsAttribute,
} from './HexCell.movementOptionSummaries';
import { ProjectionStatusBadge } from './HexCell.projectionBadges';
import {
  isIsometricProjection,
  type IsometricTerrainOccluderInfo,
} from './projection';
import {
  hexToPixel,
  hexPath,
  getTerrainFill,
  getPrimaryTerrainFeature,
} from './renderHelpers';

/**
 * Per `add-movement-phase-ui` task 3.4: when jump-range tiles render
 * they need a distinct diagonal-hatch pattern on top of the blue
 * tint so the player can visually distinguish "land here by
 * jumping" from "walk/run here." The pattern id is defined in
 * `Overlays.tsx` under <TerrainPatternDefs> so every HexCell can
 * reference it by URL.
 */
const JUMP_PATTERN_URL = 'url(#pattern-jump-range)';

function movementOptionTypesAttribute(
  movementInfo?: IMovementRangeHex,
): string | undefined {
  const options = movementInfo?.movementModeOptions;
  if (!options || options.length <= 1) return undefined;
  return options.map((option) => option.movementType).join(',');
}

function movementOptionCostsAttribute(
  movementInfo?: IMovementRangeHex,
): string | undefined {
  const options = movementInfo?.movementModeOptions;
  if (!options || options.length <= 1) return undefined;
  return options
    .map((option) => `${option.movementType}:${option.mpCost}`)
    .join('|');
}

function movementOptionStatesAttribute(
  movementInfo?: IMovementRangeHex,
): string | undefined {
  const options = movementInfo?.movementModeOptions;
  if (!options || options.length <= 1) return undefined;
  return options
    .map(
      (option) =>
        `${option.movementType}:${option.reachable ? 'reachable' : 'blocked'}`,
    )
    .join('|');
}

/**
 * Per `add-movement-phase-ui` task 3.2-3.4: pick the per-type tile
 * color (MegaMek-style cyan = walk, yellow = run, red = jump). Falls
 * back to the uniform `movementRange` color for legacy callers that
 * don't set a type or use Stationary.
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
  tacticalProjectionBlockedReasons?: readonly string[];
  tacticalProjectionExplanation?: string;
  isometricOccluderInfo?: IsometricTerrainOccluderInfo;
  showCoordinate: boolean;
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
  combatInfo,
  combatLosBlockerFor,
  isInAttackRange,
  isInPath,
  pathIndex,
  tacticalProjectionIntent,
  tacticalProjectionStatus,
  tacticalProjectionBlockedReasons,
  tacticalProjectionExplanation,
  isometricOccluderInfo,
  showCoordinate,
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
  const primaryFeature = getPrimaryTerrainFeature(terrain);
  const terrainType = primaryFeature?.type ?? null;
  const terrainTypes = terrain?.features.map((feature) => feature.type) ?? [];
  const elevation = terrain?.elevation ?? 0;
  const elevationLabel = formatElevationLabel(elevation);
  const isIsometricTile = isIsometricProjection(projectionMode);
  const elevationLayerCount = getIsometricElevationLayerCount({
    isIsometricTile,
    elevation,
  });

  const hasOverlay =
    isSelected ||
    isInPath ||
    movementInfo ||
    combatInfo?.inRange ||
    combatInfo?.hasTarget ||
    isInAttackRange ||
    isHovered;
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
  } else if (combatInfo?.inRange || combatInfo?.hasTarget) {
    overlayFill = combatInfo.attackable
      ? HEX_COLORS.attackRange
      : HEX_COLORS.movementRangeUnreachable;
    overlayOpacity = combatInfo.attackable ? 0.5 : 0.45;
  } else if (isInAttackRange) {
    overlayFill = HEX_COLORS.attackRange;
    overlayOpacity = 0.5;
  } else if (isHovered) {
    overlayFill = HEX_COLORS.hexHover;
    overlayOpacity = 0.4;
  }

  const isJumpTile =
    movementInfo?.reachable && movementInfo.movementType === MovementType.Jump;
  const isIsometricOccluder =
    isIsometricTile &&
    isometricOccluderInfo !== undefined &&
    isometricOccluderInfo.occludedUnitIds.length > 0;
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
  const movementLabel = movementInfo ? formatMovementLabel(movementInfo) : null;
  const combatLabel = combatInfo ? formatCombatLabel(combatInfo) : null;
  const pathLabel =
    pathIndex === undefined
      ? null
      : pathIndex === 0
        ? 'path start'
        : `path step ${pathIndex}`;
  const combatLosBlockerTargetHexes =
    combatLosBlockerFor && combatLosBlockerFor.length > 0
      ? combatLosBlockerFor
          .map((ref) => `${ref.targetHex.q},${ref.targetHex.r}`)
          .join('|')
      : undefined;
  const combatLosBlockerReasons =
    combatLosBlockerFor && combatLosBlockerFor.length > 0
      ? combatLosBlockerFor.map((ref) => ref.blocker.reason).join('|')
      : undefined;
  const movementOptionCount = movementInfo?.movementModeOptions?.length;
  const movementOptions =
    movementInfo?.movementModeOptions &&
    movementInfo.movementModeOptions.length > 1
      ? movementInfo.movementModeOptions
      : undefined;
  const hexLabel = `Hex ${hex.q},${hex.r}; terrain ${formatTerrainFeaturesLabel(
    terrainTypes,
  )}; primary ${formatTerrainLabel(terrainType)}; elevation ${elevationLabel}${
    movementLabel ? `; ${movementLabel}` : ''
  }${combatLabel ? `; ${combatLabel}` : ''}${
    pathLabel ? `; ${pathLabel}` : ''
  }${occluderLabel}`;

  return (
    <g
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: 'pointer' }}
      data-testid={`hex-${hex.q}-${hex.r}`}
      data-unreachable={isUnreachableHover ? 'true' : undefined}
      data-reachable={
        movementInfo ? (movementInfo.reachable ? 'true' : 'false') : undefined
      }
      data-movement-type={movementInfo?.movementType}
      data-movement-mode={movementInfo?.movementMode}
      data-movement-option-count={
        movementOptionCount && movementOptionCount > 1
          ? movementOptionCount
          : undefined
      }
      data-movement-option-types={movementOptionTypesAttribute(movementInfo)}
      data-movement-option-costs={movementOptionCostsAttribute(movementInfo)}
      data-movement-option-states={movementOptionStatesAttribute(movementInfo)}
      data-movement-option-blocked-reasons={movementOptionBlockedReasonsAttribute(
        movementOptions ?? [],
      )}
      data-movement-option-invalid-reasons={movementOptionInvalidReasonsAttribute(
        movementOptions ?? [],
      )}
      data-movement-option-invalid-details={movementOptionInvalidDetailsAttribute(
        movementOptions ?? [],
      )}
      data-movement-option-terrain-costs={movementOptionTerrainCostsAttribute(
        movementOptions ?? [],
      )}
      data-movement-option-elevation-deltas={movementOptionElevationDeltasAttribute(
        movementOptions ?? [],
      )}
      data-movement-option-elevation-costs={movementOptionElevationCostsAttribute(
        movementOptions ?? [],
      )}
      data-mp-cost={movementInfo?.mpCost}
      data-terrain-cost={movementInfo?.terrainCost}
      data-heat-generated={movementInfo?.heatGenerated}
      data-elevation={elevation}
      data-terrain-primary={terrainType ?? undefined}
      data-terrain-features={
        terrainTypes.length > 0 ? terrainTypes.join(',') : undefined
      }
      data-elevation-delta={movementInfo?.elevationDelta}
      data-elevation-cost={movementInfo?.elevationCost}
      data-stand-up-required={
        movementInfo?.standUpRequired ? 'true' : undefined
      }
      data-stand-up-mode={movementInfo?.standUpMode}
      data-stand-up-cost={movementInfo?.standUpCost}
      data-stand-up-psr-required={
        movementInfo?.standUpPsrRequired ? 'true' : undefined
      }
      data-stand-up-psr-reason={movementInfo?.standUpPsrReason}
      data-stand-up-psr-target={movementInfo?.standUpPsrTargetNumber}
      data-stand-up-psr-modifier={movementInfo?.standUpPsrModifier}
      data-stand-up-psr-modifier-details={movementInfo?.standUpPsrModifierDetails?.join(
        '|',
      )}
      data-stand-up-psr-impossible-reason={
        movementInfo?.standUpPsrImpossibleReason
      }
      data-movement-blocked-reason={movementInfo?.blockedReason}
      data-movement-invalid-reason={movementInfo?.movementInvalidReason}
      data-movement-invalid-details={movementInfo?.movementInvalidDetails}
      data-path-index={pathIndex}
      data-path-step={
        pathIndex === undefined
          ? undefined
          : pathIndex === 0
            ? 'start'
            : pathIndex
      }
      data-tactical-projection-intent={tacticalProjectionIntent}
      data-tactical-projection-status={tacticalProjectionStatus}
      data-tactical-projection-blocked-reasons={
        tacticalProjectionBlockedReasons &&
        tacticalProjectionBlockedReasons.length > 0
          ? tacticalProjectionBlockedReasons.join('|')
          : undefined
      }
      data-tactical-projection-explanation={tacticalProjectionExplanation}
      data-isometric-occludes-units={occludedUnitIds}
      data-isometric-occlusion-reasons={occlusionReasons}
      data-isometric-occluder-elevation={
        isIsometricOccluder
          ? isometricOccluderInfo.occluderElevation
          : undefined
      }
      data-combat-range-bracket={combatInfo?.rangeBracket}
      data-combat-distance={combatInfo?.distance}
      data-combat-los-state={combatInfo?.losState}
      data-combat-los-blocker-reason={combatInfo?.lineOfSightBlockerReason}
      data-combat-los-blocker-hex={
        combatInfo?.lineOfSightBlocker
          ? `${combatInfo.lineOfSightBlocker.hex.q},${combatInfo.lineOfSightBlocker.hex.r}`
          : undefined
      }
      data-combat-los-blocker-kind={combatInfo?.lineOfSightBlocker?.kind}
      data-combat-los-blocker-terrain={combatInfo?.lineOfSightBlocker?.terrain}
      data-combat-los-blocker-unit={combatInfo?.lineOfSightBlocker?.unitId}
      data-combat-target-cover-level={combatInfo?.targetCoverLevel}
      data-combat-target-partial-cover={
        combatInfo
          ? combatInfo.targetPartialCover
            ? 'true'
            : 'false'
          : undefined
      }
      data-combat-cover-modifier={combatInfo?.targetCoverModifier}
      data-combat-cover-reason={combatInfo?.targetCoverReason}
      data-combat-minimum-range-penalty={combatInfo?.minimumRangePenalty}
      data-combat-minimum-range-weapons={combatInfo?.minimumRangeWeaponIds?.join(
        ',',
      )}
      data-combat-minimum-range-reason={combatInfo?.minimumRangeReason}
      data-combat-to-hit-number={combatInfo?.toHitNumber}
      data-combat-to-hit-modifiers={combatInfo?.toHitModifiers
        ?.map((modifier) => `${modifier.name}:${modifier.value}`)
        .join('|')}
      data-combat-to-hit-reason={combatInfo?.toHitReason}
      data-combat-firing-arc={combatInfo?.firingArc}
      data-combat-target-visibility={combatInfo?.targetVisibilityState}
      data-combat-visible-target-ids={combatInfo?.visibleTargetUnitIds.join(
        ',',
      )}
      data-combat-obscured-target-ids={combatInfo?.obscuredTargetUnitIds.join(
        ',',
      )}
      data-combat-visibility-blocked-reason={
        combatInfo?.visibilityBlockedReason
      }
      data-combat-valid-target={
        combatInfo?.attackable
          ? 'true'
          : combatInfo?.hasTarget
            ? 'false'
            : undefined
      }
      data-combat-blocked-reason={combatInfo?.blockedReason}
      data-combat-invalid-reason={combatInfo?.attackInvalidReason}
      data-combat-invalid-details={combatInfo?.attackInvalidDetails}
      data-combat-indirect-fire={
        combatInfo?.indirectFireAvailable ? 'true' : undefined
      }
      data-combat-indirect-spotter={combatInfo?.indirectFireSpotterId}
      data-combat-indirect-basis={combatInfo?.indirectFireBasis}
      data-combat-indirect-penalty={combatInfo?.indirectFireToHitPenalty}
      data-combat-indirect-forward-observer={
        combatInfo?.indirectFireForwardObserver ? 'true' : undefined
      }
      data-combat-indirect-penalty-cancelled={
        combatInfo?.indirectFirePenaltyCancelled
      }
      data-combat-indirect-reason={combatInfo?.indirectFireReason}
      data-weapons-in-range={combatInfo?.weaponIdsInRange.join(',')}
      data-weapons-in-arc={combatInfo?.weaponIdsInArc.join(',')}
      data-weapons-available={combatInfo?.weaponIdsAvailable.join(',')}
      data-combat-target-ids={combatInfo?.targetUnitIds.join(',')}
      data-combat-los-blocker-for-target-hexes={combatLosBlockerTargetHexes}
      data-combat-los-blocker-for-reasons={combatLosBlockerReasons}
      aria-label={hexLabel}
      data-elevation-layers={elevationLayerCount || undefined}
    >
      <title>{hexLabel}</title>
      <IsometricElevationStack
        x={x}
        y={y}
        hex={hex}
        elevationLayerCount={elevationLayerCount}
        isometricOccluderInfo={
          isIsometricOccluder ? isometricOccluderInfo : undefined
        }
      />
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
      {isIsometricOccluder && (
        <g
          pointerEvents="none"
          data-testid={`hex-isometric-occluder-highlight-${hex.q}-${hex.r}`}
          data-isometric-occludes-units={occludedUnitIds}
          data-isometric-occlusion-reasons={occlusionReasons}
          aria-label={`Tall elevation ${elevationLabel} may hide units ${occludedUnitIds}`}
        >
          <title>
            {`Tall elevation ${elevationLabel} may hide units ${occludedUnitIds}`}
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
      )}
      {showCoordinate && (
        <text x={x} y={y + 4} textAnchor="middle" fontSize={10} fill="#64748b">
          {hex.q},{hex.r}
        </text>
      )}
      <ElevationBadge
        x={x}
        y={y}
        hex={hex}
        elevation={elevation}
        label={elevationLabel}
        projectionMode={projectionMode}
      />
      <ProjectionStatusBadge
        x={x}
        y={y}
        hex={hex}
        status={tacticalProjectionStatus}
        intent={tacticalProjectionIntent}
        blockedReasons={tacticalProjectionBlockedReasons}
        explanation={tacticalProjectionExplanation}
      />
      <TerrainBadge
        x={x}
        y={y}
        hex={hex}
        terrainTypes={terrainTypes}
        projectionMode={projectionMode}
      />
      {hoverMpCost === undefined && (
        <MovementReachBadge x={x} y={y} hex={hex} movementInfo={movementInfo} />
      )}
      <MovementStepCostBadge
        x={x}
        y={y}
        hex={hex}
        movementInfo={movementInfo}
      />
      <MovementStandUpBadge x={x} y={y} hex={hex} movementInfo={movementInfo} />
      <MovementPathStepBadge x={x} y={y} hex={hex} pathIndex={pathIndex} />
      <HeatBadge
        x={x}
        y={y}
        hex={hex}
        heatGenerated={movementInfo?.heatGenerated}
      />
      <MovementInvalidBadge x={x} y={y} hex={hex} movementInfo={movementInfo} />
      <MovementHoverCostBadge
        x={x}
        y={y}
        hex={hex}
        hoverMpCost={hoverMpCost}
        movementInfo={movementInfo}
      />
      <CombatLineOfSightBlockerBadge
        x={x}
        y={y}
        hex={hex}
        blockerRefs={combatLosBlockerFor}
      />
      <CombatRangeBadge x={x} y={y} hex={hex} combatInfo={combatInfo} />
      <CombatImpactBadge x={x} y={y} hex={hex} combatInfo={combatInfo} />
      <CombatInvalidBadge x={x} y={y} hex={hex} combatInfo={combatInfo} />
    </g>
  );
});
