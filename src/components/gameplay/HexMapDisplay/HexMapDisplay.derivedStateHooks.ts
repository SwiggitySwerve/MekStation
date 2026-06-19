import { useMemo } from 'react';

import type {
  IHexCoordinate,
  IHexTerrain,
  IMovementRangeHex,
  IUnitToken,
} from '@/types/gameplay';

import { coordToKey } from '@/utils/gameplay/hexMath';

import type { IsometricTerrainOccluderInfo } from './projection';

import { isometricDepthKey } from './projection';

interface ActiveMapAnimation {
  readonly kind?: string;
  readonly mapId: string;
}

export function useRenderedHexes({
  hexes,
  isIsometricView,
  terrainLookup,
  rotationStep,
}: {
  readonly hexes: readonly IHexCoordinate[];
  readonly isIsometricView: boolean;
  readonly terrainLookup: ReadonlyMap<string, IHexTerrain>;
  readonly rotationStep: number;
}): readonly IHexCoordinate[] {
  return useMemo(() => {
    if (!isIsometricView) return hexes;
    return [...hexes].sort(
      (a, b) =>
        isometricDepthKey(a, terrainLookup, rotationStep) -
        isometricDepthKey(b, terrainLookup, rotationStep),
    );
  }, [hexes, isIsometricView, rotationStep, terrainLookup]);
}

export function useSelectedToken(
  tokens: readonly IUnitToken[],
): IUnitToken | null {
  return useMemo(() => tokens.find((t) => t.isSelected) ?? null, [tokens]);
}

export function useHasActiveMovementAnimation({
  activeAnimations,
  mapId,
}: {
  readonly activeAnimations: readonly ActiveMapAnimation[];
  readonly mapId: string;
}): boolean {
  return useMemo(
    () =>
      activeAnimations.some(
        (animation) =>
          animation.mapId === mapId && animation.kind === 'movement',
      ),
    [activeAnimations, mapId],
  );
}

export function useLegacyAttackRangeLookup({
  attackRange,
  enabled,
}: {
  readonly attackRange: readonly IHexCoordinate[];
  readonly enabled: boolean;
}): ReadonlySet<string> {
  return useMemo(
    () => (enabled ? new Set(attackRange.map(coordToKey)) : new Set<string>()),
    [attackRange, enabled],
  );
}

export function useIsometricForegroundUnitIds({
  isometricOcclusionUnitIds,
  movementAnimationsByUnit,
}: {
  readonly isometricOcclusionUnitIds: ReadonlySet<string>;
  readonly movementAnimationsByUnit: ReadonlyMap<string, unknown>;
}): ReadonlySet<string> {
  return useMemo(() => {
    const ids = new Set(isometricOcclusionUnitIds);
    movementAnimationsByUnit.forEach((_, unitId) => ids.add(unitId));
    return ids;
  }, [isometricOcclusionUnitIds, movementAnimationsByUnit]);
}

export function useHoverIsometricOccluderInfo({
  hoveredHex,
  isIsometricView,
  isometricTerrainOccluderInfoByHex,
}: {
  readonly hoveredHex: IHexCoordinate | null;
  readonly isIsometricView: boolean;
  readonly isometricTerrainOccluderInfoByHex: ReadonlyMap<
    string,
    IsometricTerrainOccluderInfo
  >;
}): IsometricTerrainOccluderInfo | undefined {
  return useMemo(() => {
    if (!hoveredHex || !isIsometricView) return undefined;
    return isometricTerrainOccluderInfoByHex.get(coordToKey(hoveredHex));
  }, [hoveredHex, isIsometricView, isometricTerrainOccluderInfoByHex]);
}

export function useHoverUnreachableReason({
  hoverUnreachable,
  hoverMovementInfo,
}: {
  readonly hoverUnreachable: boolean;
  readonly hoverMovementInfo?: IMovementRangeHex;
}): string | undefined {
  if (!hoverUnreachable || !hoverMovementInfo || hoverMovementInfo.reachable) {
    return undefined;
  }
  return (
    hoverMovementInfo.movementInvalidDetails ??
    hoverMovementInfo.blockedReason ??
    hoverMovementInfo.movementInvalidReason
  );
}
