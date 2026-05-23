import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  ICombatRangeHex,
  IGameEvent,
  IHexCoordinate,
  IHexTerrain,
  IMovementRangeHex,
  IUnitToken,
} from '@/types/gameplay';
import type { UiFiringArc } from '@/utils/overlays/arcClassifier';

import { useScreenShake } from '@/hooks/useScreenShake';
import { useAnimationQueue } from '@/stores/useAnimationQueue';
import { GameSide, TerrainType } from '@/types/gameplay';
import { isOperationalWeaponStatus } from '@/utils/gameplay/combatProjection';
import { coordToKey } from '@/utils/gameplay/hexMath';

import type { HexMapDisplayProps } from './HexMapDisplay.types';

import { HexCell } from './HexCell';
import { buildIsometricSceneItems } from './HexMapDisplay.isometric';
import {
  useCombatRangeLookup,
  useHexGrid,
  useHighlightPathLookup,
  useHoverUnreachableReason,
  useIsometricOcclusionIds,
  useIsometricOcclusionInfo,
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
import { generateHexesInRadius, hexEquals, hexInList } from './renderHelpers';
import { useMapInteraction } from './useMapInteraction';

export interface HexMapDisplayState {
  readonly mapId: string;
  readonly tokens: readonly IUnitToken[];
  readonly events: readonly IGameEvent[];
  readonly screenShake: ReturnType<typeof useScreenShake>;
  readonly interaction: ReturnType<typeof useMapInteraction>;
  readonly projectionTransform: string | undefined;
  readonly isIsometricView: boolean;
  readonly hexes: readonly IHexCoordinate[];
  readonly renderedHexes: readonly IHexCoordinate[];
  readonly terrainLookup: ReturnType<typeof useTerrainLookup>;
  readonly hexGrid: ReturnType<typeof useHexGrid>;
  readonly selectedToken: IUnitToken | null;
  readonly selectedUnitPosition: IHexCoordinate | null;
  readonly movementAnimationsByUnit: ReturnType<
    typeof useMovementAnimationsByUnit
  >;
  readonly orderedTokens: ReturnType<typeof useOrderedTokens>;
  readonly hasActiveMovementAnimation: boolean;
  readonly isometricTerrainOcclusionInfoByUnit: ReturnType<
    typeof useIsometricOcclusionInfo
  >;
  readonly isometricOcclusionUnitIds: ReturnType<
    typeof useIsometricOcclusionIds
  >;
  readonly isometricSceneItems: ReturnType<typeof buildIsometricSceneItems>;
  readonly selectedWeaponMaxRange: number;
  readonly visibleFiringArcs: readonly UiFiringArc[] | undefined;
  readonly hoveredHex: IHexCoordinate | null;
  readonly hoverUnreachableReason: string | undefined;
  readonly hoverMovementInfo: IMovementRangeHex | undefined;
  readonly hoverCombatInfo: ICombatRangeHex | undefined;
  readonly hoverTerrainInfo: IHexTerrain | undefined;
  readonly renderHexCell: (hex: IHexCoordinate) => React.ReactElement;
  readonly handleTokenClick: (unitId: string) => void;
  readonly handleTokenDoubleClick: (unitId: string) => void;
}

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
  const hasConfiguredWeaponList =
    selectedToken !== null &&
    Object.prototype.hasOwnProperty.call(unitWeapons, selectedToken.unitId);
  const operationalWeapons = useMemo(
    () => selectedUnitWeapons.filter(isOperationalWeaponStatus),
    [selectedUnitWeapons],
  );
  const useLegacyAttackRange = !hasConfiguredWeaponList;
  const combatRangeLookup = useCombatRangeLookup({
    selectedToken,
    friendlySide,
    hasConfiguredWeaponList,
    hexes,
    hexGrid,
    tokens,
    weapons: selectedUnitWeapons,
    targetUnitId,
    combatState,
  });
  const isometricTerrainOcclusionInfoByUnit = useIsometricOcclusionInfo({
    isIsometricView,
    tokens,
    terrainLookup,
    rotationStep: interaction.isometricRotationStep,
  });
  const isometricOcclusionUnitIds = useIsometricOcclusionIds({
    isIsometricView,
    tokens,
    combatRangeLookup,
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
  const hoverUnreachableReason = useHoverUnreachableReason({
    hoverUnreachable,
    hoveredHex,
    movementRangeLookup,
  });
  const hoverMovementInfo = useMemo(() => {
    if (!hoveredHex) return undefined;
    return movementRangeLookup.get(coordToKey(hoveredHex));
  }, [hoveredHex, movementRangeLookup]);
  const hoverCombatInfo = useMemo(() => {
    if (!hoveredHex) return undefined;
    const combatInfo = combatRangeLookup.get(coordToKey(hoveredHex));
    if (!combatInfo) return undefined;
    return combatInfo.hasTarget || combatInfo.inRange ? combatInfo : undefined;
  }, [combatRangeLookup, hoveredHex]);
  const hoverTerrainInfo = useMemo((): IHexTerrain | undefined => {
    if (!hoveredHex) return undefined;
    return (
      terrainLookup.get(coordToKey(hoveredHex)) ?? {
        coordinate: hoveredHex,
        elevation: 0,
        features: [{ type: TerrainType.Clear, level: 0 }],
      }
    );
  }, [hoveredHex, terrainLookup]);

  const renderHexCell = useCallback(
    (hex: IHexCoordinate): React.ReactElement => {
      const key = coordToKey(hex);
      const movementInfo = movementRangeLookup.get(key);
      const isHovered = hoveredHex ? hexEquals(hex, hoveredHex) : false;
      const pathIndex = highlightPathIndexLookup.get(key);
      return (
        <HexCell
          key={`hex-cell-${key}`}
          hex={hex}
          terrain={terrainLookup.get(key)}
          terrainLookup={terrainLookup}
          isSelected={selectedHex ? hexEquals(hex, selectedHex) : false}
          isHovered={isHovered}
          movementInfo={movementInfo}
          combatInfo={combatRangeLookup.get(key)}
          isInAttackRange={
            (useLegacyAttackRange && hexInList(hex, attackRange)) ||
            Boolean(combatRangeLookup.get(key)?.inRange)
          }
          isInPath={pathIndex !== undefined}
          pathIndex={pathIndex}
          showCoordinate={showCoordinates}
          projectionMode={interaction.projectionMode}
          hoverMpCost={
            isHovered && hoverMpCost !== undefined && movementInfo?.reachable
              ? hoverMpCost
              : undefined
          }
          isUnreachableHover={
            isHovered && hoverUnreachable && !movementInfo?.reachable
          }
          onClick={() => handleHexClick(hex)}
          onMouseEnter={() => handleHexHover(hex)}
          onMouseLeave={() => handleHexHover(null)}
        />
      );
    },
    [
      attackRange,
      combatRangeLookup,
      handleHexClick,
      handleHexHover,
      highlightPathIndexLookup,
      hoveredHex,
      hoverMpCost,
      hoverUnreachable,
      interaction.projectionMode,
      movementRangeLookup,
      selectedHex,
      showCoordinates,
      terrainLookup,
      useLegacyAttackRange,
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
    isometricOcclusionUnitIds,
    isometricSceneItems,
    selectedWeaponMaxRange,
    visibleFiringArcs,
    hoveredHex,
    hoverUnreachableReason,
    hoverMovementInfo,
    hoverCombatInfo,
    hoverTerrainInfo,
    renderHexCell,
    handleTokenClick,
    handleTokenDoubleClick,
  };
}
