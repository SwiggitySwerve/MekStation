import { describe, expect, it } from '@jest/globals';

import type {
  IHexCoordinate,
  IHexGrid,
  UnitMovementType,
} from './battlemechMovementTerrain.test-helpers';

import {
  Facing,
  MovementType,
  TERRAIN_PROPERTIES,
  TerrainType,
  assertMovementStepConservation,
  calculateAttackerMovementModifier,
  calculateManeuveringAceBipedLateralShiftCost,
  calculateManeuveringAceQuadLateralStepCost,
  calculateMovementHeat,
  calculateTMM,
  canStand,
  coordToKey,
  createHexGrid,
  decomposeMovementSteps,
  deriveMovementRangeHexForDestination,
  deriveReachableHexes,
  findPath,
  getHexMovementCost,
  getStandingCost,
  getValidDestinations,
  maneuveringAceLateralShiftDirection,
  positionAtOrigin,
  setHex,
  standardMove,
  terrainStringFromFeatures,
  unitAtOrigin,
  validateMovement,
} from './battlemechMovementTerrain.test-helpers';

describe('MegaMek per-motive terrain entry costs (audit 2026-06-09 C-3/C-4)', () => {
  // Tag-based variant of setHex for multi-feature / leveled terrain strings.
  function setHexTag(
    grid: IHexGrid,
    coord: IHexCoordinate,
    terrainTag: string,
  ): IHexGrid {
    const key = coordToKey(coord);
    const existingHex = grid.hexes.get(key);
    if (!existingHex) {
      throw new Error(`Hex at ${key} does not exist in grid`);
    }
    const hexes = new Map(grid.hexes);
    hexes.set(key, { ...existingHex, terrain: terrainTag });
    return { ...grid, hexes };
  }

  function costFor(terrainTag: string, movementType: UnitMovementType): number {
    let grid = createHexGrid({ radius: 3 });
    grid = setHexTag(grid, { q: 1, r: 0 }, terrainTag);
    return getHexMovementCost(grid, { q: 1, r: 0 }, movementType, {
      q: 0,
      r: 0,
    });
  }

  function tag(features: readonly { type: TerrainType; level: number }[]) {
    return terrainStringFromFeatures(features);
  }

  // C-3: MegaMek Terrain.movementCost SWAMP = 2, minus 1 for biped/quad meks,
  // 0 for hover/WiGE.
  it('charges meks 1 extra MP for swamp, vehicles 2, hover nothing', () => {
    expect(costFor(TerrainType.Swamp, 'walk')).toBe(2);
    expect(costFor(TerrainType.Swamp, 'run')).toBe(2);
    expect(costFor(TerrainType.Swamp, 'tracked')).toBe(3);
    expect(costFor(TerrainType.Swamp, 'wheeled')).toBe(3);
    expect(costFor(TerrainType.Swamp, 'hover')).toBe(1);
  });

  // C-3: MegaMek Terrain.movementCost MUD exempts hover/WiGE/naval.
  it('charges mud to ground motives but not hover', () => {
    expect(costFor(TerrainType.Mud, 'walk')).toBe(2);
    expect(costFor(TerrainType.Mud, 'tracked')).toBe(2);
    expect(costFor(TerrainType.Mud, 'hover')).toBe(1);
  });

  // C-3: MegaMek Terrain.movementCost SAND charges only non-dune-buggy
  // wheeled (and foot-bound infantry); meks/tracked/hover pay nothing.
  it('charges sand only to wheeled vehicles', () => {
    expect(costFor(TerrainType.Sand, 'walk')).toBe(1);
    expect(costFor(TerrainType.Sand, 'tracked')).toBe(1);
    expect(costFor(TerrainType.Sand, 'hover')).toBe(1);
    expect(costFor(TerrainType.Sand, 'wheeled')).toBe(2);
  });

  // C-3: MegaMek Terrain.movementCost ICE charges 1 to everything except
  // hover/WiGE.
  it('charges ice to ground motives but not hover', () => {
    expect(costFor(TerrainType.Ice, 'walk')).toBe(2);
    expect(costFor(TerrainType.Ice, 'tracked')).toBe(2);
    expect(costFor(TerrainType.Ice, 'hover')).toBe(1);
  });

  // C-3: MegaMek Terrain.movementCost SNOW: level 1 charges wheeled only;
  // level 2 charges everything except hover/WiGE.
  it('charges snow per level and motive', () => {
    expect(costFor(TerrainType.Snow, 'walk')).toBe(1);
    expect(costFor(TerrainType.Snow, 'wheeled')).toBe(2);
    expect(costFor(tag([{ type: TerrainType.Snow, level: 2 }]), 'walk')).toBe(
      2,
    );
    expect(costFor(tag([{ type: TerrainType.Snow, level: 2 }]), 'hover')).toBe(
      1,
    );
  });

  // C-3: MegaMek Terrain.movementCost ROUGH level 2 (ultra) and RUBBLE level 6
  // (ultra) cost 2 instead of 1.
  it('charges ultra rough and ultra rubble one extra MP', () => {
    expect(costFor(tag([{ type: TerrainType.Rough, level: 2 }]), 'walk')).toBe(
      3,
    );
    expect(costFor(tag([{ type: TerrainType.Rubble, level: 6 }]), 'walk')).toBe(
      3,
    );
  });

  // C-4: MegaMek Hex.movementCost sums Terrain.movementCost over every
  // terrain in the hex.
  it('sums entry costs across all terrain features in a hex', () => {
    expect(
      costFor(
        tag([
          { type: TerrainType.Rough, level: 1 },
          { type: TerrainType.LightWoods, level: 1 },
        ]),
        'walk',
      ),
    ).toBe(3);
  });

  // C-4 boundary: a pavement/road/bridge surface bypasses the terrain sum
  // (MegaMek MoveStep: "Account for terrain, unless we're moving along a
  // road"), which is also what the terrain-system stacking requirement pins.
  it('bypasses the terrain sum when moving along a road surface', () => {
    expect(
      costFor(
        tag([
          { type: TerrainType.Road, level: 1 },
          { type: TerrainType.LightWoods, level: 1 },
        ]),
        'walk',
      ),
    ).toBe(1);
  });
});
