import type {
  IHexCoordinate,
  IHexGrid,
} from '@/types/gameplay/HexGridInterfaces';
import type { ILOSResult } from '@/utils/gameplay/lineOfSight';

import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { coordToKey } from '@/utils/gameplay/hexMath';
import {
  calculateLOS,
  formatLOSBlockedDetails,
  parseTerrainFeatures,
} from '@/utils/gameplay/lineOfSight';

export type LOSOverlayState = 'clear' | 'partial' | 'blocked';
export type LOSBlockerIcon = 'cover' | 'wall';

export interface LOSBlockerMetadata {
  readonly coord: IHexCoordinate;
  readonly terrain?: TerrainType;
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
  TerrainType.Smoke,
];

function terrainLabel(terrain: TerrainType): string {
  return terrain.replace(/_/g, ' ');
}

function terrainListLabel(terrains: readonly TerrainType[]): string {
  const labels = terrains.map(terrainLabel);
  if (labels.length <= 1) return labels[0] ?? 'terrain';
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
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

function partialCoverAnnotation(
  coord: IHexCoordinate,
  terrain: TerrainType,
  terrains: readonly TerrainType[] = [terrain],
): LOSBlockerMetadata {
  return {
    coord,
    terrain,
    icon: 'cover',
    title: `Partial cover through ${terrainListLabel(terrains)} at ${hexLabel(coord)}`,
  };
}

function blockedAnnotation(
  coord: IHexCoordinate,
  terrain: TerrainType,
  title = `Blocked by ${terrainLabel(terrain)} at ${hexLabel(coord)}`,
): LOSBlockerMetadata {
  return {
    coord,
    terrain,
    icon: 'wall',
    title,
  };
}

function elevationAnnotation(
  coord: IHexCoordinate,
  elevation: number,
): LOSBlockerMetadata {
  return {
    coord,
    icon: 'wall',
    title: `Blocked by elevation ${elevation >= 0 ? `+${elevation}` : elevation} at ${hexLabel(coord)}`,
  };
}

function partialCoverAnnotationsFromEffects(
  effects: ILOSResult['interveningTerrainEffects'],
): readonly LOSBlockerMetadata[] {
  const groups = new Map<
    string,
    { coord: IHexCoordinate; terrains: TerrainType[] }
  >();

  for (const effect of effects) {
    if (!PARTIAL_COVER_TERRAINS.includes(effect.terrain)) continue;
    const key = coordToKey(effect.coord);
    const group = groups.get(key);
    if (group) {
      group.terrains.push(effect.terrain);
      continue;
    }
    groups.set(key, { coord: effect.coord, terrains: [effect.terrain] });
  }

  return Array.from(groups.values(), ({ coord, terrains }) =>
    partialCoverAnnotation(coord, terrains[0], Array.from(new Set(terrains))),
  );
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
    const blockerAnnotations = blockedBy
      ? [
          engineResult.blockingElevation !== undefined
            ? elevationAnnotation(blockedBy, engineResult.blockingElevation)
            : blockedAnnotation(
                blockedBy,
                engineResult.blockingTerrain ??
                  terrainAt(grid, blockedBy) ??
                  TerrainType.Building,
                formatLOSBlockedDetails(engineResult),
              ),
        ]
      : [];

    return {
      state: 'blocked',
      blockers: blockedBy ? [blockedBy] : [],
      blockerAnnotations:
        blockerAnnotations.length > 0
          ? blockerAnnotations
          : blockedBy
            ? [
                {
                  coord: blockedBy,
                  icon: 'wall',
                  title: formatLOSBlockedDetails(engineResult),
                },
              ]
            : [],
      lineEnd: blockedBy ?? to,
      engineResult,
    };
  }

  const blockerAnnotations = partialCoverAnnotationsFromEffects(
    engineResult.interveningTerrainEffects,
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
