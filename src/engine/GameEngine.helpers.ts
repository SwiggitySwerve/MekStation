import type { IWeapon, IAIUnitState } from '@/simulation/ai/types';
import type { IUnitGameState } from '@/types/gameplay/GameSessionInterfaces';
import type {
  IHex,
  IHexGrid,
  IMovementCapability,
} from '@/types/gameplay/HexGridInterfaces';

import { TerrainPreset } from '@/types/encounter';
import {
  TerrainType as GameplayTerrainType,
  type IGeneratedMap,
  type IHexTerrain,
  type ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';
import {
  terrainFeaturesFromString,
  terrainStringFromFeatures,
} from '@/utils/gameplay/terrainEncoding';

import type { IAdaptedUnit } from './types';

const TERRAIN_TYPE_VALUES = new Set<string>(Object.values(GameplayTerrainType));

function toTerrainType(value: string | undefined): GameplayTerrainType {
  if (value && TERRAIN_TYPE_VALUES.has(value)) {
    return value as GameplayTerrainType;
  }
  return GameplayTerrainType.Clear;
}

export function createMinimalGrid(radius: number): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) <= radius) {
        const key = `${q},${r}`;
        hexes.set(key, {
          coord: { q, r },
          occupantId: null,
          terrain: 'clear',
          elevation: 0,
        });
      }
    }
  }
  return { config: { radius }, hexes };
}

export function createGridFromHexTerrain(
  radius: number,
  terrain: readonly IHexTerrain[],
): IHexGrid {
  const base = createMinimalGrid(radius);
  const hexes = new Map(base.hexes);

  for (const tile of terrain) {
    const key = `${tile.coordinate.q},${tile.coordinate.r}`;
    const existing = hexes.get(key);
    if (!existing) continue;
    hexes.set(key, {
      ...existing,
      terrain: terrainStringFromFeatures(tile.features),
      elevation: tile.elevation,
    });
  }

  return { config: { radius }, hexes };
}

export function createGridFromGeneratedMap(
  radius: number,
  generatedMap: IGeneratedMap,
): IHexGrid {
  const terrain = generatedMap.grid.map((tile) => ({
    ...tile,
    coordinate: {
      q: tile.coordinate.q - radius,
      r: tile.coordinate.r - radius,
    },
  }));
  return createGridFromHexTerrain(radius, terrain);
}

export function createGridFromTerrainPreset(
  radius: number,
  preset: string | TerrainPreset | undefined,
): IHexGrid {
  const grid = createMinimalGrid(radius);
  const hexes = new Map(grid.hexes);

  for (const [key, hex] of Array.from(hexes.entries())) {
    const { q, r } = hex.coord;
    const ring = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
    const stripe = Math.abs(q - r);
    let terrain = GameplayTerrainType.Clear;
    let elevation = 0;

    switch (preset) {
      case TerrainPreset.LightWoods:
        terrain =
          (q * 17 + r * 31 + radius) % 5 === 0
            ? GameplayTerrainType.LightWoods
            : GameplayTerrainType.Clear;
        elevation = ring % 4 === 0 ? 1 : 0;
        break;
      case TerrainPreset.HeavyWoods:
        terrain =
          (q * 13 + r * 19 + radius) % 3 === 0
            ? GameplayTerrainType.HeavyWoods
            : (q + r) % 4 === 0
              ? GameplayTerrainType.LightWoods
              : GameplayTerrainType.Clear;
        elevation = ring % 3 === 0 ? 1 : 0;
        break;
      case TerrainPreset.Urban:
        terrain =
          q === 0 || r === 0 || q + r === 0
            ? GameplayTerrainType.Road
            : stripe % 4 === 0
              ? GameplayTerrainType.Building
              : GameplayTerrainType.Pavement;
        elevation = terrain === GameplayTerrainType.Building ? 1 : 0;
        break;
      case TerrainPreset.Rough:
        terrain =
          ring % 2 === 0 || stripe % 5 === 0
            ? GameplayTerrainType.Rough
            : GameplayTerrainType.Clear;
        elevation = Math.min(3, Math.floor(ring / 3));
        break;
      case TerrainPreset.Clear:
      default:
        terrain = GameplayTerrainType.Clear;
        elevation = 0;
    }

    hexes.set(key, { ...hex, terrain, elevation });
  }

  return { config: { radius }, hexes };
}

export function hexTerrainFromGrid(grid: IHexGrid): readonly IHexTerrain[] {
  return Array.from(grid.hexes.values()).map((hex) => {
    const type = toTerrainType(hex.terrain);
    const encodedFeatures = terrainFeaturesFromString(hex.terrain);
    return {
      coordinate: hex.coord,
      elevation: hex.elevation,
      features:
        encodedFeatures.length > 0
          ? encodedFeatures
          : [
              {
                type,
                level: type === GameplayTerrainType.Water ? 1 : 0,
              },
            ],
    };
  });
}

function hasTerrainFeatureMetadata(feature: ITerrainFeature): boolean {
  return (
    feature.constructionFactor !== undefined ||
    feature.buildingId !== undefined ||
    feature.isOnFire !== undefined ||
    feature.isFrozen !== undefined
  );
}

function isDefaultClearFeature(feature: ITerrainFeature): boolean {
  return (
    feature.type === GameplayTerrainType.Clear &&
    feature.level === 0 &&
    !hasTerrainFeatureMetadata(feature)
  );
}

export function seedHexTerrainFromGrid(grid: IHexGrid): readonly IHexTerrain[] {
  return hexTerrainFromGrid(grid).filter(
    (tile) =>
      tile.elevation !== 0 ||
      tile.features.some((feature) => !isDefaultClearFeature(feature)),
  );
}

export function toAIUnitState(
  unit: IUnitGameState,
  weapons: readonly IWeapon[],
  gunnery: number,
): IAIUnitState {
  return {
    unitId: unit.id,
    position: unit.position,
    facing: unit.facing,
    heat: unit.heat,
    weapons,
    ammo: unit.ammo,
    destroyed: unit.destroyed,
    gunnery,
    movementType: unit.movementThisTurn,
    hexesMoved: unit.hexesMovedThisTurn,
    // Audit 2026-06-09 A-9 restoration: `BotPlayer` consumes posture
    // (`prone` gates voluntary go-prone), construction type, and pilot
    // SPA ids (`pilotAbilities` for movement option generation), so the
    // producer must populate them. `prone` defaults to an explicit false
    // because the AI contract is a boolean, never undefined.
    prone: unit.prone ?? false,
    unitType: unit.unitType,
    abilities: unit.abilities,
    // Per `wire-bot-ai-helpers-and-capstone`: propagate retreat latch
    // through to the AI so RetreatAI helpers can read it without a
    // round-trip through the session lookup.
    //
    // Per `add-combat-morale-and-withdrawal` (D6): a unit flagged
    // `isWithdrawing` (player declaration or forced withdrawal) is
    // routed by the move AI exactly like a bot-retreating unit — both
    // entry points converge on the same edge-ward movement scoring.
    // The morale/withdrawal entry point and the bot damage trigger are
    // independent inputs to the SAME machinery, so OR-ing the two
    // latches here never double-withdraws a unit.
    isRetreating: unit.isRetreating || unit.isWithdrawing,
    retreatTargetEdge: unit.retreatTargetEdge,
  };
}

export function toMovementCapability(
  adapted: IAdaptedUnit,
): IMovementCapability {
  const capability: IMovementCapability = {
    walkMP: adapted.walkMP,
    runMP: adapted.runMP,
    jumpMP: adapted.jumpMP,
  };
  return {
    ...capability,
    ...(adapted.movementMode ? { movementMode: adapted.movementMode } : {}),
    ...(adapted.movementHeatProfile
      ? { movementHeatProfile: adapted.movementHeatProfile }
      : {}),
    ...(adapted.movementTerrainProfile
      ? { movementTerrainProfile: adapted.movementTerrainProfile }
      : {}),
    ...(adapted.pavementRoadBonusProfile
      ? { pavementRoadBonusProfile: adapted.pavementRoadBonusProfile }
      : {}),
    ...(adapted.unitHeight !== undefined
      ? { unitHeight: adapted.unitHeight }
      : {}),
    ...(adapted.unitHeightProfile
      ? { unitHeightProfile: adapted.unitHeightProfile }
      : {}),
    ...(adapted.waterCapability
      ? { waterCapability: adapted.waterCapability }
      : {}),
    ...(adapted.standUpCapability
      ? { standUpCapability: adapted.standUpCapability }
      : {}),
  };
}
