import { Facing, FiringArc, IHexCoordinate, IHexGrid } from '@/types/gameplay';

import { determineArc } from '../firingArcs';
import { hexNeighbor } from '../hexMath';
import {
  BATTLEMECH_DISPLACEMENT_WOODS_TERRAINS,
  BATTLEMECH_OVERGROWN_DISPLACEMENT_LIMIT,
  BATTLEMECH_PROHIBITED_DISPLACEMENT_TERRAINS,
  type IDisplacementTerrainFeature,
} from './displacementValidationTypes';

function normalizeTerrainToken(type: string): string {
  return type.trim().toLowerCase().replaceAll('-', '_');
}

function defaultTerrainLevel(type: string): number {
  switch (type) {
    case 'light_woods':
      return 1;
    case 'heavy_woods':
      return 2;
    case 'ultra_woods':
      return 3;
    default:
      return 1;
  }
}

function terrainFeature(
  type: string,
  level?: unknown,
): IDisplacementTerrainFeature {
  const normalized = normalizeTerrainToken(type);
  const parsedLevel =
    typeof level === 'number' && Number.isFinite(level)
      ? Math.floor(level)
      : Number.NaN;
  return {
    type: normalized,
    level: parsedLevel > 0 ? parsedLevel : defaultTerrainLevel(normalized),
  };
}

/** Parses terrain strings (token or JSON feature list) for displacement checks. */
export function terrainFeatures(
  terrain: string,
): readonly IDisplacementTerrainFeature[] {
  const trimmed = terrain.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    try {
      const features = JSON.parse(trimmed) as unknown;
      if (!Array.isArray(features)) return [];
      return features.flatMap((feature) =>
        typeof feature === 'object' &&
        feature !== null &&
        'type' in feature &&
        typeof feature.type === 'string'
          ? [
              terrainFeature(
                feature.type,
                'level' in feature ? feature.level : undefined,
              ),
            ]
          : [],
      );
    } catch {
      return [];
    }
  }

  const [type = '', level] = trimmed.split(':');
  return [terrainFeature(type, Number(level))];
}

/** True when BattleMech displacement into this terrain is prohibited. */
export function isBattleMechDisplacementTerrainProhibited(
  terrain: string,
): boolean {
  return terrainFeatures(terrain).some((feature) => {
    if (BATTLEMECH_PROHIBITED_DISPLACEMENT_TERRAINS.has(feature.type)) {
      return true;
    }
    if (
      BATTLEMECH_DISPLACEMENT_WOODS_TERRAINS.has(feature.type) &&
      feature.level > BATTLEMECH_OVERGROWN_DISPLACEMENT_LIMIT
    ) {
      return true;
    }
    return (
      feature.type === 'jungle' &&
      feature.level > BATTLEMECH_OVERGROWN_DISPLACEMENT_LIMIT
    );
  });
}

/** Stable map key for hex coordinates. */
export function coordKey(coord: IHexCoordinate): string {
  return `${coord.q},${coord.r}`;
}

/** Exact coordinate equality. */
export function sameCoord(a: IHexCoordinate, b: IHexCoordinate): boolean {
  return a.q === b.q && a.r === b.r;
}

/** Occupant id at a hex, if any. */
export function occupantAt(grid: IHexGrid, coord: IHexCoordinate): string | null {
  return grid.hexes.get(coordKey(coord))?.occupantId ?? null;
}

/**
 * Per Resolved Q3: thin wrapper over `hexNeighbor` to mirror MegaMek's
 * `Coords.translated(facing)` API name. `facing` is the integer 0-5
 * encoding from `Facing`.
 */
export function translateHex(
  coord: IHexCoordinate,
  facing: Facing,
): IHexCoordinate {
  return hexNeighbor(coord, facing);
}

/** Translate a hex along a facing by multiple steps. */
export function translateHexByRange(
  coord: IHexCoordinate,
  facing: Facing,
  range: number,
): IHexCoordinate {
  let translated = coord;
  for (let step = 0; step < range; step++) {
    translated = translateHex(translated, facing);
  }
  return translated;
}

/** Facing from source to an adjacent destination, if adjacent. */
export function directionFromAdjacent(
  source: IHexCoordinate,
  destination: IHexCoordinate,
): Facing | undefined {
  for (let facing = 0; facing < 6; facing++) {
    const translated = translateHex(source, facing as Facing);
    if (translated.q === destination.q && translated.r === destination.r) {
      return facing as Facing;
    }
  }
  return undefined;
}

/** True when two hexes share an edge. */
export function isAdjacent(a: IHexCoordinate, b: IHexCoordinate): boolean {
  return directionFromAdjacent(a, b) !== undefined;
}

/**
 * Push legality uses the attacker's feet facing, not just adjacency:
 * MegaMek requires the target to occupy `attacker.position.translated(facing)`.
 */
export function isTargetDirectlyAhead(
  attackerPosition: IHexCoordinate,
  attackerFacing: Facing,
  targetPosition: IHexCoordinate,
): boolean {
  const directlyAhead = translateHex(attackerPosition, attackerFacing);
  return (
    directlyAhead.q === targetPosition.q && directlyAhead.r === targetPosition.r
  );
}

/** True when the target hex is in the attacker's front firing arc. */
export function isTargetInFrontArc(
  attackerPosition: IHexCoordinate,
  attackerFacing: Facing,
  targetPosition: IHexCoordinate,
): boolean {
  return (
    determineArc(
      {
        unitId: 'attacker',
        coord: attackerPosition,
        facing: attackerFacing,
        prone: false,
      },
      targetPosition,
    ).arc === FiringArc.Front
  );
}

/** True when a friendly unit occupies the destination hex. */
export function isFriendlyOccupiedDestination(
  grid: IHexGrid,
  coord: IHexCoordinate,
  friendlyUnitIds: ReadonlySet<string>,
): boolean {
  const occupantId = occupantAt(grid, coord);
  return occupantId !== null && friendlyUnitIds.has(occupantId);
}
