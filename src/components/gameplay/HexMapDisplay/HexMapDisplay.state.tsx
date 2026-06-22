import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  ICombatRangeHex,
  IHexCoordinate,
  IHexTerrain,
} from '@/types/gameplay';
import type { ITacticalMapProjectionFrame } from '@/utils/gameplay/tacticalMapProjection';

import { useScreenShake } from '@/hooks/useScreenShake';
import { useAnimationQueue } from '@/stores/useAnimationQueue';
import { GameSide } from '@/types/gameplay';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { buildTacticalMapHexProjectionLookup } from '@/utils/gameplay/tacticalMapProjection';

import type { HexMapDisplayState } from './HexMapDisplay.stateTypes';
import type { HexMapDisplayProps } from './HexMapDisplay.types';

import {
  useHasActiveMovementAnimation,
  useHoverIsometricOccluderInfo,
  useHoverUnreachableReason,
  useIsometricForegroundUnitIds,
  useLegacyAttackRangeLookup,
  useRenderedHexes,
  useSelectedToken,
} from './HexMapDisplay.derivedStateHooks';
import { buildIsometricSceneItems } from './HexMapDisplay.isometric';
import { renderHexCell as renderHexCellElement } from './HexMapDisplay.renderHexCell';
import {
  useCombatRangeLookup,
  useCombatProjectionValidTargetUnitIds,
  useHexGrid,
  useHighlightPathLookup,
  useIsometricOccluderInfo,
  useIsometricOcclusionIds,
  useIsometricOcclusionInfo,
  useIsometricOcclusionInfos,
  useIsometricOcclusionInfosByUnit,
  useMovementAnimationsByUnit,
  useMovementRangeLookup,
  useOrderedTokens,
  useTerrainLookup,
} from './HexMapDisplay.stateHooks';
import {
  useSelectedCombatProjectionState,
  useSelectedWeaponMaxRange,
  useSelectedWeaponVisibleFiringArcs,
} from './HexMapDisplay.weaponStateHooks';
import { getMapProjectionTransform, isIsometricProjection } from './projection';
import { generateHexesInRadius } from './renderHelpers';
import { useMapInteraction } from './useMapInteraction';

const ELEVATION_BADGE_MIN_ZOOM = 0.75;

// Stable empty defaults (audit 2026-06-09 G, W5.1a): inline `= []` /
// `= {}` default parameters mint a FRESH identity on every render when
// the prop is omitted, which invalidates every downstream useMemo
// (terrainLookup, occlusion sweep, projection lookup) and defeats the
// HexCell memo chain on every camera pan/zoom event. Module-level
// constants keep omitted props referentially stable forever.
const EMPTY_EVENTS: NonNullable<HexMapDisplayProps['events']> = [];
const EMPTY_HEX_TERRAIN: NonNullable<HexMapDisplayProps['hexTerrain']> = [];
const EMPTY_MOVEMENT_RANGE: NonNullable<HexMapDisplayProps['movementRange']> =
  [];
const EMPTY_ATTACK_RANGE: NonNullable<HexMapDisplayProps['attackRange']> = [];
const EMPTY_UNIT_WEAPONS: NonNullable<HexMapDisplayProps['unitWeapons']> = {};
const EMPTY_SELECTED_WEAPON_IDS: NonNullable<
  HexMapDisplayProps['selectedWeaponIds']
> = [];
const EMPTY_HIGHLIGHT_PATH: NonNullable<HexMapDisplayProps['highlightPath']> =
  [];

export function useHexMapDisplayState({
  mapId = 'default-map',
  radius,
  tokens,
  events = EMPTY_EVENTS,
  selectedHex,
  hexTerrain = EMPTY_HEX_TERRAIN,
  movementRange = EMPTY_MOVEMENT_RANGE,
  tacticalProjectionFrame: suppliedTacticalProjectionFrame,
  attackRange = EMPTY_ATTACK_RANGE,
  targetUnitId = null,
  unitWeapons = EMPTY_UNIT_WEAPONS,
  selectedWeaponIds = EMPTY_SELECTED_WEAPON_IDS,
  combatState = null,
  friendlySide = GameSide.Player,
  highlightPath = EMPTY_HIGHLIGHT_PATH,
  hoverMpCost,
  hoverUnreachable = false,
  onHexClick,
  onHexHover,
  onTokenClick,
  onTokenDoubleClick,
  onInteractionReady,
  projectionMode = 'topDown',
  showCoordinates = false,
}: HexMapDisplayProps): HexMapDisplayState {
  const [hoveredHex, setHoveredHex] = useState<IHexCoordinate | null>(null);
  const activeAnimations = useAnimationQueue((s) => s.active);
  const screenShake = useScreenShake({ events });
  const interaction = useMapInteraction(radius, projectionMode);
  const projectionTransform = getMapProjectionTransform(
    interaction.projectionMode,
    interaction.isometricRotationStep,
  );
  const isIsometricView = isIsometricProjection(interaction.projectionMode);
  const showElevationBadges =
    !isIsometricView &&
    interaction.showElevationBadges &&
    interaction.zoom >= ELEVATION_BADGE_MIN_ZOOM;
  const hexes = useMemo(() => generateHexesInRadius(radius), [radius]);
  const effectiveHexTerrain = useMemo(
    () =>
      buildEffectiveHexTerrainFromProjectionFrame(
        hexTerrain,
        suppliedTacticalProjectionFrame,
      ),
    [hexTerrain, suppliedTacticalProjectionFrame],
  );
  const terrainLookup = useTerrainLookup(effectiveHexTerrain);
  const movementRangeLookup = useMovementRangeLookup(movementRange);
  const highlightPathIndexLookup = useHighlightPathLookup(highlightPath);
  const hexGrid = useHexGrid(effectiveHexTerrain, hexes, radius);

  const renderedHexes = useRenderedHexes({
    hexes,
    isIsometricView,
    rotationStep: interaction.isometricRotationStep,
    terrainLookup,
  });

  const selectedToken = useSelectedToken(tokens);
  const selectedUnitPosition = selectedToken?.position ?? null;
  const movementAnimationsByUnit = useMovementAnimationsByUnit(
    activeAnimations,
    mapId,
  );
  const orderedTokens = useOrderedTokens({
    tokens,
    isIsometricView,
    terrainLookup,
    rotationStep: interaction.isometricRotationStep,
    movementAnimationsByUnit,
  });
  const hasActiveMovementAnimation = useHasActiveMovementAnimation({
    activeAnimations,
    mapId,
  });
  const {
    hasConfiguredWeaponList,
    isWeaponCombatProjectionEnabled,
    operationalWeapons,
    projectedCombatWeapons,
  } = useSelectedCombatProjectionState({
    combatState,
    selectedToken,
    selectedWeaponIds,
    unitWeapons,
  });
  const derivedCombatRangeLookup = useCombatRangeLookup({
    selectedToken,
    friendlySide,
    hasConfiguredWeaponList: isWeaponCombatProjectionEnabled,
    hexes,
    hexGrid,
    tokens,
    weapons: projectedCombatWeapons,
    targetUnitId,
    combatState,
  });
  const legacyAttackRangeLookup = useLegacyAttackRangeLookup({
    attackRange,
    enabled: !hasConfiguredWeaponList,
  });
  const derivedTacticalMapProjectionLookup = useMemo(
    () =>
      buildTacticalMapHexProjectionLookup({
        hexes,
        terrainLookup,
        movementRangeLookup,
        combatRangeLookup: derivedCombatRangeLookup,
        highlightPathIndexLookup,
        legacyAttackRangeLookup,
      }),
    [
      derivedCombatRangeLookup,
      hexes,
      highlightPathIndexLookup,
      legacyAttackRangeLookup,
      movementRangeLookup,
      terrainLookup,
    ],
  );
  const tacticalMapProjectionFrame = useMemo<ITacticalMapProjectionFrame>(
    () =>
      suppliedTacticalProjectionFrame ?? {
        source: 'hex-map-derived-fallback',
        lookup: derivedTacticalMapProjectionLookup,
        label: 'HexMapDisplay locally derived projection fallback',
      },
    [derivedTacticalMapProjectionLookup, suppliedTacticalProjectionFrame],
  );
  const tacticalMapProjectionLookup = tacticalMapProjectionFrame.lookup;
  const combatRangeLookup = useMemo<
    ReadonlyMap<string, ICombatRangeHex>
  >(() => {
    if (!suppliedTacticalProjectionFrame) return derivedCombatRangeLookup;

    const lookup = new Map<string, ICombatRangeHex>();
    tacticalMapProjectionLookup.forEach((projection, key) => {
      if (projection.combat) lookup.set(key, projection.combat);
    });
    return lookup;
  }, [
    derivedCombatRangeLookup,
    suppliedTacticalProjectionFrame,
    tacticalMapProjectionLookup,
  ]);
  const combatProjectionValidTargetUnitIds =
    useCombatProjectionValidTargetUnitIds({
      combatRangeLookup,
      enabled:
        isWeaponCombatProjectionEnabled ||
        suppliedTacticalProjectionFrame !== undefined,
    });
  const tacticalProjectionMissingHexKeys = useMemo(
    () =>
      renderedHexes
        .map(coordToKey)
        .filter((key) => !tacticalMapProjectionLookup.has(key)),
    [renderedHexes, tacticalMapProjectionLookup],
  );
  // Audit 2026-06-09 G (W5.1a): ONE occlusion sweep per render pass.
  // The list is derived first; the by-unit "first hit" map below is
  // derived FROM that list instead of running a second identical
  // `deriveIsometricTerrainOcclusionInfo` sweep with the same inputs.
  const isometricTerrainOcclusionInfos = useIsometricOcclusionInfos({
    isIsometricView,
    tokens,
    terrainLookup,
    rotationStep: interaction.isometricRotationStep,
  });
  const isometricTerrainOcclusionInfoByUnit = useIsometricOcclusionInfo({
    isIsometricView,
    isometricTerrainOcclusionInfos,
  });
  const isometricTerrainOcclusionInfosByUnit = useIsometricOcclusionInfosByUnit(
    {
      isIsometricView,
      isometricTerrainOcclusionInfos,
    },
  );
  const isometricTerrainOccluderInfoByHex = useIsometricOccluderInfo({
    isIsometricView,
    isometricTerrainOcclusionInfos,
  });
  const isometricOcclusionUnitIds = useIsometricOcclusionIds({
    isIsometricView,
    tokens,
    combatRangeLookup,
    combatProjectionValidTargetUnitIds,
    isometricTerrainOcclusionInfoByUnit,
  });
  const isometricForegroundUnitIds = useIsometricForegroundUnitIds({
    isometricOcclusionUnitIds,
    movementAnimationsByUnit,
  });
  const isometricSceneItems = useMemo(
    () =>
      buildIsometricSceneItems({
        isIsometricView,
        renderedHexes,
        tokens,
        terrainLookup,
        rotationStep: interaction.isometricRotationStep,
        foregroundUnitIds: isometricForegroundUnitIds,
      }),
    [
      interaction.isometricRotationStep,
      isIsometricView,
      isometricForegroundUnitIds,
      renderedHexes,
      terrainLookup,
      tokens,
    ],
  );
  const selectedWeaponMaxRange = useSelectedWeaponMaxRange({
    hasConfiguredWeaponList,
    operationalWeapons,
    selectedUnitPosition,
    attackRange,
    radius,
  });
  const visibleFiringArcs = useSelectedWeaponVisibleFiringArcs({
    hasConfiguredWeaponList,
    operationalWeapons,
  });

  const handleHexClick = useCallback(
    (hex: IHexCoordinate) => {
      setHoveredHex(null);
      onHexHover?.(null);
      onHexClick?.(hex);
    },
    [onHexClick, onHexHover],
  );
  const handleHexHover = useCallback(
    (hex: IHexCoordinate | null) => {
      setHoveredHex(hex);
      onHexHover?.(hex);
    },
    [onHexHover],
  );
  // Stable leave handler so HexCell's `onMouseLeave` prop never
  // churns — pairs with the hex-passing onClick/onMouseEnter contract
  // (audit 2026-06-09 G, W5.1a).
  const handleHexLeave = useCallback(() => {
    handleHexHover(null);
  }, [handleHexHover]);
  const handleTokenClick = useCallback(
    (unitId: string) => onTokenClick?.(unitId),
    [onTokenClick],
  );
  const handleTokenDoubleClick = useCallback(
    (unitId: string) => onTokenDoubleClick?.(unitId),
    [onTokenDoubleClick],
  );
  const hoverProjectionInfo = useMemo(() => {
    if (!hoveredHex) return undefined;
    return tacticalMapProjectionLookup.get(coordToKey(hoveredHex));
  }, [hoveredHex, tacticalMapProjectionLookup]);
  const hoverMovementInfo = hoverProjectionInfo?.movement;
  const hoverCombatInfo =
    hoverProjectionInfo?.combat &&
    (hoverProjectionInfo.combat.hasTarget || hoverProjectionInfo.combat.inRange)
      ? hoverProjectionInfo.combat
      : undefined;
  const hoverTerrainInfo = hoverProjectionInfo?.terrain;
  const hoverIsometricOccluderInfo = useHoverIsometricOccluderInfo({
    hoveredHex,
    isIsometricView,
    isometricTerrainOccluderInfoByHex,
  });
  const hoverUnreachableReason = useHoverUnreachableReason({
    hoverUnreachable,
    hoverMovementInfo,
  });

  const renderHexCell = useCallback(
    (hex: IHexCoordinate): React.ReactElement => {
      return renderHexCellElement(hex, {
        handleHexClick,
        handleHexHover,
        handleHexLeave,
        hoverMpCost,
        hoverUnreachable,
        hoveredHex,
        isometricTerrainOccluderInfoByHex,
        projectionMode: interaction.projectionMode,
        selectedHex,
        showCoordinates,
        showElevationBadges,
        tacticalMapProjectionLookup,
        terrainLookup,
      });
    },
    [
      handleHexClick,
      handleHexHover,
      handleHexLeave,
      hoverMpCost,
      hoverUnreachable,
      hoveredHex,
      interaction.projectionMode,
      isometricTerrainOccluderInfoByHex,
      selectedHex,
      showCoordinates,
      showElevationBadges,
      tacticalMapProjectionLookup,
      terrainLookup,
    ],
  );

  useEffect(
    () => onInteractionReady?.(interaction),
    [onInteractionReady, interaction],
  );

  return {
    mapId,
    tokens,
    events,
    screenShake,
    interaction,
    projectionTransform,
    isIsometricView,
    hexes,
    renderedHexes,
    terrainLookup,
    hexGrid,
    selectedToken,
    selectedUnitPosition,
    movementAnimationsByUnit,
    orderedTokens,
    hasActiveMovementAnimation,
    isometricTerrainOcclusionInfoByUnit,
    isometricTerrainOcclusionInfosByUnit,
    isometricOcclusionUnitIds,
    combatProjectionValidTargetUnitIds,
    combatRangeLookup,
    isometricSceneItems,
    selectedWeaponMaxRange,
    visibleFiringArcs,
    hoveredHex,
    hoverUnreachableReason,
    hoverMovementInfo,
    hoverCombatInfo,
    hoverTerrainInfo,
    hoverProjectionInfo,
    hoverIsometricOccluderInfo,
    tacticalProjectionFrameSource: tacticalMapProjectionFrame.source,
    tacticalProjectionFrameHexCount: tacticalMapProjectionLookup.size,
    tacticalProjectionMissingHexKeys,
    tacticalMapProjectionLookup,
    renderHexCell,
    handleTokenClick,
    handleTokenDoubleClick,
  };
}

function buildEffectiveHexTerrainFromProjectionFrame(
  hexTerrain: readonly IHexTerrain[],
  tacticalProjectionFrame: ITacticalMapProjectionFrame | undefined,
): readonly IHexTerrain[] {
  if (!tacticalProjectionFrame) return hexTerrain;

  const terrainByKey = new Map<string, IHexTerrain>();
  for (const terrain of hexTerrain) {
    terrainByKey.set(coordToKey(terrain.coordinate), terrain);
  }
  tacticalProjectionFrame.lookup.forEach((projection, key) => {
    terrainByKey.set(key, projection.terrain);
  });
  return Array.from(terrainByKey.values());
}
