import type { IHexTerrain, IUnitToken } from '@/types/gameplay';

import { Facing, GameSide, TerrainType, TokenUnitType } from '@/types/gameplay';

import {
  buildIsometricSceneItems,
  type IsometricSceneItem,
} from '../HexMapDisplay.isometric';
import { deriveIsometricTerrainOcclusionInfo } from '../projection';

function makeTerrain(
  q: number,
  r: number,
  elevation: number,
  type: TerrainType = TerrainType.Clear,
): IHexTerrain {
  return {
    coordinate: { q, r },
    elevation,
    features: [{ type, level: 0 }],
  };
}

function makeTerrainLookup(
  terrain: readonly IHexTerrain[],
): ReadonlyMap<string, IHexTerrain> {
  return new Map(
    terrain.map((hexTerrain) => [
      `${hexTerrain.coordinate.q},${hexTerrain.coordinate.r}`,
      hexTerrain,
    ]),
  );
}

function makeToken(overrides: Partial<IUnitToken> = {}): IUnitToken {
  return {
    unitId: 'unit',
    name: 'Unit',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    designation: 'UNT',
    unitType: TokenUnitType.Mech,
    ...overrides,
  } as IUnitToken;
}

function isHexItem(
  item: IsometricSceneItem,
): item is Extract<IsometricSceneItem, { readonly kind: 'hex' }> {
  return item.kind === 'hex';
}

function isTokenItem(
  item: IsometricSceneItem,
): item is Extract<IsometricSceneItem, { readonly kind: 'token' }> {
  return item.kind === 'token';
}

describe('HexMapDisplay isometric projection helpers', () => {
  it('changes terrain depth ordering when the isometric camera rotates', () => {
    const terrainLookup = makeTerrainLookup([]);
    const renderedHexes = [
      { q: 1, r: 0 },
      { q: 0, r: 1 },
    ];

    const unrotated = buildIsometricSceneItems({
      isIsometricView: true,
      renderedHexes,
      tokens: [],
      terrainLookup,
      rotationStep: 0,
      foregroundUnitIds: new Set(),
    });
    const rotated = buildIsometricSceneItems({
      isIsometricView: true,
      renderedHexes,
      tokens: [],
      terrainLookup,
      rotationStep: 1,
      foregroundUnitIds: new Set(),
    });

    expect(
      unrotated.filter(isHexItem).map((item) => `${item.hex.q},${item.hex.r}`),
    ).toEqual(['1,0', '0,1']);
    expect(
      rotated.filter(isHexItem).map((item) => `${item.hex.q},${item.hex.r}`),
    ).toEqual(['0,1', '1,0']);
  });

  it('boosts highlighted units above tall terrain in the isometric scene', () => {
    const terrainLookup = makeTerrainLookup([
      makeTerrain(0, 1, 6, TerrainType.Building),
    ]);
    const ordinary = makeToken({
      unitId: 'ordinary',
      position: { q: -1, r: -1 },
    });
    const highlighted = makeToken({
      unitId: 'highlighted',
      position: { q: -1, r: -1 },
    });

    const items = buildIsometricSceneItems({
      isIsometricView: true,
      renderedHexes: [{ q: 0, r: 1 }],
      tokens: [ordinary, highlighted],
      terrainLookup,
      rotationStep: 0,
      foregroundUnitIds: new Set(['highlighted']),
    });
    const terrain = items.find(
      (item) => isHexItem(item) && item.hex.q === 0 && item.hex.r === 1,
    );
    const tokenItems = items.filter(isTokenItem);
    const ordinaryItem = tokenItems.find(
      (item) => item.token.unitId === 'ordinary',
    );
    const highlightedItem = tokenItems.find(
      (item) => item.token.unitId === 'highlighted',
    );

    expect(terrain).toBeDefined();
    expect(ordinaryItem).toBeDefined();
    expect(highlightedItem).toBeDefined();
    expect(ordinaryItem?.foregroundBoost).toBe(false);
    expect(highlightedItem?.foregroundBoost).toBe(true);
    expect(ordinaryItem?.depthKey).toBeLessThan(terrain?.depthKey ?? 0);
    expect(highlightedItem?.depthKey).toBeGreaterThan(terrain?.depthKey ?? 0);
  });

  it('reports camera-dependent tall-terrain occlusion for unit readability', () => {
    const terrainLookup = makeTerrainLookup([
      makeTerrain(1, 0, 4, TerrainType.Building),
    ]);
    const tokens = [
      makeToken({ unitId: 'occluded', position: { q: 0, r: 0 } }),
    ];

    const frontCameraInfo = deriveIsometricTerrainOcclusionInfo({
      tokens,
      terrainLookup,
      rotationStep: 0,
    });
    const rearCameraInfo = deriveIsometricTerrainOcclusionInfo({
      tokens,
      terrainLookup,
      rotationStep: 3,
    });

    expect(frontCameraInfo).toHaveLength(1);
    expect(frontCameraInfo[0]).toMatchObject({
      unitId: 'occluded',
      occluderHex: { q: 1, r: 0 },
      occluderElevation: 4,
      unitElevation: 0,
      rotationStep: 0,
      reason: 'Elevated terrain +4 at (1, 0) may hide unit at elevation +0',
    });
    expect(rearCameraInfo).toHaveLength(0);
  });
});
