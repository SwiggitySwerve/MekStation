import type { IHexTerrain, IUnitToken } from '@/types/gameplay';

import { Facing, GameSide, TerrainType, TokenUnitType } from '@/types/gameplay';

import {
  buildIsometricSceneItems,
  type IsometricSceneItem,
} from '../HexMapDisplay.isometric';
import {
  deriveIsometricTerrainOcclusionInfoByUnit,
  deriveIsometricTerrainOccluderInfo,
  deriveIsometricTerrainOcclusionInfo,
} from '../projection';

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
    const fullCycle = buildIsometricSceneItems({
      isIsometricView: true,
      renderedHexes,
      tokens: [],
      terrainLookup,
      rotationStep: 6,
      foregroundUnitIds: new Set(),
    });

    expect(
      unrotated.filter(isHexItem).map((item) => `${item.hex.q},${item.hex.r}`),
    ).toEqual(['1,0', '0,1']);
    expect(
      rotated.filter(isHexItem).map((item) => `${item.hex.q},${item.hex.r}`),
    ).toEqual(['0,1', '1,0']);
    expect(
      fullCycle.filter(isHexItem).map((item) => `${item.hex.q},${item.hex.r}`),
    ).toEqual(['1,0', '0,1']);
    expect(fullCycle.map((item) => item.depthKey)).toEqual(
      unrotated.map((item) => item.depthKey),
    );
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

  it('reports every tall terrain layer that may hide the same unit', () => {
    const terrainLookup = makeTerrainLookup([
      makeTerrain(1, 0, 4, TerrainType.Building),
      makeTerrain(0, 1, 3, TerrainType.Building),
    ]);
    const tokens = [
      makeToken({ unitId: 'occluded', position: { q: 0, r: 0 } }),
    ];

    const occlusionInfo = deriveIsometricTerrainOcclusionInfo({
      tokens,
      terrainLookup,
      rotationStep: 0,
    });
    const occluderInfo = deriveIsometricTerrainOccluderInfo(occlusionInfo);

    expect(occlusionInfo).toHaveLength(2);
    expect(
      deriveIsometricTerrainOcclusionInfoByUnit(occlusionInfo)
        .get('occluded')
        ?.map((info) => `${info.occluderHex.q},${info.occluderHex.r}`),
    ).toEqual(['1,0', '0,1']);
    expect(
      occlusionInfo.map(
        (info) => `${info.occluderHex.q},${info.occluderHex.r}`,
      ),
    ).toEqual(['1,0', '0,1']);
    expect(occluderInfo.get('1,0')).toMatchObject({
      occluderHex: { q: 1, r: 0 },
      occluderElevation: 4,
      occludedUnitIds: ['occluded'],
    });
    expect(occluderInfo.get('0,1')).toMatchObject({
      occluderHex: { q: 0, r: 1 },
      occluderElevation: 3,
      occludedUnitIds: ['occluded'],
    });
  });

  it('counts represented building levels as isometric occluder height', () => {
    const terrainLookup = makeTerrainLookup([
      {
        coordinate: { q: 1, r: 0 },
        elevation: 0,
        features: [{ type: TerrainType.Building, level: 3 }],
      },
    ]);
    const tokens = [
      makeToken({ unitId: 'occluded', position: { q: 0, r: 0 } }),
    ];

    const occlusionInfo = deriveIsometricTerrainOcclusionInfo({
      tokens,
      terrainLookup,
      rotationStep: 0,
    });
    const items = buildIsometricSceneItems({
      isIsometricView: true,
      renderedHexes: [
        { q: 1, r: 0 },
        { q: 0, r: 1 },
      ],
      tokens,
      terrainLookup,
      rotationStep: 0,
      foregroundUnitIds: new Set(),
    });
    const buildingHex = items.find(
      (item) => isHexItem(item) && item.hex.q === 1 && item.hex.r === 0,
    );
    const clearHex = items.find(
      (item) => isHexItem(item) && item.hex.q === 0 && item.hex.r === 1,
    );

    expect(occlusionInfo).toHaveLength(1);
    expect(occlusionInfo[0]).toMatchObject({
      unitId: 'occluded',
      occluderHex: { q: 1, r: 0 },
      occluderElevation: 3,
      unitElevation: 0,
      rotationStep: 0,
      reason: 'Elevated terrain +3 at (1, 0) may hide unit at elevation +0',
    });
    expect(buildingHex?.depthKey).toBe(1030);
    expect(clearHex?.depthKey).toBe(2000);
  });

  it('projects last-known contacts from the displayed ghost hex', () => {
    const terrainLookup = makeTerrainLookup([
      makeTerrain(1, 0, 4, TerrainType.Building),
    ]);
    const tokens = [
      makeToken({
        unitId: 'last-known',
        position: { q: -3, r: -3 },
        lastKnownPosition: { q: 0, r: 0 },
        fogStatus: 'lastKnown',
      }),
    ];

    const occlusionInfo = deriveIsometricTerrainOcclusionInfo({
      tokens,
      terrainLookup,
      rotationStep: 0,
    });
    const items = buildIsometricSceneItems({
      isIsometricView: true,
      renderedHexes: [{ q: 1, r: 0 }],
      tokens,
      terrainLookup,
      rotationStep: 0,
      foregroundUnitIds: new Set(),
    });
    const tokenItem = items
      .filter(isTokenItem)
      .find((item) => item.token.unitId === 'last-known');

    expect(occlusionInfo).toHaveLength(1);
    expect(occlusionInfo[0]).toMatchObject({
      unitId: 'last-known',
      occluderHex: { q: 1, r: 0 },
      occluderElevation: 4,
      unitElevation: 0,
      rotationStep: 0,
      reason: 'Elevated terrain +4 at (1, 0) may hide unit at elevation +0',
    });
    expect(tokenItem?.depthKey).toBe(5);
    expect(tokenItem?.foregroundBoost).toBe(false);
  });

  it('groups hidden units by the tall terrain hex that may occlude them', () => {
    const terrainLookup = makeTerrainLookup([
      makeTerrain(1, 0, 4, TerrainType.Building),
    ]);
    const tokens = [
      makeToken({ unitId: 'occluded-a', position: { q: 0, r: 0 } }),
      makeToken({ unitId: 'occluded-b', position: { q: 0, r: -1 } }),
    ];

    const occlusionInfo = deriveIsometricTerrainOcclusionInfo({
      tokens,
      terrainLookup,
      rotationStep: 0,
    });
    const occluderInfo = deriveIsometricTerrainOccluderInfo(occlusionInfo);

    expect(occluderInfo.size).toBe(1);
    expect(occluderInfo.get('1,0')).toMatchObject({
      occluderHex: { q: 1, r: 0 },
      occluderElevation: 4,
      rotationStep: 0,
      occludedUnitIds: ['occluded-a', 'occluded-b'],
      reasons: ['Elevated terrain +4 at (1, 0) may hide unit at elevation +0'],
    });
  });
});
