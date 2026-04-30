import type {
  IHexCoordinate,
  IHexGrid,
} from '@/types/gameplay/HexGridInterfaces';
import type { ILOSResult } from '@/utils/gameplay/lineOfSight';

import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { coordToKey } from '@/utils/gameplay/hexMath';
import {
  calculateLOS,
  parseTerrainFeatures,
} from '@/utils/gameplay/lineOfSight';

export type LOSOverlayState = 'clear' | 'partial' | 'blocked';
export type LOSBlockerIcon = 'cover' | 'wall';

export interface LOSBlockerMetadata {
  readonly coord: IHexCoordinate;
  readonly terrain: TerrainType;
  readonly icon: LOSBlockerIcon;
  readonly title: string;
}

export interface LOSClassification {
  readonly state: LOSOverlayState;
  readonly blockers: readonly IHexCoordinate[];
  readonly blockerAnnotations: readonly LOSBlockerMetadata[];
  readonly lineEnd: IHexCoordinate;
  readonly engineResult: ILOSResult;
}

export interface LOSClassifierOptions {
  readonly fromElevation?: number;
  readonly toElevation?: number;
}

const PARTIAL_COVER_TERRAINS: readonly TerrainType[] = [
  TerrainType.LightWoods,
  TerrainType.HeavyWoods,
];

function terrainLabel(terrain: TerrainType): string {
  return terrain.replace(/_/g, ' ');
}

function hexLabel(hex: IHexCoordinate): string {
  return `(${hex.q}, ${hex.r})`;
}

function terrainAt(
  grid: IHexGrid,
  hex: IHexCoordinate,
): TerrainType | undefined {
  const hexData = grid.hexes.get(coordToKey(hex));
  if (!hexData) return undefined;

  return parseTerrainFeatures(hexData.terrain)[0]?.type;
}

function partialCoverTerrainAt(
  grid: IHexGrid,
  hex: IHexCoordinate,
): TerrainType | undefined {
  const hexData = grid.hexes.get(coordToKey(hex));
  if (!hexData) return undefined;

  const features = parseTerrainFeatures(hexData.terrain);
  return features.find((feature) =>
    PARTIAL_COVER_TERRAINS.includes(feature.type),
  )?.type;
}

function partialCoverAnnotation(
  coord: IHexCoordinate,
  terrain: TerrainType,
): LOSBlockerMetadata {
  return {
    coord,
    terrain,
    icon: 'cover',
    title: `Partial cover through ${terrainLabel(terrain)} at ${hexLabel(coord)}`,
  };
}

function blockedAnnotation(
  coord: IHexCoordinate,
  terrain: TerrainType,
): LOSBlockerMetadata {
  return {
    coord,
    terrain,
    icon: 'wall',
    title: `Blocked by ${terrainLabel(terrain)} at ${hexLabel(coord)}`,
  };
}

export function classifyLOS(
  from: IHexCoordinate,
  to: IHexCoordinate,
  grid: IHexGrid,
  options: LOSClassifierOptions = {},
): LOSClassification {
  const engineResult = calculateLOS(
    from,
    to,
    grid,
    options.fromElevation,
    options.toElevation,
  );

  if (!engineResult.hasLOS) {
    const blockedBy = engineResult.blockedBy;
    const terrain =
      engineResult.blockingTerrain ??
      (blockedBy ? terrainAt(grid, blockedBy) : undefined) ??
      TerrainType.Building;
    const blockerAnnotations = blockedBy
      ? [blockedAnnotation(blockedBy, terrain)]
      : [];

    return {
      state: 'blocked',
      blockers: blockedBy ? [blockedBy] : [],
      blockerAnnotations,
      lineEnd: blockedBy ?? to,
      engineResult,
    };
  }

  const blockerAnnotations = engineResult.interveningHexes
    .map((hex) => {
      const terrain = partialCoverTerrainAt(grid, hex);
      return terrain ? partialCoverAnnotation(hex, terrain) : null;
    })
    .filter(
      (annotation): annotation is LOSBlockerMetadata => annotation !== null,
    );

  if (blockerAnnotations.length > 0) {
    return {
      state: 'partial',
      blockers: blockerAnnotations.map((annotation) => annotation.coord),
      blockerAnnotations,
      lineEnd: to,
      engineResult,
    };
  }

  return {
    state: 'clear',
    blockers: [],
    blockerAnnotations: [],
    lineEnd: to,
    engineResult,
  };
}

export function createLOSClassifier(
  grid: IHexGrid,
  options: LOSClassifierOptions = {},
): (from: IHexCoordinate, to: IHexCoordinate) => LOSClassification {
  const cache = new Map<string, LOSClassification>();

  return (from: IHexCoordinate, to: IHexCoordinate): LOSClassification => {
    const key = [
      coordToKey(from),
      coordToKey(to),
      options.fromElevation ?? 'auto',
      options.toElevation ?? 'auto',
    ].join('|');
    const cached = cache.get(key);
    if (cached) return cached;

    const classification = classifyLOS(from, to, grid, options);
    cache.set(key, classification);
    return classification;
  };
}
