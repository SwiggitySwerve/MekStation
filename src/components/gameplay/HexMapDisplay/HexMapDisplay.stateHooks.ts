import { useMemo } from 'react';

import type {
  ICombatRangeHex,
  IGameState,
  IHex,
  IHexCoordinate,
  IHexGrid,
  IHexTerrain,
  IMovementRangeHex,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';

import { useAnimationQueue } from '@/stores/useAnimationQueue';
import { GamePhase, GameSide, TerrainType } from '@/types/gameplay';
import { deriveCombatRangeHexes } from '@/utils/gameplay/combatProjection';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

import type {
  IsometricTerrainOccluderInfo,
  IsometricTerrainOcclusionInfo,
} from './projection';

import { withSameHexMovementOptions } from './HexCell.movementOptionSummaries';
import {
  deriveIsometricTerrainOccluderInfo,
  deriveIsometricTerrainOcclusionInfo,
  deriveIsometricTerrainOcclusionInfoByUnit,
  isometricDepthKey,
} from './projection';

type ActiveMapAnimation = ReturnType<
  typeof useAnimationQueue.getState
>['active'][number];

export function useTerrainLookup(
  hexTerrain: readonly IHexTerrain[],
): ReadonlyMap<string, IHexTerrain> {
  return useMemo(() => {
    const map = new Map<string, IHexTerrain>();
    for (const t of hexTerrain) map.set(coordToKey(t.coordinate), t);
    return map;
  }, [hexTerrain]);
}

export function useMovementRangeLookup(
  movementRange: readonly IMovementRangeHex[],
): ReadonlyMap<string, IMovementRangeHex> {
  return useMemo(() => {
    const grouped = new Map<string, IMovementRangeHex[]>();
    for (const m of movementRange) {
      const key = coordToKey(m.hex);
      const entries = grouped.get(key) ?? [];
      entries.push(m);
      grouped.set(key, entries);
    }

    const map = new Map<string, IMovementRangeHex>();
    grouped.forEach((entries, key) => {
      map.set(key, withSameHexMovementOptions(entries));
    });
    return map;
  }, [movementRange]);
}

export function useHighlightPathLookup(
  highlightPath: readonly IHexCoordinate[],
): ReadonlyMap<string, number> {
  return useMemo(() => {
    const map = new Map<string, number>();
    highlightPath.forEach((hex, index) => map.set(coordToKey(hex), index));
    return map;
  }, [highlightPath]);
}

export function useHexGrid(
  hexTerrain: readonly IHexTerrain[],
  hexes: readonly IHexCoordinate[],
  radius: number,
): IHexGrid {
  return useMemo(() => {
    const hexMap = new Map<string, IHex>();
    for (const t of hexTerrain) {
      hexMap.set(coordToKey(t.coordinate), {
        coord: t.coordinate,
        occupantId: null,
        terrain: terrainStringFromFeatures(t.features),
        elevation: t.elevation,
      });
    }
    for (const hex of hexes) {
      const key = coordToKey(hex);
      if (!hexMap.has(key)) {
        hexMap.set(key, {
          coord: hex,
          occupantId: null,
          terrain: TerrainType.Clear,
          elevation: 0,
        });
      }
    }
    return { config: { radius }, hexes: hexMap };
  }, [hexTerrain, hexes, radius]);
}

export function useMovementAnimationsByUnit(
  activeAnimations: ReturnType<typeof useAnimationQueue.getState>['active'],
  mapId: string,
): ReadonlyMap<string, ActiveMapAnimation> {
  return useMemo(() => {
    const lookup = new Map<string, ActiveMapAnimation>();
    for (const animation of activeAnimations) {
      if (
        animation.mapId === mapId &&
        animation.kind === 'movement' &&
        animation.unitId
      ) {
        lookup.set(animation.unitId, animation);
      }
    }
    return lookup;
  }, [activeAnimations, mapId]);
}

export function useOrderedTokens({
  tokens,
  isIsometricView,
  terrainLookup,
  rotationStep,
  movementAnimationsByUnit,
}: {
  readonly tokens: readonly IUnitToken[];
  readonly isIsometricView: boolean;
  readonly terrainLookup: ReadonlyMap<string, IHexTerrain>;
  readonly rotationStep: number;
  readonly movementAnimationsByUnit: ReadonlyMap<string, unknown>;
}): readonly IUnitToken[] {
  return useMemo(
    () =>
      [...tokens].sort((a, b) => {
        if (isIsometricView) {
          if (a.isSelected !== b.isSelected) return a.isSelected ? 1 : -1;
          const aDepth = isometricDepthKey(
            a.position,
            terrainLookup,
            rotationStep,
          );
          const bDepth = isometricDepthKey(
            b.position,
            terrainLookup,
            rotationStep,
          );
          if (aDepth !== bDepth) return aDepth - bDepth;
        }
        const aAnimating = movementAnimationsByUnit.has(a.unitId);
        const bAnimating = movementAnimationsByUnit.has(b.unitId);
        if (aAnimating === bAnimating) return 0;
        return aAnimating ? 1 : -1;
      }),
    [
      isIsometricView,
      movementAnimationsByUnit,
      rotationStep,
      terrainLookup,
      tokens,
    ],
  );
}

export function useCombatRangeLookup({
  selectedToken,
  friendlySide,
  hasConfiguredWeaponList,
  hexes,
  hexGrid,
  tokens,
  weapons,
  targetUnitId,
  combatState,
}: {
  readonly selectedToken: IUnitToken | null;
  readonly friendlySide: GameSide;
  readonly hasConfiguredWeaponList: boolean;
  readonly hexes: readonly IHexCoordinate[];
  readonly hexGrid: IHexGrid;
  readonly tokens: readonly IUnitToken[];
  readonly weapons: readonly IWeaponStatus[];
  readonly targetUnitId?: string | null;
  readonly combatState?: IGameState | null;
}): ReadonlyMap<string, ICombatRangeHex> {
  return useMemo(() => {
    const map = new Map<string, ICombatRangeHex>();
    if (
      !selectedToken ||
      selectedToken.side !== friendlySide ||
      !hasConfiguredWeaponList ||
      (combatState !== null &&
        combatState !== undefined &&
        combatState.phase !== GamePhase.WeaponAttack)
    ) {
      return map;
    }
    for (const combatInfo of deriveCombatRangeHexes({
      attacker: selectedToken,
      targetUnitId,
      hexes,
      grid: hexGrid,
      tokens,
      weapons,
      combatState,
    })) {
      map.set(coordToKey(combatInfo.hex), combatInfo);
    }
    return map;
  }, [
    combatState,
    friendlySide,
    hasConfiguredWeaponList,
    hexGrid,
    hexes,
    selectedToken,
    targetUnitId,
    tokens,
    weapons,
  ]);
}

export function useCombatProjectionValidTargetUnitIds({
  combatRangeLookup,
  enabled,
}: {
  readonly combatRangeLookup: ReadonlyMap<string, ICombatRangeHex>;
  readonly enabled: boolean;
}): ReadonlySet<string> | undefined {
  return useMemo(() => {
    if (!enabled) return undefined;
    const ids = new Set<string>();
    combatRangeLookup.forEach((combatInfo) => {
      for (const unitId of combatInfo.validTargetUnitIds) ids.add(unitId);
    });
    return ids;
  }, [combatRangeLookup, enabled]);
}

/**
 * First-occlusion-per-unit lookup. Audit 2026-06-09 G (W5.1a): this
 * used to run its own `deriveIsometricTerrainOcclusionInfo` sweep with
 * inputs identical to `useIsometricOcclusionInfos` — two full-grid
 * occlusion passes per render. It now derives from that single sweep's
 * output instead.
 */
export function useIsometricOcclusionInfo({
  isIsometricView,
  isometricTerrainOcclusionInfos,
}: {
  readonly isIsometricView: boolean;
  readonly isometricTerrainOcclusionInfos: readonly IsometricTerrainOcclusionInfo[];
}): ReadonlyMap<string, IsometricTerrainOcclusionInfo> {
  return useMemo(() => {
    const lookup = new Map<string, IsometricTerrainOcclusionInfo>();
    if (!isIsometricView) return lookup;
    for (const info of isometricTerrainOcclusionInfos) {
      if (!lookup.has(info.unitId)) {
        lookup.set(info.unitId, info);
      }
    }
    return lookup;
  }, [isIsometricView, isometricTerrainOcclusionInfos]);
}

export function useIsometricOcclusionInfos({
  isIsometricView,
  tokens,
  terrainLookup,
  rotationStep,
}: {
  readonly isIsometricView: boolean;
  readonly tokens: readonly IUnitToken[];
  readonly terrainLookup: ReadonlyMap<string, IHexTerrain>;
  readonly rotationStep: number;
}): readonly IsometricTerrainOcclusionInfo[] {
  return useMemo(() => {
    if (!isIsometricView) return [];
    return deriveIsometricTerrainOcclusionInfo({
      tokens,
      terrainLookup,
      rotationStep,
    });
  }, [isIsometricView, rotationStep, terrainLookup, tokens]);
}

export function useIsometricOcclusionInfosByUnit({
  isIsometricView,
  isometricTerrainOcclusionInfos,
}: {
  readonly isIsometricView: boolean;
  readonly isometricTerrainOcclusionInfos: readonly IsometricTerrainOcclusionInfo[];
}): ReadonlyMap<string, readonly IsometricTerrainOcclusionInfo[]> {
  return useMemo(() => {
    if (!isIsometricView || isometricTerrainOcclusionInfos.length === 0) {
      return new Map<string, readonly IsometricTerrainOcclusionInfo[]>();
    }
    return deriveIsometricTerrainOcclusionInfoByUnit(
      isometricTerrainOcclusionInfos,
    );
  }, [isIsometricView, isometricTerrainOcclusionInfos]);
}

export function useIsometricOcclusionIds({
  isIsometricView,
  tokens,
  combatRangeLookup,
  combatProjectionValidTargetUnitIds,
  isometricTerrainOcclusionInfoByUnit,
}: {
  readonly isIsometricView: boolean;
  readonly tokens: readonly IUnitToken[];
  readonly combatRangeLookup: ReadonlyMap<string, ICombatRangeHex>;
  readonly combatProjectionValidTargetUnitIds?: ReadonlySet<string>;
  readonly isometricTerrainOcclusionInfoByUnit: ReadonlyMap<
    string,
    IsometricTerrainOcclusionInfo
  >;
}): ReadonlySet<string> {
  return useMemo(() => {
    const ids = new Set<string>();
    if (!isIsometricView) return ids;
    isometricTerrainOcclusionInfoByUnit.forEach((info) => ids.add(info.unitId));
    for (const token of tokens) {
      const isValidTarget =
        combatProjectionValidTargetUnitIds?.has(token.unitId) ??
        token.isValidTarget;
      if (token.isSelected || isValidTarget) ids.add(token.unitId);
    }
    combatRangeLookup.forEach((combatInfo) => {
      for (const unitId of combatInfo.targetUnitIds) ids.add(unitId);
    });
    return ids;
  }, [
    combatProjectionValidTargetUnitIds,
    combatRangeLookup,
    isIsometricView,
    isometricTerrainOcclusionInfoByUnit,
    tokens,
  ]);
}

export function useIsometricOccluderInfo({
  isIsometricView,
  isometricTerrainOcclusionInfos,
}: {
  readonly isIsometricView: boolean;
  readonly isometricTerrainOcclusionInfos: readonly IsometricTerrainOcclusionInfo[];
}): ReadonlyMap<string, IsometricTerrainOccluderInfo> {
  return useMemo(() => {
    if (!isIsometricView || isometricTerrainOcclusionInfos.length === 0) {
      return new Map<string, IsometricTerrainOccluderInfo>();
    }
    return deriveIsometricTerrainOccluderInfo(isometricTerrainOcclusionInfos);
  }, [isIsometricView, isometricTerrainOcclusionInfos]);
}

export function useHoverUnreachableReason({
  hoverUnreachable,
  hoveredHex,
  movementRangeLookup,
}: {
  readonly hoverUnreachable: boolean;
  readonly hoveredHex: IHexCoordinate | null;
  readonly movementRangeLookup: ReadonlyMap<string, IMovementRangeHex>;
}): string | undefined {
  return useMemo(() => {
    if (!hoverUnreachable || !hoveredHex) return undefined;
    const movementInfo = movementRangeLookup.get(coordToKey(hoveredHex));
    if (!movementInfo || movementInfo.reachable) return undefined;
    return (
      movementInfo.movementInvalidDetails ??
      movementInfo.blockedReason ??
      movementInfo.movementInvalidReason
    );
  }, [hoverUnreachable, hoveredHex, movementRangeLookup]);
}
