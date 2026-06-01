import type {
  IHexTerrain,
  ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';

import { AXIAL_DIRECTION_DELTAS } from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';

export interface ParsedBoard {
  width: number;
  height: number;
  hexes: IHexTerrain[];
}

interface ParsedHexTerrain extends IHexTerrain {
  readonly cliffTopExitMask?: number;
}

const TERRAIN_MAP: Record<string, (level: number) => TerrainType | null> = {
  woods: (level) =>
    level === 1 ? TerrainType.LightWoods : TerrainType.HeavyWoods,
  water: () => TerrainType.Water,
  rough: () => TerrainType.Rough,
  rubble: () => TerrainType.Rubble,
  pavement: () => TerrainType.Pavement,
  road: () => TerrainType.Road,
  building: () => TerrainType.Building,
  mud: () => TerrainType.Mud,
  sand: () => TerrainType.Sand,
  snow: () => TerrainType.Snow,
  ice: () => TerrainType.Ice,
  swamp: () => TerrainType.Swamp,
};

const CLIFF_TOP_TERRAIN = 'cliff_top';

function convertOffsetToAxial(
  col: number,
  row: number,
): { q: number; r: number } {
  const q = col - 1;
  const r = row - 1 - Math.floor((col - 1) / 2);
  return { q, r };
}

function formatMegaMekBoardCoordinatePart(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

function parseMegaMekBoardCoordinate(
  coordStr: string,
  width: number,
  height: number,
  hexIndex: number,
): { col: number; row: number } {
  if (!/^\d{4,}$/.test(coordStr)) {
    throw new Error('Invalid hex coordinate');
  }

  const candidates: Array<{ col: number; row: number }> = [];

  for (let splitIndex = 2; splitIndex <= coordStr.length - 2; splitIndex++) {
    const col = parseInt(coordStr.slice(0, splitIndex), 10);
    const row = parseInt(coordStr.slice(splitIndex), 10);

    if (
      col < 1 ||
      col > width ||
      row < 1 ||
      row > height ||
      `${formatMegaMekBoardCoordinatePart(col)}${formatMegaMekBoardCoordinatePart(row)}` !==
        coordStr
    ) {
      continue;
    }

    candidates.push({ col, row });
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  const rowOrderCoordinate = {
    col: (hexIndex % width) + 1,
    row: Math.floor(hexIndex / width) + 1,
  };
  const rowOrderCandidate = candidates.find(
    (candidate) =>
      candidate.col === rowOrderCoordinate.col &&
      candidate.row === rowOrderCoordinate.row,
  );

  if (rowOrderCandidate) {
    return rowOrderCandidate;
  }

  throw new Error('Invalid hex coordinate');
}

function parseTerrainString(terrainStr: string): {
  features: ITerrainFeature[];
  buildingCF?: number;
  cliffTopExitMask?: number;
} {
  if (!terrainStr || terrainStr === '""' || terrainStr === '') {
    return { features: [] };
  }

  const cleaned =
    terrainStr.match(/^"([^"]*)"/)?.[1] ?? terrainStr.replace(/^"|"$/g, '');
  if (!cleaned) {
    return { features: [] };
  }

  const parts = cleaned.split(';');
  const features: ITerrainFeature[] = [];
  let buildingCF: number | undefined;
  let cliffTopExitMask: number | undefined;

  for (const part of parts) {
    const [terrainType, levelStr, exitMaskStr] = part.split(':');

    if (terrainType === 'bldg_cf') {
      buildingCF = parseInt(levelStr, 10);
      continue;
    }

    if (terrainType === CLIFF_TOP_TERRAIN) {
      const parsedExitMask = parseInt(exitMaskStr ?? '', 10);
      if (!isNaN(parsedExitMask)) {
        cliffTopExitMask = parsedExitMask;
      }
      continue;
    }

    const mapper = TERRAIN_MAP[terrainType];
    if (!mapper) {
      continue;
    }

    const level = parseInt(levelStr, 10);
    if (isNaN(level)) {
      continue;
    }

    const type = mapper(level);
    if (!type) {
      continue;
    }

    features.push({ type, level });
  }

  return { features, buildingCF, cliffTopExitMask };
}

function coordinateKey(coordinate: { q: number; r: number }): string {
  return `${coordinate.q},${coordinate.r}`;
}

function exitMaskToDirections(exitMask: number): number[] {
  const directions: number[] = [];
  for (
    let direction = 0;
    direction < AXIAL_DIRECTION_DELTAS.length;
    direction++
  ) {
    if ((exitMask & (1 << direction)) !== 0) {
      directions.push(direction);
    }
  }
  return directions;
}

function validCliffTopDirections(
  hex: ParsedHexTerrain,
  byCoordinate: ReadonlyMap<string, ParsedHexTerrain>,
): readonly number[] {
  if (!hex.cliffTopExitMask) return [];

  return exitMaskToDirections(hex.cliffTopExitMask).filter((direction) => {
    const delta = AXIAL_DIRECTION_DELTAS[direction];
    const neighbor = byCoordinate.get(
      coordinateKey({
        q: hex.coordinate.q + delta.q,
        r: hex.coordinate.r + delta.r,
      }),
    );
    if (!neighbor) return false;

    const elevationDrop = hex.elevation - neighbor.elevation;
    return elevationDrop === 1 || elevationDrop === 2;
  });
}

function applyCliffTopExits(hexes: readonly ParsedHexTerrain[]): IHexTerrain[] {
  const byCoordinate = new Map<string, ParsedHexTerrain>(
    hexes.map((hex) => [coordinateKey(hex.coordinate), hex]),
  );

  return hexes.map((hex) => {
    const cliffTopExits = validCliffTopDirections(hex, byCoordinate);
    if (cliffTopExits.length === 0) {
      return {
        coordinate: hex.coordinate,
        elevation: hex.elevation,
        features: hex.features,
      };
    }

    const [firstFeature, ...remainingFeatures] = hex.features;
    const featureWithCliffExits: ITerrainFeature = {
      ...(firstFeature ?? { type: TerrainType.Clear, level: 0 }),
      cliffTopExits,
    };

    return {
      coordinate: hex.coordinate,
      elevation: hex.elevation,
      features: [featureWithCliffExits, ...remainingFeatures],
    };
  });
}

export function parseMegaMekBoard(content: string): ParsedBoard {
  const lines = content.split('\n').map((line) => line.trim());

  let width = 0;
  let height = 0;
  const hexes: ParsedHexTerrain[] = [];
  let foundSize = false;

  for (const line of lines) {
    if (!line || line.startsWith('option') || line === 'end') {
      continue;
    }

    if (line.startsWith('size ')) {
      const parts = line.substring(5).trim().split(/\s+/);
      if (parts.length !== 2) {
        throw new Error('Invalid size format');
      }

      width = parseInt(parts[0], 10);
      height = parseInt(parts[1], 10);

      if (isNaN(width) || isNaN(height)) {
        throw new Error('Invalid size format');
      }

      foundSize = true;
      continue;
    }

    if (line.startsWith('hex ')) {
      if (!foundSize) {
        throw new Error('Missing size declaration');
      }

      const parts = line.substring(4).trim().split(/\s+/);
      if (parts.length < 3) {
        continue;
      }

      const coordStr = parts[0];
      const elevationStr = parts[1];
      const terrainStr = parts.slice(2).join(' ');

      const { col, row } = parseMegaMekBoardCoordinate(
        coordStr,
        width,
        height,
        hexes.length,
      );
      const elevation = parseInt(elevationStr, 10);

      if (isNaN(elevation)) {
        throw new Error('Invalid elevation');
      }

      const coordinate = convertOffsetToAxial(col, row);
      const { features, buildingCF, cliffTopExitMask } =
        parseTerrainString(terrainStr);

      if (buildingCF !== undefined) {
        const buildingFeature = features.find(
          (f) => f.type === TerrainType.Building,
        );
        if (buildingFeature) {
          const index = features.indexOf(buildingFeature);
          features[index] = {
            ...buildingFeature,
            constructionFactor: buildingCF,
          };
        }
      }

      hexes.push({
        coordinate,
        elevation,
        features,
        cliffTopExitMask,
      });
    }
  }

  if (!foundSize) {
    throw new Error('Missing size declaration');
  }

  return { width, height, hexes: applyCliffTopExits(hexes) };
}
