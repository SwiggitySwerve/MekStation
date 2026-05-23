import { describe, expect, it } from '@jest/globals';

import type {
  IHex,
  IHexCoordinate,
  IHexGrid,
} from '@/types/gameplay/HexGridInterfaces';

import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';
import {
  classifyLOS,
  createLOSClassifier,
} from '@/utils/overlays/losClassifier';

function createHex(
  q: number,
  r: number,
  terrain: string = TerrainType.Clear,
  elevation = 0,
): IHex {
  return {
    coord: { q, r },
    occupantId: null,
    terrain,
    elevation,
  };
}

function createGrid(hexes: readonly IHex[]): IHexGrid {
  const map = new Map<string, IHex>();
  for (const hex of hexes) {
    map.set(coordToKey(hex.coord), hex);
  }

  return {
    config: { radius: 10 },
    hexes: map,
  };
}

const origin: IHexCoordinate = { q: 0, r: 0 };
const target: IHexCoordinate = { q: 2, r: 0 };

describe('losClassifier', () => {
  it('classifies clear LOS with no blockers', () => {
    const grid = createGrid([
      createHex(0, 0),
      createHex(1, 0),
      createHex(2, 0),
    ]);

    const result = classifyLOS(origin, target, grid);

    expect(result.state).toBe('clear');
    expect(result.blockers).toEqual([]);
    expect(result.blockerAnnotations).toEqual([]);
    expect(result.lineEnd).toEqual(target);
    expect(result.engineResult.hasLOS).toBe(true);
  });

  it('classifies light woods as partial cover when LOS exists', () => {
    const grid = createGrid([
      createHex(0, 0),
      createHex(1, 0, TerrainType.LightWoods),
      createHex(2, 0),
    ]);

    const result = classifyLOS(origin, target, grid);

    expect(result.state).toBe('partial');
    expect(result.blockers).toEqual([{ q: 1, r: 0 }]);
    expect(result.blockerAnnotations).toEqual([
      expect.objectContaining({
        coord: { q: 1, r: 0 },
        terrain: TerrainType.LightWoods,
        icon: 'cover',
      }),
    ]);
    expect(result.blockerAnnotations[0].title).toContain('light woods');
    expect(result.engineResult.hasLOS).toBe(true);
  });

  it('classifies a single heavy woods hex as partial instead of blocked', () => {
    const grid = createGrid([
      createHex(0, 0),
      createHex(1, 0, TerrainType.HeavyWoods),
      createHex(2, 0),
    ]);

    const result = classifyLOS(origin, target, grid);

    expect(result.state).toBe('partial');
    expect(result.blockerAnnotations[0]).toEqual(
      expect.objectContaining({
        coord: { q: 1, r: 0 },
        terrain: TerrainType.HeavyWoods,
        icon: 'cover',
      }),
    );
    expect(result.engineResult.hasLOS).toBe(true);
  });

  it('blocks LOS when cumulative woods exceeds the MegaMek threshold', () => {
    const grid = createGrid([
      createHex(0, 0),
      createHex(1, 0, TerrainType.HeavyWoods),
      createHex(2, 0, TerrainType.LightWoods),
      createHex(3, 0),
    ]);

    const result = classifyLOS(origin, { q: 3, r: 0 }, grid);

    expect(result.state).toBe('blocked');
    expect(result.blockers).toEqual([{ q: 2, r: 0 }]);
    expect(result.blockerAnnotations[0]).toEqual(
      expect.objectContaining({
        coord: { q: 2, r: 0 },
        terrain: TerrainType.LightWoods,
        icon: 'wall',
      }),
    );
    expect(result.engineResult.hasLOS).toBe(false);
    expect(result.engineResult.blockingTerrain).toBe(TerrainType.LightWoods);
  });

  it('classifies light smoke as an intervening LOS modifier', () => {
    const grid = createGrid([
      createHex(0, 0),
      createHex(1, 0, TerrainType.Smoke),
      createHex(2, 0),
    ]);

    const result = classifyLOS(origin, target, grid);

    expect(result.state).toBe('partial');
    expect(result.blockers).toEqual([{ q: 1, r: 0 }]);
    expect(result.blockerAnnotations[0]).toEqual(
      expect.objectContaining({
        coord: { q: 1, r: 0 },
        terrain: TerrainType.Smoke,
        icon: 'cover',
        title: 'Partial cover through smoke at (1, 0)',
      }),
    );
    expect(result.engineResult.hasLOS).toBe(true);
    expect(result.engineResult.interveningTerrainEffects).toEqual([
      {
        coord: { q: 1, r: 0 },
        terrain: TerrainType.Smoke,
        modifier: 1,
      },
    ]);
  });

  it('blocks LOS when smoke and woods cumulatively exceed MegaMek density', () => {
    const grid = createGrid([
      createHex(0, 0),
      createHex(
        1,
        0,
        terrainStringFromFeatures([{ type: TerrainType.Smoke, level: 2 }]),
      ),
      createHex(2, 0, TerrainType.LightWoods),
      createHex(3, 0),
    ]);

    const result = classifyLOS(origin, { q: 3, r: 0 }, grid);

    expect(result.state).toBe('blocked');
    expect(result.blockers).toEqual([{ q: 2, r: 0 }]);
    expect(result.blockerAnnotations[0]).toEqual(
      expect.objectContaining({
        coord: { q: 2, r: 0 },
        terrain: TerrainType.LightWoods,
        icon: 'wall',
      }),
    );
    expect(result.engineResult.hasLOS).toBe(false);
    expect(result.engineResult.interveningTerrainEffects).toEqual([
      {
        coord: { q: 1, r: 0 },
        terrain: TerrainType.Smoke,
        modifier: 2,
      },
      {
        coord: { q: 2, r: 0 },
        terrain: TerrainType.LightWoods,
        modifier: 1,
      },
    ]);
  });

  it('stacks smoke and woods in the same hex before classifying LOS blockers', () => {
    const grid = createGrid([
      createHex(0, 0),
      createHex(
        1,
        0,
        terrainStringFromFeatures([
          { type: TerrainType.Smoke, level: 1 },
          { type: TerrainType.HeavyWoods, level: 1 },
        ]),
      ),
      createHex(2, 0),
    ]);

    const result = classifyLOS(origin, target, grid);

    expect(result.state).toBe('blocked');
    expect(result.blockers).toEqual([{ q: 1, r: 0 }]);
    expect(result.blockerAnnotations[0]).toEqual(
      expect.objectContaining({
        coord: { q: 1, r: 0 },
        terrain: TerrainType.HeavyWoods,
        icon: 'wall',
        title: 'Blocked by smoke and heavy woods at (1, 0)',
      }),
    );
    expect(result.engineResult.hasLOS).toBe(false);
    expect(result.engineResult.interveningTerrainEffects).toEqual([
      {
        coord: { q: 1, r: 0 },
        terrain: TerrainType.Smoke,
        modifier: 1,
      },
      {
        coord: { q: 1, r: 0 },
        terrain: TerrainType.HeavyWoods,
        modifier: 2,
      },
    ]);
  });

  it('classifies heavy woods as clear when elevation lets LOS pass over it', () => {
    const grid = createGrid([
      createHex(0, 0, TerrainType.Clear, 3),
      createHex(1, 0, TerrainType.HeavyWoods, 0),
      createHex(2, 0, TerrainType.Clear, 3),
    ]);

    const result = classifyLOS(origin, target, grid);

    expect(result.state).toBe('clear');
    expect(result.blockerAnnotations).toEqual([]);
    expect(result.engineResult.hasLOS).toBe(true);
  });

  it('classifies a level-1 building equal to mech height as clear LOS', () => {
    const grid = createGrid([
      createHex(0, 0),
      createHex(1, 0, TerrainType.Building),
      createHex(2, 0),
    ]);

    const result = classifyLOS(origin, target, grid);

    expect(result.state).toBe('clear');
    expect(result.blockers).toEqual([]);
    expect(result.blockerAnnotations).toEqual([]);
    expect(result.engineResult.hasLOS).toBe(true);
  });

  it('classifies a blocking building through the existing LOS result', () => {
    const grid = createGrid([
      createHex(0, 0),
      createHex(
        1,
        0,
        terrainStringFromFeatures([{ type: TerrainType.Building, level: 2 }]),
      ),
      createHex(2, 0),
    ]);

    const result = classifyLOS(origin, target, grid);

    expect(result.state).toBe('blocked');
    expect(result.blockers).toEqual([{ q: 1, r: 0 }]);
    expect(result.blockerAnnotations).toEqual([
      expect.objectContaining({
        coord: { q: 1, r: 0 },
        terrain: TerrainType.Building,
        icon: 'wall',
      }),
    ]);
    expect(result.lineEnd).toEqual({ q: 1, r: 0 });
    expect(result.engineResult.hasLOS).toBe(false);
  });

  it('classifies a level-1 ridge equal to mech height as clear LOS', () => {
    const grid = createGrid([
      createHex(0, 0),
      createHex(1, 0, TerrainType.Clear, 1),
      createHex(2, 0),
    ]);

    const result = classifyLOS(origin, target, grid);

    expect(result.state).toBe('clear');
    expect(result.blockers).toEqual([]);
    expect(result.blockerAnnotations).toEqual([]);
    expect(result.engineResult.hasLOS).toBe(true);
  });

  it('classifies an intervening elevation ridge as a blocker without inventing terrain', () => {
    const grid = createGrid([
      createHex(0, 0),
      createHex(1, 0, TerrainType.Clear, 2),
      createHex(2, 0),
    ]);

    const result = classifyLOS(origin, target, grid);

    expect(result.state).toBe('blocked');
    expect(result.blockers).toEqual([{ q: 1, r: 0 }]);
    expect(result.blockerAnnotations).toEqual([
      expect.objectContaining({
        coord: { q: 1, r: 0 },
        icon: 'wall',
        title: 'Blocked by elevation +2 at (1, 0)',
      }),
    ]);
    expect(result.engineResult.hasLOS).toBe(false);
    expect(result.engineResult.blockingElevation).toBe(2);
    expect(result.engineResult.blockingTerrain).toBeUndefined();
  });

  it('keeps LOS clear when elevation lets the engine see over blocking terrain', () => {
    const grid = createGrid([
      createHex(0, 0, TerrainType.Clear, 3),
      createHex(1, 0, TerrainType.Building, 0),
      createHex(2, 0, TerrainType.Clear, 3),
    ]);

    const result = classifyLOS(origin, target, grid);

    expect(result.state).toBe('clear');
    expect(result.blockers).toEqual([]);
    expect(result.engineResult.hasLOS).toBe(true);
  });

  it('creates a reusable classifier scoped to the current grid and elevations', () => {
    const grid = createGrid([
      createHex(0, 0),
      createHex(1, 0, TerrainType.LightWoods),
      createHex(2, 0),
    ]);
    const classifier = createLOSClassifier(grid);

    const first = classifier(origin, target);
    const second = classifier({ ...origin }, { ...target });

    expect(first).toBe(second);
    expect(first.state).toBe('partial');
  });
});
