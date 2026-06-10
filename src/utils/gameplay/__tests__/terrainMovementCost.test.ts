/**
 * Tests for the shared terrain movement-cost utility.
 *
 * Covers the `Shared Terrain Movement-Cost Utility` requirement of
 * `add-ai-terrain-aware-movement` — scenarios "Open ground costs one movement
 * point" and "Heavy terrain costs more than open ground" — plus determinism
 * and the grid-tag adapter the AI pathfinder consults.
 *
 * @spec openspec/changes/add-ai-terrain-aware-movement/specs/simulation-system/spec.md
 *   Requirement: Shared Terrain Movement-Cost Utility
 */

import type { IHex, IHexTerrain, ITerrainFeature } from '@/types/gameplay';

import { TerrainType } from '@/types/gameplay';
import {
  getHexMovementCostFromTerrainTag,
  getPrimaryTerrainFeature,
  getTerrainFeatureMovementCostModifier,
  getTerrainMovementCost,
} from '@/utils/gameplay/terrainMovementCost';

function terrain(features: ITerrainFeature[]): IHexTerrain {
  return { coordinate: { q: 0, r: 0 }, elevation: 0, features };
}

function feature(type: TerrainType, level = 1): ITerrainFeature {
  return { type, level };
}

function hex(tag: string): IHex {
  return {
    coord: { q: 0, r: 0 },
    occupantId: null,
    terrain: tag,
    elevation: 0,
  };
}

describe('getTerrainMovementCost', () => {
  it('returns 1 for a hex with no terrain features (open ground)', () => {
    expect(getTerrainMovementCost(terrain([]))).toBe(1);
  });

  it('returns 1 for an absent hex terrain', () => {
    expect(getTerrainMovementCost(undefined)).toBe(1);
  });

  it('returns 1 for clear terrain', () => {
    expect(getTerrainMovementCost(terrain([feature(TerrainType.Clear)]))).toBe(
      1,
    );
  });

  it('returns a value greater than 1 for heavy woods', () => {
    const cost = getTerrainMovementCost(
      terrain([feature(TerrainType.HeavyWoods)]),
    );
    expect(cost).toBeGreaterThan(1);
    // Heavy woods adds walk modifier 2 on top of the base 1.
    expect(cost).toBe(3);
  });

  it('returns a value greater than 1 for light woods', () => {
    const cost = getTerrainMovementCost(
      terrain([feature(TerrainType.LightWoods)]),
    );
    expect(cost).toBeGreaterThan(1);
    expect(cost).toBe(2);
  });

  it('heavy woods costs more to enter than light woods', () => {
    const heavy = getTerrainMovementCost(
      terrain([feature(TerrainType.HeavyWoods)]),
    );
    const light = getTerrainMovementCost(
      terrain([feature(TerrainType.LightWoods)]),
    );
    expect(heavy).toBeGreaterThan(light);
  });

  it('is deterministic for a given terrain', () => {
    const t = terrain([feature(TerrainType.HeavyWoods)]);
    const first = getTerrainMovementCost(t);
    const second = getTerrainMovementCost(t);
    const third = getTerrainMovementCost(t);
    expect(first).toBe(second);
    expect(second).toBe(third);
  });

  it('uses the highest-layer feature when a hex stacks features', () => {
    // Woods over rough — woods is the primary (higher layer) feature.
    const cost = getTerrainMovementCost(
      terrain([feature(TerrainType.Rough), feature(TerrainType.HeavyWoods)]),
    );
    expect(cost).toBe(3);
  });
});

describe('getPrimaryTerrainFeature', () => {
  it('returns null for an empty or absent hex terrain', () => {
    expect(getPrimaryTerrainFeature(undefined)).toBeNull();
    expect(getPrimaryTerrainFeature(terrain([]))).toBeNull();
  });

  it('returns the single feature when only one is present', () => {
    const result = getPrimaryTerrainFeature(
      terrain([feature(TerrainType.LightWoods, 2)]),
    );
    expect(result?.type).toBe(TerrainType.LightWoods);
    expect(result?.level).toBe(2);
  });
});

describe('getHexMovementCostFromTerrainTag', () => {
  it('returns 1 for an open / clear grid hex', () => {
    expect(getHexMovementCostFromTerrainTag(hex('clear'))).toBe(1);
  });

  it('returns 1 for an unrecognised terrain tag', () => {
    expect(getHexMovementCostFromTerrainTag(hex('not-a-terrain'))).toBe(1);
  });

  it('returns 1 for an absent hex', () => {
    expect(getHexMovementCostFromTerrainTag(undefined)).toBe(1);
  });

  it('returns 3 for a heavy-woods grid hex', () => {
    expect(getHexMovementCostFromTerrainTag(hex(TerrainType.HeavyWoods))).toBe(
      3,
    );
  });

  it('returns 2 for a light-woods grid hex', () => {
    expect(getHexMovementCostFromTerrainTag(hex(TerrainType.LightWoods))).toBe(
      2,
    );
  });

  it('agrees with getTerrainMovementCost for the equivalent feature', () => {
    for (const type of [
      TerrainType.Clear,
      TerrainType.LightWoods,
      TerrainType.HeavyWoods,
      TerrainType.Rough,
      TerrainType.Swamp,
    ]) {
      const tagCost = getHexMovementCostFromTerrainTag(hex(type));
      const featureCost = getTerrainMovementCost(terrain([feature(type)]));
      expect(tagCost).toBe(featureCost);
    }
  });
});

describe('getTerrainFeatureMovementCostModifier (audit 2026-06-09 C-3)', () => {
  // Mirrors MegaMek Terrain.movementCost per-motive and per-level branches.
  it('applies per-motive swamp, sand, mud, and ice costs', () => {
    const swamp = feature(TerrainType.Swamp);
    expect(getTerrainFeatureMovementCostModifier(swamp, 'walk')).toBe(1);
    expect(getTerrainFeatureMovementCostModifier(swamp, 'tracked')).toBe(2);
    expect(getTerrainFeatureMovementCostModifier(swamp, 'hover')).toBe(0);

    const sand = feature(TerrainType.Sand);
    expect(getTerrainFeatureMovementCostModifier(sand, 'walk')).toBe(0);
    expect(getTerrainFeatureMovementCostModifier(sand, 'wheeled')).toBe(1);
    expect(getTerrainFeatureMovementCostModifier(sand, 'hover')).toBe(0);

    const mud = feature(TerrainType.Mud);
    expect(getTerrainFeatureMovementCostModifier(mud, 'walk')).toBe(1);
    expect(getTerrainFeatureMovementCostModifier(mud, 'hover')).toBe(0);

    const ice = feature(TerrainType.Ice);
    expect(getTerrainFeatureMovementCostModifier(ice, 'walk')).toBe(1);
    expect(getTerrainFeatureMovementCostModifier(ice, 'hover')).toBe(0);
  });

  it('applies level-dependent snow, ultra rough, and ultra rubble costs', () => {
    expect(
      getTerrainFeatureMovementCostModifier(feature(TerrainType.Snow), 'walk'),
    ).toBe(0);
    expect(
      getTerrainFeatureMovementCostModifier(
        feature(TerrainType.Snow),
        'wheeled',
      ),
    ).toBe(1);
    expect(
      getTerrainFeatureMovementCostModifier(
        feature(TerrainType.Snow, 2),
        'walk',
      ),
    ).toBe(1);
    expect(
      getTerrainFeatureMovementCostModifier(
        feature(TerrainType.Snow, 2),
        'hover',
      ),
    ).toBe(0);
    expect(
      getTerrainFeatureMovementCostModifier(
        feature(TerrainType.Rough, 2),
        'walk',
      ),
    ).toBe(2);
    expect(
      getTerrainFeatureMovementCostModifier(
        feature(TerrainType.Rubble, 6),
        'walk',
      ),
    ).toBe(2);
    // Airborne motives never pay ground terrain even at ultra levels.
    expect(
      getTerrainFeatureMovementCostModifier(
        feature(TerrainType.Rough, 2),
        'vtol',
      ),
    ).toBe(0);
  });
});
