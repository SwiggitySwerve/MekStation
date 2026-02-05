import type {
  IHexTerrain,
  ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';

import { TerrainType } from '@/types/gameplay/TerrainTypes';

export interface ParsedBoard {
  width: number;
  height: number;
  hexes: IHexTerrain[];
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

function convertOffsetToAxial(
  col: number,
  row: number,
): { q: number; r: number } {
  const q = col - 1;
  const r = row - 1 - Math.floor((col - 1) / 2);
  return { q, r };
}

function parseTerrainString(terrainStr: string): {
  features: ITerrainFeature[];
  buildingCF?: number;
} {
  if (!terrainStr || terrainStr === '""' || terrainStr === '') {
    return { features: [] };
  }

  const cleaned = terrainStr.replace(/^"|"$/g, '');
  if (!cleaned) {
    return { features: [] };
  }

  const parts = cleaned.split(';');
  const features: ITerrainFeature[] = [];
  let buildingCF: number | undefined;

  for (const part of parts) {
    const [terrainType, levelStr] = part.split(':');

    if (terrainType === 'bldg_cf') {
      buildingCF = parseInt(levelStr, 10);
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

  return { features, buildingCF };
}

export function parseMegaMekBoard(content: string): ParsedBoard {
  const lines = content.split('\n').map((line) => line.trim());

  let width = 0;
  let height = 0;
  const hexes: IHexTerrain[] = [];
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

      if (!/^\d{4}$/.test(coordStr)) {
        throw new Error('Invalid hex coordinate');
      }

      const col = parseInt(coordStr.substring(0, 2), 10);
      const row = parseInt(coordStr.substring(2, 4), 10);
      const elevation = parseInt(elevationStr, 10);

      if (isNaN(elevation)) {
        throw new Error('Invalid elevation');
      }

      const coordinate = convertOffsetToAxial(col, row);
      const { features, buildingCF } = parseTerrainString(terrainStr);

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
      });
    }
  }

  if (!foundSize) {
    throw new Error('Missing size declaration');
  }

  return { width, height, hexes };
}
