import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { IHexCoordinate } from '@/types/gameplay';

import { useScreenShake } from '@/hooks/useScreenShake';
import { useAnimationQueue } from '@/stores/useAnimationQueue';
import { GamePhase, GameSide } from '@/types/gameplay';
import { isOperationalWeaponStatus } from '@/utils/gameplay/combatProjection';
import { selectCombatProjectionWeapons } from '@/utils/gameplay/combatProjection.weaponSelection';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { buildTacticalMapHexProjectionLookup } from '@/utils/gameplay/tacticalMapProjection';

import type { HexMapDisplayState } from './HexMapDisplay.stateTypes';
import type { HexMapDisplayProps } from './HexMapDisplay.types';

import { HexCell } from './HexCell';
import { buildIsometricSceneItems } from './HexMapDisplay.isometric';
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
  useSelectedWeaponMaxRange,
  useSelectedWeaponVisibleFiringArcs,
  useTerrainLookup,
} from './HexMapDisplay.stateHooks';
import {
  getMapProjectionTransform,
  isIsometricProjection,
  isometricDepthKey,
} from './projection';
import { generateHexesInRadius } from './renderHelpers';
import { useMapInteraction } from './useMapInteraction';

export function useHexMapDisplayState({
  mapId = 'default-map',
  radius,
  tokens,
  events = [],
  selectedHex,
  hexTerrain = [],
  movementRange = [],
  attackRange = [],
  targetUnitId = null,
  unitWeapons = {},
  selectedWeaponIds = [],
  combatState = null,
  friendlySide = GameSide.Player,
  highlightPath = [],
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
  const hexes = useMemo(() => generateHexesInRadius(radius), [radius]);
  const terrainLookup = useTerrainLookup(hexTerrain);
  const movementRangeLookup = useMovementRangeLookup(movementRange);
  const highlightPathIndexLookup = useHighlightPathLookup(highlightPath);
  const hexGrid = useHexGrid(hexTerrain, hexes, radius);

  const renderedHexes = useMemo(() => {
    if (!isIsometricView) return hexes;
    return [...hexes].sort(
      (a, b) =>
        isometricDepthKey(a, terrainLookup, interaction.isometricRotationStep) -
        isometricDepthKey(b, terrainLookup, interaction.isometricRotationStep),
    );
  }, [
    hexes,
    interaction.isometricRotationStep,
    isIsometricView,
    terrainLookup,
  ]);

  const selectedToken = useMemo(
    () => tokens.find((t) => t.isSelected) ?? null,
    [tokens],
  );
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
  const hasActiveMovementAnimation = useMemo(
    () =>
      activeAnimations.some(
        (animation) =>
          animation.mapId === mapId && animation.kind === 'movement',
      ),
    [activeAnimations, mapId],
  );
  const selectedUnitWeapons = useMemo(() => {
    if (!selectedToken) return [];
    return unitWeapons[selectedToken.unitId] ?? [];
  }, [selectedToken, unitWeapons]);
  const projectedCombatWeapons = useMemo(
    () => selectCombatProjectionWeapons(selectedUnitWeapons, selectedWeaponIds),
    [selectedUnitWeapons, selectedWeaponIds],
  );
  const hasConfiguredWeaponList =
    selectedToken !== null &&
    Object.prototype.hasOwnProperty.call(unitWeapons, selectedToken.unitId);
  const isWeaponCombatProjectionEnabled =
    hasConfiguredWeaponList &&
    (combatState === null ||
      combatState === undefined ||
      combatState.phase === GamePhase.WeaponAttack);
  const operationalWeapons = useMemo(
    () => projectedCombatWeapons.filter(isOperationalWeaponStatus),
    [projectedCombatWeapons],
  );
  const useLegacyAttackRange = !hasConfiguredWeaponList;
  const combatRangeLookup = useCombatRangeLookup({
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
  const combatProjectionValidTargetUnitIds =
    useCombatProjectionValidTargetUnitIds({
      combatRangeLookup,
      enabled: isWeaponCombatProjectionEnabled,
    });
  const legacyAttackRangeLookup = useMemo(
    () =>
      useLegacyAttackRange
        ? new Set(attackRange.map(coordToKey))
        : new Set<string>(),
    [attackRange, useLegacyAttackRange],
  );
  const tacticalMapProjectionLookup = useMemo(
    () =>
      buildTacticalMapHexProjectionLookup({
        hexes,
        terrainLookup,
        movementRangeLookup,
        combatRangeLookup,
        selectedHex,
        hoveredHex,
        highlightPathIndexLookup,
        legacyAttackRangeLookup,
      }),
    [
      combatRangeLookup,
      hexes,
      highlightPathIndexLookup,
      hoveredHex,
      legacyAttackRangeLookup,
      movementRangeLookup,
      selectedHex,
      terrainLookup,
    ],
  );
  const isometricTerrainOcclusionInfoByUnit = useIsometricOcclusionInfo({
    isIsometricView,
    tokens,
    terrainLookup,
    rotationStep: interaction.isometricRotationStep,
  });
  const isometricTerrainOcclusionInfos = useIsometricOcclusionInfos({
    isIsometricView,
    tokens,
    terrainLookup,
    rotationStep: interaction.isometricRotationStep,
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
  const isometricForegroundUnitIds = useMemo(() => {
    const ids = new Set(isometricOcclusionUnitIds);
    movementAnimationsByUnit.forEach((_, unitId) => ids.add(unitId));
    return ids;
  }, [isometricOcclusionUnitIds, movementAnimationsByUnit]);
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
  const hoverIsometricOccluderInfo = useMemo(() => {
    if (!hoveredHex || !isIsometricView) return undefined;
    return isometricTerrainOccluderInfoByHex.get(coordToKey(hoveredHex));
  }, [hoveredHex, isIsometricView, isometricTerrainOccluderInfoByHex]);
  const hoverUnreachableReason =
    hoverUnreachable && hoverMovementInfo && !hoverMovementInfo.reachable
      ? (hoverMovementInfo.movementInvalidDetails ??
        hoverMovementInfo.blockedReason ??
        hoverMovementInfo.movementInvalidReason)
      : undefined;

  const renderHexCell = useCallback(
    (hex: IHexCoordinate): React.ReactElement => {
      const key = coordToKey(hex);
      const projection = tacticalMapProjectionLookup.get(key);
      const movementInfo = projection?.movement;
      const pathIndex = projection?.pathIndex;
      const isometricOccluderInfo = isometricTerrainOccluderInfoByHex.get(key);
      return (
        <HexCell
          key={`hex-cell-${key}`}
          hex={hex}
          terrain={projection?.terrain}
          terrainLookup={terrainLookup}
          isSelected={projection?.isSelected ?? false}
          isHovered={projection?.isHovered ?? false}
          movementInfo={movementInfo}
          combatInfo={projection?.combat}
          combatLosBlockerFor={projection?.combatLosBlockerFor}
          isInAttackRange={projection?.inAttackRange ?? false}
          isInPath={pathIndex !== undefined}
          pathIndex={pathIndex}
          tacticalProjectionIntent={projection?.intent}
          tacticalProjectionStatus={projection?.status}
          tacticalProjectionMovementStatus={projection?.movementStatus}
          tacticalProjectionCombatStatus={projection?.combatStatus}
          tacticalProjectionBlockedReasons={projection?.blockedReasons}
          tacticalProjectionSourceReferences={projection?.sourceReferences}
          tacticalProjectionExplanation={projection?.explanation}
          isometricOccluderInfo={isometricOccluderInfo || undefined}
          showCoordinate={showCoordinates}
          projectionMode={interaction.projectionMode}
          hoverMpCost={
            projection?.isHovered &&
            hoverMpCost !== undefined &&
            movementInfo?.reachable
              ? hoverMpCost
              : undefined
          }
          isUnreachableHover={
            projection?.isHovered &&
            hoverUnreachable &&
            !movementInfo?.reachable
          }
          onClick={() => handleHexClick(hex)}
          onMouseEnter={() => handleHexHover(hex)}
          onMouseLeave={() => handleHexHover(null)}
        />
      );
    },
    [
      handleHexClick,
      handleHexHover,
      hoverMpCost,
      hoverUnreachable,
      interaction.projectionMode,
      isometricTerrainOccluderInfoByHex,
      showCoordinates,
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
    tacticalMapProjectionLookup,
    renderHexCell,
    handleTokenClick,
    handleTokenDoubleClick,
  };
}
